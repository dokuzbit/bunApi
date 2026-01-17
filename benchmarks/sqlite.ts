import { Database as BunDatabase } from "bun:sqlite";
import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";
import { benchmark, printResults, saveResults, type BenchmarkResult } from "./utils";

const ITERATIONS = 10_000;

let SQL: any = null;

async function initSqlJsModule() {
    if (!SQL) {
        SQL = await initSqlJs();
    }
    return SQL;
}

async function setupBunDatabase() {
    const db = new BunDatabase(":memory:");

    db.run(`
    CREATE TABLE IF NOT EXISTS benchmark_test (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      value INTEGER NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

    return db;
}

async function setupSqlJsDatabase() {
    const SQL = await initSqlJsModule();
    const db = new SQL.Database();

    db.run(`
    CREATE TABLE IF NOT EXISTS benchmark_test (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      value INTEGER NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

    return db;
}

// ============================================
// INSERT BENCHMARKS
// ============================================

async function benchmarkBunInsert() {
    const db = await setupBunDatabase();

    const result = await benchmark(
        "Bun SQLite INSERT",
        () => {
            const stmt = db.prepare("INSERT INTO benchmark_test (name, value) VALUES (?, ?)");
            stmt.run("test_name", Math.floor(Math.random() * 1000));
            stmt.finalize();
        },
        { name: "Bun SQLite INSERT", iterations: ITERATIONS }
    );

    db.close();
    return result;
}

async function benchmarkSqlJsInsert() {
    const db = await setupSqlJsDatabase();

    const result = await benchmark(
        "sql.js INSERT",
        () => {
            db.run(
                "INSERT INTO benchmark_test (name, value) VALUES (?, ?)",
                ["test_name", Math.floor(Math.random() * 1000)]
            );
        },
        { name: "sql.js INSERT", iterations: ITERATIONS }
    );

    db.close();
    return result;
}

// ============================================
// SELECT BENCHMARKS
// ============================================

async function benchmarkBunSelect() {
    const db = await setupBunDatabase();

    // Add test data
    const insert = db.prepare("INSERT INTO benchmark_test (name, value) VALUES (?, ?)");
    for (let i = 0; i < 1000; i++) {
        insert.run(`name_${i}`, i);
    }
    insert.finalize();

    const result = await benchmark(
        "Bun SQLite SELECT",
        () => {
            const stmt = db.prepare("SELECT * FROM benchmark_test WHERE value = ?");
            stmt.get(Math.floor(Math.random() * 1000));
            stmt.finalize();
        },
        { name: "Bun SQLite SELECT", iterations: ITERATIONS }
    );

    db.close();
    return result;
}

async function benchmarkSqlJsSelect() {
    const db = await setupSqlJsDatabase();

    // Add test data
    for (let i = 0; i < 1000; i++) {
        db.run(
            "INSERT INTO benchmark_test (name, value) VALUES (?, ?)",
            [`name_${i}`, i]
        );
    }

    const result = await benchmark(
        "sql.js SELECT",
        () => {
            db.exec(
                `SELECT * FROM benchmark_test WHERE value = ${Math.floor(Math.random() * 1000)}`
            );
        },
        { name: "sql.js SELECT", iterations: ITERATIONS }
    );

    db.close();
    return result;
}

// ============================================
// UPDATE BENCHMARKS
// ============================================

async function benchmarkBunUpdate() {
    const db = await setupBunDatabase();

    // Add test data
    const insert = db.prepare("INSERT INTO benchmark_test (name, value) VALUES (?, ?)");
    for (let i = 0; i < 1000; i++) {
        insert.run(`name_${i}`, i);
    }
    insert.finalize();

    const result = await benchmark(
        "Bun SQLite UPDATE",
        () => {
            const stmt = db.prepare("UPDATE benchmark_test SET value = ? WHERE id = ?");
            stmt.run(Math.floor(Math.random() * 1000), Math.floor(Math.random() * 1000) + 1);
            stmt.finalize();
        },
        { name: "Bun SQLite UPDATE", iterations: ITERATIONS }
    );

    db.close();
    return result;
}

async function benchmarkSqlJsUpdate() {
    const db = await setupSqlJsDatabase();

    // Add test data
    for (let i = 0; i < 1000; i++) {
        db.run(
            "INSERT INTO benchmark_test (name, value) VALUES (?, ?)",
            [`name_${i}`, i]
        );
    }

    const result = await benchmark(
        "sql.js UPDATE",
        () => {
            db.run(
                "UPDATE benchmark_test SET value = ? WHERE id = ?",
                [Math.floor(Math.random() * 1000), Math.floor(Math.random() * 1000) + 1]
            );
        },
        { name: "sql.js UPDATE", iterations: ITERATIONS }
    );

    db.close();
    return result;
}

// ============================================
// DELETE BENCHMARKS
// ============================================

async function benchmarkBunDelete() {
    const db = await setupBunDatabase();

    const result = await benchmark(
        "Bun SQLite DELETE",
        () => {
            // Insert and delete data on each iteration
            const insert = db.prepare("INSERT INTO benchmark_test (name, value) VALUES (?, ?)");
            insert.run("test", 123);
            const lastId = db.prepare("SELECT last_insert_rowid() as id").get() as { id: number };
            insert.finalize();

            const deleteStmt = db.prepare("DELETE FROM benchmark_test WHERE id = ?");
            deleteStmt.run(lastId.id);
            deleteStmt.finalize();
        },
        { name: "Bun SQLite DELETE", iterations: ITERATIONS, warmup: 10 }
    );

    db.close();
    return result;
}

async function benchmarkSqlJsDelete() {
    const db = await setupSqlJsDatabase();

    const result = await benchmark(
        "sql.js DELETE",
        () => {
            // Insert and delete data on each iteration
            db.run("INSERT INTO benchmark_test (name, value) VALUES (?, ?)", ["test", 123]);
            const result = db.exec("SELECT last_insert_rowid() as id");
            const lastId = result[0]?.values[0]?.[0] as number;
            db.run("DELETE FROM benchmark_test WHERE id = ?", [lastId]);
        },
        { name: "sql.js DELETE", iterations: ITERATIONS, warmup: 10 }
    );

    db.close();
    return result;
}

// ============================================
// MAIN BENCHMARK RUNNER
// ============================================

export async function runSqliteBenchmarks() {
    console.log("\n🚀 Starting SQLite Benchmark...\n");

    const results: BenchmarkResult[] = [];

    // INSERT Benchmarks
    console.log("📊 Running INSERT tests...");
    const bunInsert = await benchmarkBunInsert();
    results.push({ operation: "INSERT", library: "Bun SQLite", ...bunInsert });

    const sqlJsInsert = await benchmarkSqlJsInsert();
    results.push({ operation: "INSERT", library: "sql.js", ...sqlJsInsert });

    // SELECT Benchmarks
    console.log("📊 Running SELECT tests...");
    const bunSelect = await benchmarkBunSelect();
    results.push({ operation: "SELECT", library: "Bun SQLite", ...bunSelect });

    const sqlJsSelect = await benchmarkSqlJsSelect();
    results.push({ operation: "SELECT", library: "sql.js", ...sqlJsSelect });

    // UPDATE Benchmarks
    console.log("📊 Running UPDATE tests...");
    const bunUpdate = await benchmarkBunUpdate();
    results.push({ operation: "UPDATE", library: "Bun SQLite", ...bunUpdate });

    const sqlJsUpdate = await benchmarkSqlJsUpdate();
    results.push({ operation: "UPDATE", library: "sql.js", ...sqlJsUpdate });

    // DELETE Benchmarks
    console.log("📊 Running DELETE tests...");
    const bunDelete = await benchmarkBunDelete();
    results.push({ operation: "DELETE", library: "Bun SQLite", ...bunDelete });

    const sqlJsDelete = await benchmarkSqlJsDelete();
    results.push({ operation: "DELETE", library: "sql.js", ...sqlJsDelete });

    // Print and save results
    printResults(results, "SQLite Benchmark Results (Bun SQLite vs sql.js)");
    await saveResults(results, "sqlite");

    return results;
}

// If run directly
if (import.meta.main) {
    runSqliteBenchmarks()
        .then(() => {
            console.log("\n✅ SQLite benchmark completed!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Error:", error);
            process.exit(1);
        });
}
