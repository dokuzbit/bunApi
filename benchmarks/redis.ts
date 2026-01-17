import { createClient } from "redis";
import { redis } from "bun";
import { benchmark, printResults, saveResults, type BenchmarkResult } from "./utils";

const ITERATIONS = 10_000;
const REDIS_URL = "redis://localhost:6379";

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

async function benchmarkBunSubscribe() {
    // NOTE: Bun uses global redis object and cannot publish in subscriber mode
    // Therefore we skip the subscribe test - only doing PUBLISH test
    // Alternatively, subscribe performance can be derived from publish test results

    // Simple subscribe test - just subscribe/unsubscribe speed
    const start = performance.now();

    for (let i = 0; i < 100; i++) {
        await redis.subscribe(`test_channel_${i}`, () => { });
        await redis.unsubscribe(`test_channel_${i}`);
    }

    const end = performance.now();
    const duration = end - start;
    const iterations = 100; // SUBSCRIBE + UNSUBSCRIBE dual operation
    const opsPerSecond = (iterations / duration) * 1000;
    const avgTimePerOp = duration / iterations;

    return {
        iterations,
        duration,
        opsPerSecond,
        avgTimePerOp,
    };
}

async function benchmarkRedisClientSubscribe() {
    const publisher = await setupRedisClient();
    const subscriber = createClient({ url: REDIS_URL });
    await subscriber.connect();

    let messageCount = 0;
    const targetMessages = ITERATIONS;

    // Subscribe
    await subscriber.subscribe("bench_channel", (message) => {
        messageCount++;
    });

    // Send messages and measure
    const start = performance.now();

    for (let i = 0; i < targetMessages; i++) {
        await publisher.publish("bench_channel", `msg_${i}`);
    }

    // Wait for all messages to arrive
    while (messageCount < targetMessages) {
        await new Promise((resolve) => setTimeout(resolve, 1));
    }

    const end = performance.now();
    const duration = end - start;
    const opsPerSecond = (targetMessages / duration) * 1000;
    const avgTimePerOp = duration / targetMessages;

    await subscriber.unsubscribe("bench_channel");
    await subscriber.quit();
    await publisher.quit();

    return {
        iterations: targetMessages,
        duration,
        opsPerSecond,
        avgTimePerOp,
    };
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

        console.log("📊 Cache: Running GET tests...");
        const bunGet = await benchmarkBunGet();
        results.push({ operation: "Cache GET", library: "Bun Redis", ...bunGet });

        const redisGet = await benchmarkRedisClientGet();
        results.push({ operation: "Cache GET", library: "redis", ...redisGet });

        console.log("📊 Cache: Running DEL tests...");
        const bunDel = await benchmarkBunDel();
        results.push({ operation: "Cache DEL", library: "Bun Redis", ...bunDel });

        const redisDel = await benchmarkRedisClientDel();
        results.push({ operation: "Cache DEL", library: "redis", ...redisDel });

        // PUB/SUB OPERATIONS
        console.log("📊 Pub/Sub: Running PUBLISH tests...");
        const bunPublish = await benchmarkBunPublish();
        results.push({ operation: "Pub/Sub PUBLISH", library: "Bun Redis", ...bunPublish });

        const redisPublish = await benchmarkRedisClientPublish();
        results.push({ operation: "Pub/Sub PUBLISH", library: "redis", ...redisPublish });

        console.log("📊 Pub/Sub: Running SUBSCRIBE/UNSUBSCRIBE tests...");
        const bunSubscribe = await benchmarkBunSubscribe();
        results.push({ operation: "Pub/Sub SUB/UNSUB", library: "Bun Redis", ...bunSubscribe });

        console.log("📊 Pub/Sub: Running Full SUBSCRIBE tests (this may take a while)...");
        const redisSubscribe = await benchmarkRedisClientSubscribe();
        results.push({ operation: "Pub/Sub SUBSCRIBE", library: "redis", ...redisSubscribe });

        // Print and save results
        printResults(results, "Redis Benchmark Results");
        await saveResults(results, "redis");

        return results;
    } catch (error) {
        console.error("❌ Redis benchmark error:", error);
        console.error("\nPlease make sure Redis server is running on localhost:6379");
        console.error("To start Redis: redis-server");
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

