import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  namespace?: string; // Key namespace
}

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client: RedisClientType;
  private isConnected = false;

  async onModuleInit() {
    this.logger.log(
      'CacheService onModuleInit called - starting Redis connection',
    );
    await this.connect();
    this.logger.log('CacheService onModuleInit completed - Redis connected');
  }

  async onModuleDestroy() {
    await this.disconnect();
  }

  /**
   * Initialize Redis connection
   */
  private async connect(): Promise<void> {
    try {
      this.logger.log(
        'Creating Redis client with URL:',
        process.env.REDIS_URL || 'redis://localhost:6379',
      );
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        password: process.env.REDIS_PASSWORD || 'incus_redis_password',
        socket: {
          reconnectStrategy: (retries) => {
            if (retries >= 10) {
              this.logger.error('Redis connection failed after 10 retries');
              return new Error('Redis connection failed');
            }
            return Math.min(retries * 50, 500);
          },
        },
      });

      this.client.on('error', (err) => {
        this.logger.error('Redis client error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        this.logger.log('Redis client connected');
        this.isConnected = true;
      });

      this.client.on('ready', () => {
        this.logger.log('Redis client ready');
      });

      this.client.on('reconnecting', () => {
        this.logger.log('Redis client reconnecting...');
      });

      await this.client.connect();
      this.isConnected = true; // Set connected immediately after successful connect
    } catch (error) {
      this.logger.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  private async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.isConnected = false;
      this.logger.log('Redis client disconnected');
    }
  }

  /**
   * Get the raw Redis client for advanced operations
   */
  getClient(): RedisClientType {
    if (!this.isConnected || !this.client) {
      throw new Error('Redis client is not connected');
    }
    return this.client;
  }

  /**
   * Wait for Redis connection to be established
   */
  async waitForConnection(): Promise<void> {
    if (this.isConnected && this.client) {
      return;
    }

    // Wait for connection to be established (with timeout)
    const timeout = 10000; // 10 seconds
    const start = Date.now();

    while (!this.isConnected && Date.now() - start < timeout) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (!this.isConnected) {
      throw new Error('Failed to connect to Redis within timeout');
    }
  }

  /**
   * Build cache key with optional namespace
   */
  private buildKey(key: string, namespace?: string): string {
    return namespace ? `${namespace}:${key}` : key;
  }

  /**
   * Set a value in cache
   */
  async set(
    key: string,
    value: any,
    options: CacheOptions = {},
  ): Promise<void> {
    try {
      const cacheKey = this.buildKey(key, options.namespace);
      const serializedValue = JSON.stringify(value);

      if (options.ttl) {
        await this.client.setEx(cacheKey, options.ttl, serializedValue);
      } else {
        await this.client.set(cacheKey, serializedValue);
      }

      this.logger.debug(`Cache SET: ${cacheKey}`);
    } catch (error) {
      this.logger.error(`Failed to set cache key ${key}:`, error);
      // Don't throw - cache failures shouldn't break the app
    }
  }

  /**
   * Get a value from cache
   */
  async get<T = any>(key: string, namespace?: string): Promise<T | null> {
    try {
      const cacheKey = this.buildKey(key, namespace);
      const value = await this.client.get(cacheKey);

      if (value === null) {
        this.logger.debug(`Cache MISS: ${cacheKey}`);
        return null;
      }

      this.logger.debug(`Cache HIT: ${cacheKey}`);
      return JSON.parse(value as string) as T;
    } catch (error) {
      this.logger.error(`Failed to get cache key ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete a value from cache
   */
  async del(key: string, namespace?: string): Promise<void> {
    try {
      const cacheKey = this.buildKey(key, namespace);
      await this.client.del(cacheKey);
      this.logger.debug(`Cache DEL: ${cacheKey}`);
    } catch (error) {
      this.logger.error(`Failed to delete cache key ${key}:`, error);
    }
  }

  /**
   * Check if a key exists in cache
   */
  async exists(key: string, namespace?: string): Promise<boolean> {
    try {
      const cacheKey = this.buildKey(key, namespace);
      const result = await this.client.exists(cacheKey);
      return result === 1;
    } catch (error) {
      this.logger.error(`Failed to check cache key ${key}:`, error);
      return false;
    }
  }

  /**
   * Set expiration time for a key
   */
  async expire(key: string, ttl: number, namespace?: string): Promise<void> {
    try {
      const cacheKey = this.buildKey(key, namespace);
      await this.client.expire(cacheKey, ttl);
      this.logger.debug(`Cache EXPIRE: ${cacheKey} (${ttl}s)`);
    } catch (error) {
      this.logger.error(
        `Failed to set expiration for cache key ${key}:`,
        error,
      );
    }
  }

  /**
   * Get multiple values from cache
   */
  async mget<T = any>(
    keys: string[],
    namespace?: string,
  ): Promise<(T | null)[]> {
    try {
      const cacheKeys = keys.map((key) => this.buildKey(key, namespace));
      const values = await this.client.mGet(cacheKeys);

      return values.map((value, index) => {
        if (value === null) {
          this.logger.debug(`Cache MISS: ${cacheKeys[index]}`);
          return null;
        }
        this.logger.debug(`Cache HIT: ${cacheKeys[index]}`);
        return JSON.parse(value as string) as T;
      });
    } catch (error) {
      this.logger.error('Failed to get multiple cache keys:', error);
      return keys.map(() => null);
    }
  }

  /**
   * Set multiple values in cache
   */
  async mset(
    keyValuePairs: Array<{ key: string; value: any; ttl?: number }>,
    namespace?: string,
  ): Promise<void> {
    try {
      for (const { key, value, ttl } of keyValuePairs) {
        await this.set(key, value, { ttl, namespace });
      }
    } catch (error) {
      this.logger.error('Failed to set multiple cache keys:', error);
    }
  }

  /**
   * Delete all keys matching a pattern
   */
  async delPattern(pattern: string, namespace?: string): Promise<void> {
    try {
      const searchPattern = this.buildKey(pattern, namespace);
      const keys = await this.client.keys(searchPattern);

      if (keys.length > 0) {
        await this.client.del(keys);
        this.logger.debug(
          `Cache DEL PATTERN: ${searchPattern} (${keys.length} keys)`,
        );
      }
    } catch (error) {
      this.logger.error(`Failed to delete cache pattern ${pattern}:`, error);
    }
  }

  /**
   * Clear all cache data
   */
  async flushAll(): Promise<void> {
    try {
      await this.client.flushAll();
      this.logger.log('Cache flushed all data');
    } catch (error) {
      this.logger.error('Failed to flush cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    connected: boolean;
    memory: string;
    keyCount: number;
    hits: string;
    misses: string;
  }> {
    try {
      const info = await this.client.info();
      const dbSize = await this.client.dbSize();

      // Parse Redis INFO response
      const memoryUsed = this.parseInfoField(info, 'used_memory_human');
      const keyspaceHits = this.parseInfoField(info, 'keyspace_hits');
      const keyspaceMisses = this.parseInfoField(info, 'keyspace_misses');

      return {
        connected: this.isConnected,
        memory: memoryUsed || 'unknown',
        keyCount: dbSize,
        hits: keyspaceHits || '0',
        misses: keyspaceMisses || '0',
      };
    } catch (error) {
      this.logger.error('Failed to get cache stats:', error);
      return {
        connected: false,
        memory: 'unknown',
        keyCount: 0,
        hits: '0',
        misses: '0',
      };
    }
  }

  /**
   * Parse field from Redis INFO command output
   */
  private parseInfoField(info: string, field: string): string | null {
    const regex = new RegExp(`${field}:(.*)`);
    const match = info.match(regex);
    return match ? match[1].trim() : null;
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<boolean> {
    try {
      const pong = await this.client.ping();
      return pong === 'PONG' && this.isConnected;
    } catch (error) {
      this.logger.error('Cache health check failed:', error);
      return false;
    }
  }

  /**
   * Cache wrapper function - get from cache or execute function
   */
  async wrap<T>(
    key: string,
    fn: () => Promise<T>,
    options: CacheOptions = {},
  ): Promise<T> {
    const cached = await this.get<T>(key, options.namespace);
    if (cached !== null) {
      return cached;
    }

    const result = await fn();
    await this.set(key, result, options);
    return result;
  }
}
