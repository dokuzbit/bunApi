import mariadb from "mariadb";
import { SQL } from "bun";
import {
    benchmark,
    printResults,
    saveResults,
    type BenchmarkResult,
} from "./utils";

const ITERATIONS = 10_000;

// Environment variables
const MARIADB_CONFIG = {
    host: process.env.MARIADB_HOST || "localhost",
    port: parseInt(process.env.MARIADB_PORT || "3306"),
    user: process.env.MARIADB_USER || "root",
    password: process.env.MARIADB_PASSWORD || "",
    database: process.env.MARIADB_DATABASE || "benchmark_db",
};


async function ensureDatabase() {
    // First create database (connect without database)
    const pool = mariadb.createPool(MARIADB_CONFIG);

    try {
        const conn = await pool.getConnection();
        await conn.query(
            `CREATE DATABASE IF NOT EXISTS ${MARIADB_CONFIG.database}`,
        );
        conn.release();
    } finally {
        await pool.end();
    }
}

async function setupDatabase() {
    // Ensure database exists first
    await ensureDatabase();

    // Connect with MariaDB package
    const pool = mariadb.createPool(MARIADB_CONFIG);

    const conn = await pool.getConnection();

    // Create test table
    await conn.query(`
    CREATE TABLE IF NOT EXISTS benchmark_test (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      value INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

    // Clear table
    await conn.query("TRUNCATE TABLE benchmark_test");

    conn.release();

    return pool;
}

async function setupBunDatabase() {
    // Ensure database exists first
    await ensureDatabase();

    const sql = new SQL({
        adapter: "mysql",
        database: MARIADB_CONFIG.database,
        username: MARIADB_CONFIG.user,
        password: MARIADB_CONFIG.password,
    });

    // Create test table
    await sql`
    CREATE TABLE IF NOT EXISTS benchmark_test (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      value INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;

    // Clear table
    await sql`TRUNCATE TABLE benchmark_test`;

    return sql;
}

async function benchmarkBunInsert() {
    const sql = await setupBunDatabase();

    const result = await benchmark(
        "Bun SQL INSERT",
        async () => {
            await sql`INSERT INTO benchmark_test (name, value) VALUES (${"test_name"}, ${Math.floor(Math.random() * 1000)})`;
        },
        { name: "Bun SQL INSERT", iterations: ITERATIONS },
    );

    sql.close();
    return result;
}

async function benchmarkMariadbInsert() {
    const pool = await setupDatabase();

    const result = await benchmark(
        "mariadb INSERT",
        async () => {
            const conn = await pool.getConnection();
            await conn.query(
                "INSERT INTO benchmark_test (name, value) VALUES (?, ?)",
                ["test_name", Math.floor(Math.random() * 1000)],
            );
            conn.release();
        },
        { name: "mariadb INSERT", iterations: ITERATIONS },
    );

    await pool.end();
    return result;
}

async function benchmarkBunSelect() {
    const sql = await setupBunDatabase();

    // Add test data
    for (let i = 0; i < 1000; i++) {
        await sql`INSERT INTO benchmark_test (name, value) VALUES (${`name_${i}`}, ${i})`;
    }

    const result = await benchmark(
        "Bun SQL SELECT",
        async () => {
            await sql`SELECT * FROM benchmark_test WHERE value = ${Math.floor(Math.random() * 1000)} LIMIT 1`;
        },
        { name: "Bun SQL SELECT", iterations: ITERATIONS },
    );

    sql.close();
    return result;
}

async function benchmarkMariadbSelect() {
    const pool = await setupDatabase();
    const conn = await pool.getConnection();

    // Add test data
    for (let i = 0; i < 1000; i++) {
        await conn.query(
            "INSERT INTO benchmark_test (name, value) VALUES (?, ?)",
            [`name_${i}`, i],
        );
    }
    conn.release();

    const result = await benchmark(
        "mariadb SELECT",
        async () => {
            const conn = await pool.getConnection();
            await conn.query(
                "SELECT * FROM benchmark_test WHERE value = ? LIMIT 1",
                [Math.floor(Math.random() * 1000)],
            );
            conn.release();
        },
        { name: "mariadb SELECT", iterations: ITERATIONS },
    );

    await pool.end();
    return result;
}

async function benchmarkBunUpdate() {
    const sql = await setupBunDatabase();

    // Add test data
    for (let i = 0; i < 1000; i++) {
        await sql`INSERT INTO benchmark_test (name, value) VALUES (${`name_${i}`}, ${i})`;
    }

    const result = await benchmark(
        "Bun SQL UPDATE",
        async () => {
            await sql`UPDATE benchmark_test SET value = ${Math.floor(Math.random() * 1000)} WHERE id = ${Math.floor(Math.random() * 1000) + 1}`;
        },
        { name: "Bun SQL UPDATE", iterations: ITERATIONS },
    );

    sql.close();
    return result;
}

async function benchmarkMariadbUpdate() {
    const pool = await setupDatabase();
    const conn = await pool.getConnection();

    // Add test data
    for (let i = 0; i < 1000; i++) {
        await conn.query(
            "INSERT INTO benchmark_test (name, value) VALUES (?, ?)",
            [`name_${i}`, i],
        );
    }
    conn.release();

    const result = await benchmark(
        "mariadb UPDATE",
        async () => {
            const conn = await pool.getConnection();
            await conn.query(
                "UPDATE benchmark_test SET value = ? WHERE id = ?",
                [
                    Math.floor(Math.random() * 1000),
                    Math.floor(Math.random() * 1000) + 1,
                ],
            );
            conn.release();
        },
        { name: "mariadb UPDATE", iterations: ITERATIONS },
    );

    await pool.end();
    return result;
}

async function benchmarkBunDelete() {
    const sql = await setupBunDatabase();

    // Add test data
    for (let i = 0; i < 1000; i++) {
        await sql`INSERT INTO benchmark_test (name, value) VALUES (${`name_${i}`}, ${i})`;
    }

    const result = await benchmark(
        "Bun SQL DELETE",
        async () => {
            await sql`DELETE FROM benchmark_test WHERE id = ${Math.floor(Math.random() * 1000) + 1}`;
        },
        { name: "Bun SQL DELETE", iterations: ITERATIONS },
    );

    sql.close();
    return result;
}

async function benchmarkMariadbDelete() {
    const pool = await setupDatabase();
    const conn = await pool.getConnection();

    // Add test data
    for (let i = 0; i < 1000; i++) {
        await conn.query(
            "INSERT INTO benchmark_test (name, value) VALUES (?, ?)",
            [`name_${i}`, i],
        );
    }
    conn.release();

    const result = await benchmark(
        "mariadb DELETE",
        async () => {
            const conn = await pool.getConnection();
            await conn.query("DELETE FROM benchmark_test WHERE id = ?", [
                Math.floor(Math.random() * 1000) + 1,
            ]);
            conn.release();
        },
        { name: "mariadb DELETE", iterations: ITERATIONS },
    );

    await pool.end();
    return result;
}

export async function runMariadbBenchmarks() {
    console.log("\n🚀 Starting MariaDB Benchmark...\n");

    const results: BenchmarkResult[] = [];

    try {
        // INSERT Benchmarks
        console.log("📊 Running INSERT tests...");
        const bunInsert = await benchmarkBunInsert();
        results.push({ operation: "INSERT", library: "Bun SQL", ...bunInsert });

        const mariadbInsert = await benchmarkMariadbInsert();
        results.push({
            operation: "INSERT",
            library: "mariadb",
            ...mariadbInsert,
        });

        // SELECT Benchmarks
        console.log("📊 Running SELECT tests...");
        const bunSelect = await benchmarkBunSelect();
        results.push({ operation: "SELECT", library: "Bun SQL", ...bunSelect });

        const mariadbSelect = await benchmarkMariadbSelect();
        results.push({
            operation: "SELECT",
            library: "mariadb",
            ...mariadbSelect,
        });

        // UPDATE Benchmarks
        console.log("📊 Running UPDATE tests...");
        const bunUpdate = await benchmarkBunUpdate();
        results.push({ operation: "UPDATE", library: "Bun SQL", ...bunUpdate });

        const mariadbUpdate = await benchmarkMariadbUpdate();
        results.push({
            operation: "UPDATE",
            library: "mariadb",
            ...mariadbUpdate,
        });

        // DELETE Benchmarks
        console.log("📊 Running DELETE tests...");
        const bunDelete = await benchmarkBunDelete();
        results.push({ operation: "DELETE", library: "Bun SQL", ...bunDelete });

        const mariadbDelete = await benchmarkMariadbDelete();
        results.push({
            operation: "DELETE",
            library: "mariadb",
            ...mariadbDelete,
        });

        // Print and save results
        printResults(results, "MariaDB Benchmark Results");
        await saveResults(results, "mariadb");

        return results;
    } catch (error) {
        console.error("❌ MariaDB benchmark error:", error);
        console.error("\nPlease check the following:");
        console.error("1. Make sure MariaDB server is running");
        console.error("2. Check connection details in .env file");
        console.error("3. Make sure the specified database exists");
        throw error;
    }
}

// If run directly
if (import.meta.main) {
    runMariadbBenchmarks()
        .then(() => {
            console.log("\n✅ MariaDB benchmark completed!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Error:", error);
            process.exit(1);
        });
}
