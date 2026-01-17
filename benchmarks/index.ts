import { runSqliteBenchmarks } from "./sqlite";
import { runMariadbBenchmarks } from "./mariadb";
import { runRedisBenchmarks } from "./redis";

async function runAllBenchmarks() {
    console.log("\n");
    console.log("╔═══════════════════════════════════════════════════════════════════════════════╗");
    console.log("║                     DATABASE BENCHMARK SUITE                                  ║");
    console.log("║                  Bun Native API vs Official Client Packages                   ║");
    console.log("╚═══════════════════════════════════════════════════════════════════════════════╝");
    console.log("\n");

    const startTime = performance.now();

    try {
        // SQLite Benchmarks
        console.log("\n" + "━".repeat(80));
        console.log("1/3 - SQLite Benchmark");
        console.log("━".repeat(80));
        await runSqliteBenchmarks();

        // MariaDB Benchmarks
        console.log("\n" + "━".repeat(80));
        console.log("2/3 - MariaDB Benchmark");
        console.log("━".repeat(80));
        await runMariadbBenchmarks();

        // Redis Benchmarks
        console.log("\n" + "━".repeat(80));
        console.log("3/3 - Redis Benchmark");
        console.log("━".repeat(80));
        await runRedisBenchmarks();

        const endTime = performance.now();
        const totalTime = ((endTime - startTime) / 1000).toFixed(2);

        console.log("\n");
        console.log("╔═══════════════════════════════════════════════════════════════════════════════╗");
        console.log("║                           BENCHMARK COMPLETED                                 ║");
        console.log("╚═══════════════════════════════════════════════════════════════════════════════╝");
        console.log(`\n⏱️  Total time: ${totalTime} seconds`);
        console.log(`📁 Results saved to results/ directory\n`);

    } catch (error) {
        console.error("\n❌ Benchmark error occurred:", error);
        console.error("\nTips:");
        console.error("- For MariaDB: Make sure the server is running and .env file is correct");
        console.error("- For Redis: Make sure Redis server is running on localhost:6379");
        console.error("- For SQLite: No external dependencies required\n");
        throw error;
    }
}

// Run
if (import.meta.main) {
    runAllBenchmarks()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            process.exit(1);
        });
}

