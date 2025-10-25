# Cache Service Documentation

The Cache Service provides a centralized Redis client with comprehensive caching capabilities for the record label platform.

## 🏗️ **Architecture**

### **Global Service**

- **@Global()** decorator makes CacheService available across all modules
- **Single Redis connection** shared by sessions, API caching, and other services
- **Automatic connection management** with reconnection strategies

### **Key Features**

- ✅ **Connection Management**: Automatic connect/disconnect with error handling
- ✅ **Namespacing**: Organize cache keys by feature (`user:123`, `artist:456`)
- ✅ **TTL Support**: Flexible expiration times per cache entry
- ✅ **Bulk Operations**: Get/set multiple keys efficiently
- ✅ **Health Monitoring**: Connection status and performance metrics
- ✅ **Error Resilience**: Cache failures won't break application flow

## 🔧 **Basic Usage**

### **Inject the Service**

```typescript
import { CacheService } from '../cache/cache.service';

@Injectable()
export class ArtistService {
  constructor(private readonly cacheService: CacheService) {}
}
```

### **Simple Get/Set**

```typescript
// Set with 1 hour TTL
await this.cacheService.set('user:123', userData, { ttl: 3600 });

// Get data
const cached = await this.cacheService.get('user:123');
```

### **With Namespacing**

```typescript
// Set with namespace
await this.cacheService.set('profile', userData, {
  namespace: 'user:123',
  ttl: 3600,
});

// Get with namespace
const profile = await this.cacheService.get('profile', 'user:123');
// Cache key becomes: user:123:profile
```

## 🎯 **Use Cases by Service**

### **Artist Service**

```typescript
// Cache popular artists
await cacheService.set('popular', artists, {
  namespace: 'artists',
  ttl: 1800, // 30 minutes
});

// Cache individual artist
await cacheService.set(artistId, artistData, {
  namespace: 'artist',
  ttl: 3600, // 1 hour
});
```

### **Product Service**

```typescript
// Cache product catalog
await cacheService.set('catalog', products, {
  namespace: 'products',
  ttl: 900, // 15 minutes
});

// Cache inventory counts
await cacheService.set(`stock:${productId}`, stockCount, { ttl: 300 });
```

### **Search Service**

```typescript
// Cache search results
const searchKey = `query:${encodeURIComponent(searchTerm)}`;
await cacheService.set(searchKey, results, {
  namespace: 'search',
  ttl: 600, // 10 minutes
});
```

## 🚀 **Advanced Features**

### **Cache Wrapper Function**

```typescript
// Get from cache or execute function if not cached
const expensiveData = await this.cacheService.wrap(
  'expensive-operation',
  async () => {
    // This only runs if not in cache
    return await this.performExpensiveOperation();
  },
  { ttl: 3600, namespace: 'operations' },
);
```

### **Bulk Operations**

```typescript
// Get multiple keys at once
const artistIds = ['123', '456', '789'];
const artists = await this.cacheService.mget(artistIds, 'artist');

// Set multiple keys
await this.cacheService.mset(
  [
    { key: '123', value: artist1, ttl: 3600 },
    { key: '456', value: artist2, ttl: 3600 },
  ],
  'artist',
);
```

### **Pattern Deletion**

```typescript
// Delete all user-related cache
await this.cacheService.delPattern('*', 'user:123');

// Delete all search results
await this.cacheService.delPattern('*', 'search');
```

## 📊 **Monitoring & Health**

### **Health Check Endpoint**

```bash
GET /cache/health
```

Response:

```json
{
  "healthy": true,
  "connected": true,
  "memory": "2.5M",
  "keyCount": 1247,
  "hits": "5432",
  "misses": "123"
}
```

### **Performance Monitoring**

```typescript
// Check if service is healthy
const isHealthy = await this.cacheService.isHealthy();

// Get detailed stats
const stats = await this.cacheService.getStats();
```

## 🔒 **Security & Best Practices**

### **Admin-Only Endpoints**

- Cache health and stats endpoints require ADMIN role
- Prevents sensitive cache information exposure

### **Error Handling**

- Cache failures are logged but don't break app functionality
- Graceful degradation when Redis is unavailable

### **Key Naming Conventions**

```typescript
// Good patterns
'user:123:profile';
'artist:456:releases';
'product:789:stock';
'search:query:techno';

// Avoid
'userProfile123'; // Hard to organize
'data'; // Too generic
```

## ⚡ **Performance Benefits**

### **Session Store Integration**

- Sessions use the same Redis connection
- No additional connection overhead
- Consistent connection management

### **Connection Pooling**

- Single optimized Redis connection
- Automatic reconnection with backoff
- Connection health monitoring

### **Memory Efficiency**

- JSON serialization for complex objects
- TTL-based automatic cleanup
- Configurable memory usage

## 🛠️ **Configuration**

### **Environment Variables**

```bash
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=your_redis_password
```

### **Connection Settings**

- **Reconnection Strategy**: Exponential backoff up to 10 retries
- **Default TTL**: No expiration (must be set explicitly)
- **Serialization**: JSON for all cached data

## 🔄 **Migration from Direct Redis**

### **Before (main.ts)**

```typescript
const redisClient = createClient({...});
await redisClient.connect();
```

### **After (main.ts)**

```typescript
const cacheService = app.get(CacheService);
const redisClient = cacheService.getClient();
```

### **Service Usage**

```typescript
// Instead of direct Redis calls
await redisClient.set('key', JSON.stringify(data));

// Use cache service
await this.cacheService.set('key', data, { ttl: 3600 });
```

## 🔮 **Future Enhancements**

### **Planned Features**

- **Cache Warming**: Pre-load commonly accessed data
- **Distributed Locking**: Prevent cache stampede
- **Compression**: Reduce memory usage for large objects
- **Metrics Dashboard**: Real-time cache performance
- **Cache Tags**: Group related cache entries for batch invalidation

The Cache Service provides a solid foundation for all caching needs across your record label platform! 🎵
