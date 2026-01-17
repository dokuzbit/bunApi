import { Database as BunDatabase } from "bun:sqlite";
import { redis } from "bun";
import { createClient } from "redis";
import { existsSync, unlinkSync } from "fs";
import { benchmark, printResults, saveResults, type BenchmarkResult } from "./utils";

const ITERATIONS = 100_000;
const BUN_DB_FILE = "bench_bun_compare.db";
const REDIS_URL = "redis://localhost:6379";

// ============================================ 
// SETUP
// ============================================ 

async function setupBunSqlite() {
    if (existsSync(BUN_DB_FILE)) {
        try {
            unlinkSync(BUN_DB_FILE);
            if (existsSync(`${BUN_DB_FILE}-wal`)) unlinkSync(`${BUN_DB_FILE}-wal`);
            if (existsSync(`${BUN_DB_FILE}-shm`)) unlinkSync(`${BUN_DB_FILE}-shm`);
        } catch (e) {}
    }
    
    const db = new BunDatabase(BUN_DB_FILE);
    db.exec("PRAGMA journal_mode = WAL;");
    db.exec("PRAGMA synchronous = NORMAL;");

    db.run(`
    CREATE TABLE IF NOT EXISTS benchmark_test (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

    return db;
}

async function setupBunRedis() {
    // Bun uses global redis instance
    return redis;
}

async function setupRedisClient() {
    const client = createClient({ url: REDIS_URL });
    await client.connect();
    // Clean data for testing
    await client.flushDb();
    return client;
}

// ============================================ 
// WRITE BENCHMARKS (INSERT vs SET)
// ============================================ 

async function benchmarkSqliteInsert() {
    const db = await setupBunSqlite();

    const result = await benchmark(
        "Bun SQLite INSERT",
        () => {
            const stmt = db.prepare("INSERT INTO benchmark_test (key, value) VALUES (?, ?)");
            const key = `key_${Math.random()}`;
            const value = `value_${Math.random()}`;
            stmt.run(key, value);
            stmt.finalize();
        },
        { name: "Bun SQLite INSERT", iterations: ITERATIONS }
    );

    db.close();
    return result;
}

async function benchmarkRedisSet() {
    await setupBunRedis();

    const result = await benchmark(
        "Bun Redis SET",
        async () => {
            const key = `key_${Math.random()}`;
            const value = `value_${Math.random()}`;
            await redis.set(key, value);
        },
        { name: "Bun Redis SET", iterations: ITERATIONS }
    );

    return result;
}

async function benchmarkRedisClientSet() {
    const client = await setupRedisClient();

    const result = await benchmark(
        "redis SET",
        async () => {
            const key = `key_${Math.random()}`;
            const value = `value_${Math.random()}`;
            await client.set(key, value);
        },
        { name: "redis SET", iterations: ITERATIONS }
    );

    await client.quit();
    return result;
}

// ============================================ 
// READ BENCHMARKS (SELECT vs GET)
// ============================================ 

async function benchmarkSqliteSelect() {
    const db = await setupBunSqlite();

    // Add test data
    const insert = db.prepare("INSERT INTO benchmark_test (key, value) VALUES (?, ?)");
    for (let i = 0; i < 1000; i++) {
        insert.run(`key_${i}`, `value_${i}`);
    }
    insert.finalize();

    const result = await benchmark(
        "Bun SQLite SELECT",
        () => {
            const stmt = db.prepare("SELECT value FROM benchmark_test WHERE key = ?");
            stmt.get(`key_${Math.floor(Math.random() * 1000)}`);
            stmt.finalize();
        },
        { name: "Bun SQLite SELECT", iterations: ITERATIONS }
    );

    db.close();
    return result;
}

async function benchmarkRedisGet() {
    await setupBunRedis();

    // Add test data
    for (let i = 0; i < 1000; i++) {
        await redis.set(`key_${i}`, `value_${i}`);
    }

    const result = await benchmark(
        "Bun Redis GET",
        async () => {
            await redis.get(`key_${Math.floor(Math.random() * 1000)}`);
        },
        { name: "Bun Redis GET", iterations: ITERATIONS }
    );

    return result;
}

async function benchmarkRedisClientGet() {
    const client = await setupRedisClient();

    // Add test data
    for (let i = 0; i < 1000; i++) {
        await client.set(`key_${i}`, `value_${i}`);
    }

    const result = await benchmark(
        "redis GET",
        async () => {
            await client.get(`key_${Math.floor(Math.random() * 1000)}`);
        },
        { name: "redis GET", iterations: ITERATIONS }
    );

    await client.quit();
    return result;
}

// ============================================ 
// MAIN BENCHMARK RUNNER
// ============================================ 

export async function runCompareBenchmarks() {
    console.log("\n🚀 Starting SQLite vs Redis Comparison...\n");

    const results: BenchmarkResult[] = [];

    // WRITE Benchmarks
    console.log("📊 Running WRITE tests (INSERT vs SET)...");
    const sqliteInsert = await benchmarkSqliteInsert();
    results.push({ operation: "WRITE", library: "Bun SQLite", ...sqliteInsert });

    const bunRedisSet = await benchmarkRedisSet();
    results.push({ operation: "WRITE", library: "Bun Redis", ...bunRedisSet });

    const redisSet = await benchmarkRedisClientSet();
    results.push({ operation: "WRITE", library: "redis", ...redisSet });


    // READ Benchmarks
    console.log("📊 Running READ tests (SELECT vs GET)...");
    const sqliteSelect = await benchmarkSqliteSelect();
    results.push({ operation: "READ", library: "Bun SQLite", ...sqliteSelect });

    const bunRedisGet = await benchmarkRedisGet();
    results.push({ operation: "READ", library: "Bun Redis", ...bunRedisGet });

    const redisGet = await benchmarkRedisClientGet();
    results.push({ operation: "READ", library: "redis", ...redisGet });

    // Print and save results
    printResults(results, "SQLite (File) vs Redis Benchmark Results");
    await saveResults(results, "compare_sqlite_redis");

    return results;
}

// If run directly
if (import.meta.main) {
    runCompareBenchmarks()
        .then(() => {
            console.log("\n✅ Comparison benchmark completed!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Error:", error);
            process.exit(1);
        });
}