CACHE_SECONDS = 60 * 60


class TimedCache:
    def __init__(self, ttl=CACHE_SECONDS):
        self.ttl = ttl
        self.store = {}

    def get(self, key, now):
        cached = self.store.get(key)

        if not cached:
            return None

        if now - cached["time"] >= self.ttl:
            return None

        return cached["data"]

    def set(self, key, now, data):
        self.store[key] = {
            "time": now,
            "data": data,
        }
