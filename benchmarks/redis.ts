import { createClient } from "redis";
import { redis } from "bun";
import Memcached from "memcached";
import { benchmark, printResults, saveResults, type BenchmarkResult } from "./utils";

const ITERATIONS = 10_000;
const REDIS_URL = "redis://localhost:6379";
const MEMCACHED_LOCATION = "localhost:11211";

async function setupBunRedis() {
    // Bun uses global redis instance, no setup needed
    // Clean data for testing - each library cleans at benchmark start
    return redis;
}

async function setupRedisClient() {
    const client = createClient({ url: REDIS_URL });
    await client.connect();
    // Clean data for testing
    await client.flushDb();
    return client;
}

function setupMemcachedClient(): Promise<Memcached> {
    return new Promise((resolve, reject) => {
        const client = new Memcached(MEMCACHED_LOCATION);
        // Clean data for testing
        client.flush((err) => {
            if (err) reject(err);
            else resolve(client);
        });
    });
}

// ============================================ 
// CACHE OPERATIONS
// ============================================ 

async function benchmarkBunSet() {
    await setupBunRedis();

    const result = await benchmark(
        "Bun Redis SET",
        async () => {
            await redis.set(`key_${Math.random()}`, `value_${Math.random()}`);
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
            await client.set(`key_${Math.random()}`, `value_${Math.random()}`);
        },
        { name: "redis SET", iterations: ITERATIONS }
    );

    await client.quit();
    return result;
}

