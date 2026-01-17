# Bun API - Database Benchmark Suite

Test suite to compare Bun's native API with official client packages.

## 🚀 Quick Start

### Installation

```bash
bun install
```

### Run Benchmarks

```bash
# All benchmarks
bun run bench:all

# Individual benchmarks
bun run bench:sqlite   # SQLite (Bun vs sql.js)
bun run bench:mariadb  # MariaDB (Bun vs mariadb vs mysql2)
bun run bench:redis    # Redis (Bun vs redis vs memcached)

# Comparison benchmark
bun run bench:compare  # Bun SQLite (File) vs Bun Redis
```

## 📊 Tested Databases

1. **SQLite**: Bun SQLite API vs `sql.js` package
2. **MariaDB**: Bun SQL API vs `mariadb` vs `mysql2` packages
3. **Redis**: Bun Redis API vs `redis` vs `memcached` packages

# 📊 Benchmark Results @ Mac Mini M4 (Jan 17, 2026)

> **Test Environment:** Mac Mini M4
> **Test Date:** January 17, 2026
> **Runtime:** Bun v1.2.23 (Darwin arm64)

---

## 🎯 Overview

This benchmark study compares the performance of Bun runtime with SQLite, Redis, and MariaDB databases. Tests are designed to simulate real-world scenarios with 100,000 iterations for SQLite and 10,000 for others.

---

## 📈 Performance Comparisons

### 🗄️ SQLite Performance

Bun's native SQLite implementation demonstrates superior performance against the `sql.js` (WASM) library, especially in write-heavy operations.

| Operation | Bun SQLite | sql.js | Performance Gain |
|-----------|------------|--------|------------------|
| **INSERT** | 57,624 ops/sec | 41,283 ops/sec | 🚀 **1.4x faster** |
| **SELECT** | 57,758 ops/sec | 35,169 ops/sec | ⚡ **1.6x faster** |
| **UPDATE** | 96,301 ops/sec | 46,659 ops/sec | 🔥 **2.1x faster** |
| **DELETE** | 38,437 ops/sec | 21,511 ops/sec | 💨 **1.8x faster** |

**Summary:** Bun SQLite consistently outperforms `sql.js` across all operations, achieving more than double the speed in UPDATE operations.

---

### 💾 Redis Performance

Bun's native Redis client is compared against the popular `redis` package and `memcached`.

| Operation | Bun Redis | redis | memcached | Performance Gain |
|-----------|-----------|-------|-----------|------------------|
| **Cache SET** | 53,859 ops/sec | 53,168 ops/sec | 47,615 ops/sec | ⚡ **1.1x faster** |
| **Cache GET** | 59,558 ops/sec | 52,693 ops/sec | 47,780 ops/sec | 🔹 **1.2x faster** |
| **Cache DEL** | 27,728 ops/sec | 24,591 ops/sec | 24,851 ops/sec | 🔹 **1.1x faster** |
| **PUBLISH** | 53,711 ops/sec | 52,961 ops/sec | N/A | 🔹 **1.0x faster** |

**Summary:** Bun Redis provides a consistent performance edge over both the standard `redis` client and `memcached`, particularly in GET operations where it leads by 20%.

---

### 🐬 MariaDB Performance

Comparison between Bun's native SQL API, `mariadb` driver, and `mysql2` driver.

| Operation | Bun SQL | mysql2 | mariadb | Performance |
|-----------|---------|--------|---------|-------------|
| **INSERT** | 15,451 ops/sec | 15,003 ops/sec | 13,868 ops/sec | ✅ **1.1x faster** |
| **SELECT** | 14,089 ops/sec | 12,943 ops/sec | 13,417 ops/sec | ⚡ **1.1x faster** |
| **UPDATE** | 14,851 ops/sec | 14,729 ops/sec | 14,563 ops/sec | ✅ **1.0x faster** |
| **DELETE** | 33,448 ops/sec | 32,294 ops/sec | 30,617 ops/sec | ⚠️ **1.1x faster** |

**Summary:** Bun SQL performs neck-and-neck with established drivers like `mysql2` and `mariadb`, often taking a slight lead in raw operations per second.

---

### ⚔️ SQLite vs Redis Comparison

Direct comparison between Bun's file-based SQLite (WAL mode) and Bun's Redis implementation.

| Operation | Bun Redis | Bun SQLite (File) | Difference |
|-----------|-----------|-------------------|------------|
| **WRITE** | 57,304 ops/sec | 54,941 ops/sec | ⚖️ **Redis 1.0x faster** |
| **READ** | 62,051 ops/sec | 43,835 ops/sec | 🚀 **Redis 1.4x faster** |

**Summary:**
- **Writes:** Redis and file-based SQLite performance is remarkably close for simple key-value writes.
- **Reads:** Redis maintains a significant lead (40% faster) in read operations.

---

## 📝 Notes

- **SQLite**: Tested with 100,000 iterations using file-based DB with WAL mode enabled.
- **MariaDB/Redis**: Tested with 10,000 iterations against local instances.
- **Hardware**: Mac Mini M4
- Results reflect average values over multiple runs.

---
