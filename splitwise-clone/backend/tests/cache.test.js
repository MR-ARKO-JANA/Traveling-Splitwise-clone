const cache = require('../config/redis');

describe('Redis Cache Wrapper Fallback Mode', () => {
  test('should return null for get when disconnected', async () => {
    const val = await cache.get('any-key');
    expect(val).toBeNull();
  });

  test('should return false for set when disconnected', async () => {
    const success = await cache.set('any-key', { data: 'test' });
    expect(success).toBe(false);
  });

  test('should return false for del when disconnected', async () => {
    const success = await cache.del('any-key');
    expect(success).toBe(false);
  });

  test('should return false for delPattern when disconnected', async () => {
    const success = await cache.delPattern('balances:*');
    expect(success).toBe(false);
  });
});

jest.mock('redis', () => {
  const mClient = {
    on: jest.fn(),
    connect: jest.fn().mockResolvedValue(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(),
  };
  global.mockRedisClient = mClient;
  return {
    createClient: jest.fn(() => mClient),
  };
});

describe('Redis Cache Wrapper Active Mode', () => {
  let activeCache;
  let originalEnv;

  beforeAll(() => {
    originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'cache-test'; // bypass 'test' condition
    jest.isolateModules(() => {
      activeCache = require('../config/redis');
    });
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv;
    delete global.mockRedisClient;
  });

  test('should set/get/del keys through redis client', async () => {
    const mockRedisClient = global.mockRedisClient;
    // We need to trigger the 'ready' event callback to make isConnected true
    const readyCallback = mockRedisClient.on.mock.calls.find((call) => call[0] === 'ready')[1];
    readyCallback(); // Set isConnected = true

    // Now test cache methods
    mockRedisClient.get.mockResolvedValue(JSON.stringify({ a: 1 }));
    const val = await activeCache.get('foo');
    expect(val).toEqual({ a: 1 });
    expect(mockRedisClient.get).toHaveBeenCalledWith('foo');

    mockRedisClient.set.mockResolvedValue('OK');
    const setSuccess = await activeCache.set('foo', { a: 1 }, 100);
    expect(setSuccess).toBe(true);
    expect(mockRedisClient.set).toHaveBeenCalledWith('foo', JSON.stringify({ a: 1 }), { EX: 100 });

    mockRedisClient.del.mockResolvedValue(1);
    const delSuccess = await activeCache.del('foo');
    expect(delSuccess).toBe(true);
    expect(mockRedisClient.del).toHaveBeenCalledWith('foo');

    mockRedisClient.keys.mockResolvedValue(['foo:1', 'foo:2']);
    const delPatternSuccess = await activeCache.delPattern('foo:*');
    expect(delPatternSuccess).toBe(true);
    expect(mockRedisClient.keys).toHaveBeenCalledWith('foo:*');
    expect(mockRedisClient.del).toHaveBeenCalledWith(['foo:1', 'foo:2']);
  });
});