async function benchmarkMemcachedSet() {
    const client = await setupMemcachedClient();

    const result = await benchmark(
        "memcached SET",
        () => {
            return new Promise<void>((resolve, reject) => {
                client.set(`key_${Math.random()}`, `value_${Math.random()}`, 1000, (err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        },
        { name: "memcached SET", iterations: ITERATIONS }
    );

    client.end();
    return result;
}

async function benchmarkBunGet() {
    await setupBunRedis();

    // Add test data
    for (let i = 0; i < 1000; i++) {
        await redis.set(`test_key_${i}`, `test_value_${i}`);
    }

    const result = await benchmark(
        "Bun Redis GET",
        async () => {
            await redis.get(`test_key_${Math.floor(Math.random() * 1000)}`);
        },
        { name: "Bun Redis GET", iterations: ITERATIONS }
    );

    return result;
}

async function benchmarkRedisClientGet() {
    const client = await setupRedisClient();

    // Add test data
    for (let i = 0; i < 1000; i++) {
        await client.set(`test_key_${i}`, `test_value_${i}`);
    }

    const result = await benchmark(
        "redis GET",
        async () => {
            await client.get(`test_key_${Math.floor(Math.random() * 1000)}`);
        },
        { name: "redis GET", iterations: ITERATIONS }
    );

    await client.quit();
    return result;
}

async function benchmarkMemcachedGet() {
    const client = await setupMemcachedClient();

    // Add test data
    const promises: Promise<void>[] = [];
    for (let i = 0; i < 1000; i++) {
        promises.push(new Promise((resolve, reject) => {
            client.set(`test_key_${i}`, `test_value_${i}`, 1000, (err) => {
                if (err) reject(err);
                else resolve();
            });
        }));
    }
    await Promise.all(promises);

    const result = await benchmark(
        "memcached GET",
        () => {
            return new Promise<void>((resolve, reject) => {
                client.get(`test_key_${Math.floor(Math.random() * 1000)}`, (err, data) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
        },
        { name: "memcached GET", iterations: ITERATIONS }
    );

    client.end();
    return result;
}

async function benchmarkBunDel() {
    await setupBunRedis();

    const result = await benchmark(
        "Bun Redis DEL",
        async () => {
            const key = `temp_key_${Math.random()}`;
            await redis.set(key, "temp_value");
            await redis.del(key);
        },
        { name: "Bun Redis DEL", iterations: ITERATIONS, warmup: 10 }
    );

    return result;
}

async function benchmarkRedisClientDel() {
    const client = await setupRedisClient();

    const result = await benchmark(
        "redis DEL",
        async () => {
            const key = `temp_key_${Math.random()}`;
            await client.set(key, "temp_value");
            await client.del(key);
        },
        { name: "redis DEL", iterations: ITERATIONS, warmup: 10 }
    );

    await client.quit();
    return result;
}

async function benchmarkMemcachedDel() {
    const client = await setupMemcachedClient();

    const result = await benchmark(
        "memcached DEL",
        () => {
            return new Promise<void>((resolve, reject) => {
                const key = `temp_key_${Math.random()}`;
                client.set(key, "temp_value", 1000, (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    client.del(key, (err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
            });
        },
        { name: "memcached DEL", iterations: ITERATIONS, warmup: 10 }
    );

    client.end();
    return result;
}

// ============================================ 
// PUB/SUB OPERATIONS
// ============================================ 

async function benchmarkBunPublish() {
    await setupBunRedis();

    const result = await benchmark(
        "Bun Redis PUBLISH",
        async () => {
            await redis.publish("test_channel", `message_${Math.random()}`);
        },
        { name: "Bun Redis PUBLISH", iterations: ITERATIONS }
    );

    return result;
}

async function benchmarkRedisClientPublish() {
    const client = await setupRedisClient();

    const result = await benchmark(
        "redis PUBLISH",
        async () => {
            await client.publish("test_channel", `message_${Math.random()}`);
        },
        { name: "redis PUBLISH", iterations: ITERATIONS }
    );

    await client.quit();
    return result;
}

export async function runRedisBenchmarks() {
    console.log("\n🚀 Starting Redis Benchmark...\n");

    const results: BenchmarkResult[] = [];

    try {
        // CACHE OPERATIONS
        console.log("📊 Cache: Running SET tests...");
        const bunSet = await benchmarkBunSet();
        results.push({ operation: "Cache SET", library: "Bun Redis", ...bunSet });

        const redisSet = await benchmarkRedisClientSet();
        results.push({ operation: "Cache SET", library: "redis", ...redisSet });

        const memcachedSet = await benchmarkMemcachedSet();
        results.push({ operation: "Cache SET", library: "memcached", ...memcachedSet });

        console.log("📊 Cache: Running GET tests...");
        const bunGet = await benchmarkBunGet();
        results.push({ operation: "Cache GET", library: "Bun Redis", ...bunGet });

        const redisGet = await benchmarkRedisClientGet();
        results.push({ operation: "Cache GET", library: "redis", ...redisGet });

        const memcachedGet = await benchmarkMemcachedGet();
        results.push({ operation: "Cache GET", library: "memcached", ...memcachedGet });

        console.log("📊 Cache: Running DEL tests...");
        const bunDel = await benchmarkBunDel();
        results.push({ operation: "Cache DEL", library: "Bun Redis", ...bunDel });

        const redisDel = await benchmarkRedisClientDel();
        results.push({ operation: "Cache DEL", library: "redis", ...redisDel });

        const memcachedDel = await benchmarkMemcachedDel();
        results.push({ operation: "Cache DEL", library: "memcached", ...memcachedDel });

        // PUB/SUB OPERATIONS
        console.log("📊 Pub/Sub: Running PUBLISH tests...");
        const bunPublish = await benchmarkBunPublish();
        results.push({ operation: "Pub/Sub PUBLISH", library: "Bun Redis", ...bunPublish });

        const redisPublish = await benchmarkRedisClientPublish();
        results.push({ operation: "Pub/Sub PUBLISH", library: "redis", ...redisPublish });

        // Print and save results
        printResults(results, "Redis Benchmark Results");
        await saveResults(results, "redis");

        return results;
    } catch (error) {
        console.error("❌ Redis benchmark error:", error);
        console.error("\nPlease make sure Redis server is running on localhost:6379");
        console.error("Please make sure Memcached server is running on localhost:11211");
        console.error("To start Redis: redis-server");
        console.error("To start Memcached: memcached");
        throw error;
    }
}

// If run directly
if (import.meta.main) {
    runRedisBenchmarks()
        .then(() => {
            console.log("\n✅ Redis benchmark completed!");
            process.exit(0);
        })
        .catch((error) => {
            console.error("❌ Error:", error);
            process.exit(1);
        });
}
