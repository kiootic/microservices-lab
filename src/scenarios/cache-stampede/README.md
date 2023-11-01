# Cache Stampede

In this scenario, we look into cache stampede caused by cache flush.

## Setup

The system consist of an API server, a cache, and a database.

Database query is slow (~20ms), and cache query is fast (~1ms).


## Useful metrics

- [API latency](lab:metrics?q=system.fn_duration_ms{service=api})
- [DB latency](lab:metrics?q=system.fn_duration_ms{service=db})
- [DB load](lab:metrics?q=system.node_load{service=db})
- [Cache latency](lab:metrics?q=system.fn_duration_ms{service=cache})
- [Cache hits](lab:metrics?q=services.cache.hit)
- [Cache misses](lab:metrics?q=services.cache.miss)
