# 📊 Benchmark Results

> **Test Environment:** MacBook Air M1  
> **Test Date:** October 9, 2025  
> **Runtime:** Bun

---

## 🎯 Overview

This benchmark study compares the performance of Bun runtime with SQLite, Redis, and MariaDB databases. Tests are designed to simulate real-world scenarios.

---

## 📈 Performance Comparisons

### 🗄️ SQLite Performance

Bun's native SQLite implementation demonstrates exceptional performance.

| Operation | Bun SQLite | Comparison | Performance Gain |
|-----------|------------|------------|------------------|
| **INSERT** | 211,248 ops/sec | vs 16,476 ops/sec | 🚀 **12.82x faster** |
| **SELECT** | 34,813 ops/sec | vs 14,758 ops/sec | ⚡ **2.36x faster** |
| **UPDATE** | 351,592 ops/sec | vs 21,019 ops/sec | 🔥 **16.73x faster** |
| **DELETE** | 117,727 ops/sec | vs 8,734 ops/sec | 💨 **13.48x faster** |

**Summary:** Bun SQLite shows exceptional performance across all operations, with an impressive **16.73x** speed improvement particularly in UPDATE operations.

---

### 💾 Redis Performance

Bun provides consistent performance advantages in Redis cache operations.

| Operation | Bun Redis | Comparison | Performance Gain |
|-----------|-----------|------------|------------------|
| **Cache SET** | 37,464 ops/sec | vs 28,411 ops/sec | ⚡ **1.32x faster** |
| **Cache GET** | 34,820 ops/sec | vs 30,283 ops/sec | 🔹 **1.15x faster** |
| **Cache DEL** | 17,316 ops/sec | vs 15,148 ops/sec | 🔹 **1.14x faster** |
| **Pub/Sub PUBLISH** | 34,543 ops/sec | vs 31,964 ops/sec | 🔹 **1.08x faster** |

**Summary:** In Redis operations, Bun offers a more pronounced performance advantage, especially in write operations (SET).

---

### 🐬 MariaDB Performance

MariaDB shows balanced performance characteristics.

| Operation | Bun SQL | Comparison | Performance |
|-----------|---------|------------|-------------|
| **INSERT** | 9,332 ops/sec | vs 8,565 ops/sec | ✅ **1.09x faster** |
| **SELECT** | 9,350 ops/sec | vs 7,394 ops/sec | ⚡ **1.26x faster** |
| **UPDATE** | 7,946 ops/sec | vs 7,726 ops/sec | ✅ **1.03x faster** |
| **DELETE** | 13,600 ops/sec | vs 17,572 ops/sec | ⚠️ **MariaDB 1.29x faster** |

**Summary:** While Bun generally performs well in MariaDB tests, the native MariaDB driver delivers faster results in DELETE operations.

---

## 🏆 Results and Recommendations

### ✨ Best Performance
- **SQLite:** Bun's native SQLite support offers excellent performance
- **Recommendation:** Bun + SQLite is the ideal choice for embedded database needs

### 💡 Balanced Performance
- **Redis:** Consistent performance improvement across all cache operations
- **Recommendation:** Bun + Redis can be used confidently for cache layer

### ⚖️ Points to Consider
- **MariaDB:** Native driver may be preferred for DELETE operations
- **Recommendation:** A hybrid approach could be considered for heavy DELETE workloads

---

## 📝 Notes

- All tests were performed on the same hardware
- Results reflect average values
- Real-world performance may vary depending on use-case
- See `BENCHMARK_README.md` for detailed benchmark methodology

---

**🔗 Related Files:**
- [Benchmark Methodology](BENCHMARK_README.md)
- [Main Project README](README.md)
- [Benchmark Codebase](benchmarks/)