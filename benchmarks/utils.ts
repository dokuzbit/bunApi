import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

export interface BenchmarkResult {
    operation: string;
    library: string;
    iterations: number;
    duration: number;
    opsPerSecond: number;
    avgTimePerOp: number;
}

export interface BenchmarkOptions {
    name: string;
    iterations: number;
    warmup?: number;
}

/**
 * Runs benchmark function and returns results
 */
export async function benchmark(
    name: string,
    fn: () => Promise<void> | void,
    options: BenchmarkOptions
): Promise<Omit<BenchmarkResult, "operation" | "library">> {
    const { iterations, warmup = 100 } = options;

    // Warmup
    for (let i = 0; i < warmup; i++) {
        await fn();
    }

    // Actual benchmark
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
        await fn();
    }

    const end = performance.now();
    const duration = end - start;
    const opsPerSecond = (iterations / duration) * 1000;
    const avgTimePerOp = duration / iterations;

    return {
        iterations,
        duration,
        opsPerSecond,
        avgTimePerOp,
    };
}

/**
 * Prints results to console as table
 */
export function printResults(results: BenchmarkResult[], title: string) {
    console.log(`\n${"=".repeat(80)}`);
    console.log(`${title}`);
    console.log("=".repeat(80));

    const formatted = results.map((r) => ({
        Operation: r.operation,
        Library: r.library,
        Iterations: r.iterations.toLocaleString(),
        "Duration (ms)": r.duration.toFixed(2),
        "Ops/sec": r.opsPerSecond.toFixed(2),
        "Avg (ms)": r.avgTimePerOp.toFixed(4),
    }));

    console.table(formatted);

    // Performance comparison summary
    console.log("\nPerformance Comparison (Ops/sec):");
    const grouped = groupBy(results, (r) => r.operation);
    const libraries = [...new Set(results.map(r => r.library))].sort((a, b) => {
        if (a === "memcached") return 1;
        if (b === "memcached") return -1;
        return a.localeCompare(b);
    });

    // Prepare table data and calculate column widths
    const headers = ["Operation", ...libraries];
    const widths: Record<string, number> = {};
    headers.forEach(h => widths[h] = h.length);

    const rows = Object.entries(grouped).map(([operation, ops]) => {
        const rowData: any = { Operation: { text: operation, isFastest: false } };
        
        const sorted = [...ops].sort((a, b) => b.opsPerSecond - a.opsPerSecond);
        const fastestLibrary = sorted[0]?.library;

        libraries.forEach(lib => {
            const result = ops.find(o => o.library === lib);
            let text = result ? result.opsPerSecond.toFixed(0) : "-";
            
            const isFastest = result?.library === fastestLibrary;
            if (isFastest && sorted.length > 1) {
                const slowest = sorted[sorted.length - 1];
                const multiplier = result.opsPerSecond / slowest.opsPerSecond;
                text = `(${multiplier.toFixed(1)}x) ${text}`;
            }

            rowData[lib] = { 
                text, 
                isFastest 
            };
            
            if (text.length > (widths[lib] || 0)) {
                widths[lib] = text.length;
            }
        });
        
        if (operation.length > widths["Operation"]) {
            widths["Operation"] = operation.length;
        }
        
        return rowData;
    });

    // Add padding to widths
    Object.keys(widths).forEach(k => widths[k] += 3);

    // Print Table
    let output = "";
    
    // Header
    output += headers.map((h, i) => {
        return i === 0 ? h.padEnd(widths[h]) : h.padStart(widths[h]);
    }).join("") + "\n";
    
    // Separator
    output += headers.map(h => "-".repeat(widths[h] - 1).padEnd(widths[h])).join("") + "\n";

    // Data Rows
    rows.forEach(row => {
        output += headers.map((h, i) => {
            const cell = row[h];
            if (i === 0) {
                // Operation column: Left Aligned
                return cell.text.padEnd(widths[h]);
            } else {
                // Data columns: Right Aligned
                const padding = " ".repeat(widths[h] - cell.text.length);
                const content = cell.isFastest ? `\x1b[1m${cell.text}\x1b[0m` : cell.text;
                return padding + content;
            }
        }).join("") + "\n";
    });

    console.log(output);
}

/**
 * Saves results to JSON file
 */
export async function saveResults(
    results: BenchmarkResult[],
    filename: string
) {
    const resultsDir = path.join(process.cwd(), "results");

    if (!existsSync(resultsDir)) {
        await mkdir(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filepath = path.join(resultsDir, `${filename}-${timestamp}.json`);

    const data = {
        timestamp: new Date().toISOString(),
        results,
        summary: generateSummary(results),
    };

    await writeFile(filepath, JSON.stringify(data, null, 2));
    console.log(`\n✓ Results saved: ${filepath}`);
}

/**
 * Generates summary statistics
 */
function generateSummary(results: BenchmarkResult[]) {
    const grouped = groupBy(results, (r) => r.operation);
    const summary: Record<string, any> = {};

    for (const [operation, ops] of Object.entries(grouped)) {
        const sorted = ops.sort((a, b) => b.opsPerSecond - a.opsPerSecond);
        const fastest = sorted[0];
        const slowest = sorted[sorted.length - 1];
        const second = sorted[1];

        if (fastest && slowest) {
            summary[operation] = {
                fastest: fastest.library,
                fastestOps: fastest.opsPerSecond,
                slowest: slowest.library,
                slowestOps: slowest.opsPerSecond,
                speedupMultiplier:
                    sorted.length > 1 && second
                        ? fastest.opsPerSecond / second.opsPerSecond
                        : 1,
            };
        }
    }

    return summary;
}

/**
 * Helper: Groups array by key function
 */
function groupBy<T>(
    array: T[],
    keyFn: (item: T) => string
): Record<string, T[]> {
    return array.reduce((result, item) => {
        const key = keyFn(item);
        if (!result[key]) {
            result[key] = [];
        }
        result[key].push(item);
        return result;
    }, {} as Record<string, T[]>);
}

/**
 * Helper: Wait for connection
 */
export async function waitForConnection(
    testFn: () => Promise<boolean>,
    maxRetries = 5,
    delay = 1000
): Promise<boolean> {
    for (let i = 0; i < maxRetries; i++) {
        try {
            if (await testFn()) {
                return true;
            }
        } catch (error) {
            // Continue to retry
        }
        await new Promise((resolve) => setTimeout(resolve, delay));
    }
    return false;
}

