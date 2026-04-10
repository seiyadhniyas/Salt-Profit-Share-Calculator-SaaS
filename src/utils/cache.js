// Simple in-memory cache for performance
const cache = {}

export function setCache(key, value, ttl = 60000) {
  cache[key] = { value, expires: Date.now() + ttl }
}

export function getCache(key) {
  const entry = cache[key]
  if (!entry) return undefined
  if (Date.now() > entry.expires) {
    delete cache[key]
    return undefined
  }
  return entry.value
}
