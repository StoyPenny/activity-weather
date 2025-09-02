// --- US NAVAL OBSERVATORY ASTRONOMY API CONFIGURATION ---
const USNO_BASE_URL = 'https://aa.usno.navy.mil/api/rstt/oneday';

// --- CACHING CONFIGURATION ---
// Cache refreshes once per calendar day at local midnight

// Cache management configuration
const CACHE_CONFIG = {
  // Maximum total cache size in bytes (4MB - leaving 1MB buffer for other data)
  MAX_TOTAL_CACHE_SIZE: 4 * 1024 * 1024,
  // Maximum size for a single cache entry (1MB)
  MAX_ENTRY_SIZE: 1024 * 1024,
  // Maximum number of cache entries
  MAX_CACHE_ENTRIES: 20,
  // Cache entry prefix for astronomy data
  CACHE_PREFIX: 'astronomy_',
  // Compression threshold - compress entries larger than this (100KB)
  COMPRESSION_THRESHOLD: 100 * 1024
};

// Helper function to check if two dates are the same calendar day (local timezone)
const isSameCalendarDay = (date1, date2) => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

// --- CACHE SIZE MANAGEMENT ---
// Get the size of a string in bytes (UTF-8)
const getStringSize = (str) => {
  return new Blob([str]).size;
};

// Get total cache size for astronomy data
const getTotalCacheSize = () => {
  let totalSize = 0;
  const keys = Object.keys(localStorage);

  for (const key of keys) {
    if (key.startsWith(CACHE_CONFIG.CACHE_PREFIX)) {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += getStringSize(value);
        }
      } catch (error) {
        console.warn(`Error reading cache entry ${key}:`, error);
      }
    }
  }

  return totalSize;
};

// Get all astronomy cache entries with metadata
const getCacheEntries = () => {
  const entries = [];
  const keys = Object.keys(localStorage);

  for (const key of keys) {
    if (key.startsWith(CACHE_CONFIG.CACHE_PREFIX)) {
      try {
        const value = localStorage.getItem(key);
        if (value) {
          const parsed = JSON.parse(value);
          entries.push({
            key,
            size: getStringSize(value),
            timestamp: parsed.timestamp || 0,
            lastAccessed: parsed.lastAccessed || parsed.timestamp || 0,
            type: parsed.type || 'unknown',
            location: parsed.location || null
          });
        }
      } catch (error) {
        console.warn(`Error parsing cache entry ${key}:`, error);
        // Remove corrupted entries
        localStorage.removeItem(key);
      }
    }
  }

  return entries.sort((a, b) => b.lastAccessed - a.lastAccessed);
};

// --- CACHE EVICTION STRATEGIES ---
// Remove least recently used cache entries
const evictLRUEntries = (targetSize) => {
  const entries = getCacheEntries();
  let currentSize = getTotalCacheSize();
  let removedCount = 0;

  // Sort by last accessed time (oldest first)
  entries.sort((a, b) => a.lastAccessed - b.lastAccessed);

  for (const entry of entries) {
    if (currentSize <= targetSize) break;

    try {
      localStorage.removeItem(entry.key);
      currentSize -= entry.size;
      removedCount++;
      console.log(`Evicted astronomy cache entry: ${entry.key} (${(entry.size / 1024).toFixed(1)}KB)`);
    } catch (error) {
      console.warn(`Error removing cache entry ${entry.key}:`, error);
    }
  }

  return removedCount;
};

// Remove expired cache entries
const evictExpiredEntries = () => {
  const entries = getCacheEntries();
  const currentDate = new Date();
  let removedCount = 0;

  for (const entry of entries) {
    try {
      const entryDate = new Date(entry.timestamp);

      // Remove entries that are not from the same calendar day
      if (!isSameCalendarDay(entryDate, currentDate)) {
        localStorage.removeItem(entry.key);
        removedCount++;
        console.log(`Evicted expired astronomy cache entry: ${entry.key}`);
      }
    } catch (error) {
      console.warn(`Error checking expiry for ${entry.key}:`, error);
    }
  }

  return removedCount;
};

// Remove entries exceeding count limit
const evictExcessEntries = () => {
  const entries = getCacheEntries();
  let removedCount = 0;

  if (entries.length > CACHE_CONFIG.MAX_CACHE_ENTRIES) {
    // Sort by last accessed (oldest first) and remove excess
    entries.sort((a, b) => a.lastAccessed - b.lastAccessed);
    const entriesToRemove = entries.slice(0, entries.length - CACHE_CONFIG.MAX_CACHE_ENTRIES);

    for (const entry of entriesToRemove) {
      try {
        localStorage.removeItem(entry.key);
        removedCount++;
        console.log(`Evicted excess astronomy cache entry: ${entry.key}`);
      } catch (error) {
        console.warn(`Error removing excess entry ${entry.key}:`, error);
      }
    }
  }

  return removedCount;
};

// --- DATA COMPRESSION ---
// Simple compression using JSON optimization
const compressAstronomyData = (data) => {
  try {
    // Create a more compact representation
    const compressed = {
      p: data.properties || null,
      g: data.geometry || null,
      t: data.type || null
    };

    return compressed;
  } catch (error) {
    console.warn('Error compressing astronomy data:', error);
    return data;
  }
};

// Decompress astronomy data back to original format
const decompressAstronomyData = (compressed) => {
  try {
    if (!compressed.p) {
      // Data is not compressed, return as-is
      return compressed;
    }

    const decompressed = {
      properties: compressed.p,
      geometry: compressed.g,
      type: compressed.t
    };

    return decompressed;
  } catch (error) {
    console.warn('Error decompressing astronomy data:', error);
    return compressed;
  }
};

// --- CACHE HEALTH MANAGEMENT ---
// Perform cache maintenance
const performCacheMaintenance = () => {
  try {
    console.log('Starting astronomy cache maintenance...');

    const initialSize = getTotalCacheSize();
    const initialEntries = getCacheEntries().length;

    // Step 1: Remove expired entries
    const expiredRemoved = evictExpiredEntries();

    // Step 2: Remove excess entries
    const excessRemoved = evictExcessEntries();

    // Step 3: Check if we're still over size limit
    const currentSize = getTotalCacheSize();
    if (currentSize > CACHE_CONFIG.MAX_TOTAL_CACHE_SIZE) {
      const targetSize = CACHE_CONFIG.MAX_TOTAL_CACHE_SIZE * 0.8; // Target 80% of max
      const lruRemoved = evictLRUEntries(targetSize);
      console.log(`Astronomy cache maintenance: removed ${lruRemoved} LRU entries`);
    }

    const finalSize = getTotalCacheSize();
    const finalEntries = getCacheEntries().length;

    console.log(`Astronomy cache maintenance completed:
      - Initial: ${initialEntries} entries, ${(initialSize / 1024).toFixed(1)}KB
      - Removed: ${expiredRemoved} expired, ${excessRemoved} excess
      - Final: ${finalEntries} entries, ${(finalSize / 1024).toFixed(1)}KB`);

    return {
      initialSize,
      finalSize,
      entriesRemoved: expiredRemoved + excessRemoved,
      success: true
    };
  } catch (error) {
    console.error('Error during astronomy cache maintenance:', error);
    return { success: false, error: error.message };
  }
};

// Check if cache operation is safe
const isCacheOperationSafe = (dataSize) => {
  const currentSize = getTotalCacheSize();
  const projectedSize = currentSize + dataSize;

  return {
    safe: projectedSize <= CACHE_CONFIG.MAX_TOTAL_CACHE_SIZE,
    currentSize,
    projectedSize,
    maxSize: CACHE_CONFIG.MAX_TOTAL_CACHE_SIZE,
    utilizationPercent: (projectedSize / CACHE_CONFIG.MAX_TOTAL_CACHE_SIZE) * 100
  };
};

// --- US NAVAL OBSERVATORY API SERVICE ---
const fetchAstronomyData = async (lat, lng, date = new Date()) => {
  // Validate coordinates
  if (typeof lat !== 'number' || typeof lng !== 'number' ||
      lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error('Invalid coordinates provided');
  }

  // Format date as YYYY-MM-DD
  const dateStr = date.toISOString().split('T')[0];

  const params = new URLSearchParams({
    date: dateStr,
    coords: `${lat},${lng}`,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  });

  console.log(`🌅 USNO API Request: ${USNO_BASE_URL}?${params.toString()}`);
  console.log(`📍 Location: ${lat}, ${lng} | Date: ${dateStr} | Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`);

  const response = await fetch(`${USNO_BASE_URL}?${params}`);

  if (!response.ok) {
    console.error(`❌ USNO API HTTP Error: ${response.status} ${response.statusText}`);
    throw new Error(`US Naval Observatory API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Debug: Log the actual API response structure
  console.log('🔍 USNO API Full Response:', JSON.stringify(data, null, 2));

  // The USNO API structure might be different than expected
  // Let's check multiple possible structures
  let sunData = null;
  let moonData = null;

  // Check different possible API response structures
  if (data.properties?.data) {
    // Structure: data.properties.data.sun/moon
    sunData = data.properties.data.sun;
    moonData = data.properties.data.moon;
    console.log('📊 Using properties.data structure');
  } else if (data.data) {
    // Structure: data.data.sun/moon
    sunData = data.data.sun;
    moonData = data.data.moon;
    console.log('📊 Using data structure');
  } else if (data.sun || data.moon) {
    // Structure: data.sun/moon directly
    sunData = data.sun;
    moonData = data.moon;
    console.log('📊 Using direct structure');
  } else if (data.sundata || data.moondata) {
    // Alternative naming
    sunData = data.sundata;
    moonData = data.moondata;
    console.log('📊 Using sundata/moondata structure');
  }

  console.log('🌞 Sun data found:', sunData);
  console.log('🌙 Moon data found:', moonData);

  const transformedData = {
    date: dateStr,
    location: { lat, lng },
    sun: {
      rise: sunData?.rise || sunData?.sunrise || null,
      set: sunData?.set || sunData?.sunset || null,
      transit: sunData?.transit || sunData?.noon || sunData?.solar_noon || null
    },
    moon: {
      rise: moonData?.rise || moonData?.moonrise || null,
      set: moonData?.set || moonData?.moonset || null,
      phase: moonData?.phase || null,
      fraction: moonData?.fraction || moonData?.illumination || null
    },
    raw: data,
    apiSource: 'USNO'
  };

  console.log('✅ Transformed astronomy data:', transformedData);

  return transformedData;
};

// --- CACHE MANAGEMENT FUNCTIONS ---
// Cache refreshes once per calendar day at local midnight
const generateCacheKey = (lat, lng, date) => {
  // Round to 3 decimal places for cache key (roughly 100m precision)
  const roundedLat = Math.round(lat * 1000) / 1000;
  const roundedLng = Math.round(lng * 1000) / 1000;
  const dateStr = date.toISOString().split('T')[0];
  return `astronomy_${roundedLat}_${roundedLng}_${dateStr}`;
};

const getCachedData = (lat, lng, date = new Date()) => {
  try {
    // Perform cache maintenance before reading
    performCacheMaintenance();

    const cacheKey = generateCacheKey(lat, lng, date);
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const parsedCache = JSON.parse(cached);
    const { data, timestamp } = parsedCache;
    const cacheDate = new Date(timestamp);
    const currentDate = new Date();

    // Check if cache is from the same calendar day (local timezone)
    // Cache expires at midnight and refreshes for the new day
    if (isSameCalendarDay(cacheDate, currentDate)) {
      // Update last accessed time
      const updatedCache = {
        ...parsedCache,
        lastAccessed: Date.now()
      };

      try {
        localStorage.setItem(cacheKey, JSON.stringify(updatedCache));
      } catch (updateError) {
        console.warn('Could not update last accessed time:', updateError);
      }

      // Decompress data if needed
      const decompressedData = decompressAstronomyData(data);

      console.log(`Using cached astronomy data for ${lat}, ${lng} on ${date.toISOString().split('T')[0]} (cached on ${cacheDate.toLocaleDateString()})`);
      return { data: decompressedData, timestamp };
    } else {
      console.log(`Astronomy cache expired (cached on ${cacheDate.toLocaleDateString()}, now ${currentDate.toLocaleDateString()}), will fetch fresh data`);
      localStorage.removeItem(cacheKey);
      return null;
    }
  } catch (error) {
    console.warn('Error reading astronomy cache:', error);
    const cacheKey = generateCacheKey(lat, lng, date);
    localStorage.removeItem(cacheKey);
    return null;
  }
};

const setCachedData = (data, lat, lng, date = new Date()) => {
  try {
    // Perform cache maintenance before writing
    performCacheMaintenance();

    const cacheKey = generateCacheKey(lat, lng, date);
    const now = new Date();

    // Compress data if it's large enough
    let dataToStore = data;
    const dataString = JSON.stringify(data);
    const dataSize = getStringSize(dataString);

    if (dataSize > CACHE_CONFIG.COMPRESSION_THRESHOLD) {
      dataToStore = compressAstronomyData(data);
      console.log(`Compressing astronomy data: ${(dataSize / 1024).toFixed(1)}KB -> ${(getStringSize(JSON.stringify(dataToStore)) / 1024).toFixed(1)}KB`);
    }

    const cacheObject = {
      data: dataToStore,
      timestamp: now.getTime(),
      lastAccessed: now.getTime(),
      cacheDate: now.toLocaleDateString(),
      location: { lat, lng },
      date: date.toISOString().split('T')[0],
      compressed: dataToStore !== data
    };

    const cacheString = JSON.stringify(cacheObject);
    const cacheSize = getStringSize(cacheString);

    // Check if this entry is too large
    if (cacheSize > CACHE_CONFIG.MAX_ENTRY_SIZE) {
      console.warn(`Astronomy cache entry too large (${(cacheSize / 1024).toFixed(1)}KB), skipping cache for ${cacheKey}`);
      return;
    }

    // Check if cache operation is safe
    const safetyCheck = isCacheOperationSafe(cacheSize);
    if (!safetyCheck.safe) {
      console.warn(`Astronomy cache operation would exceed quota (${safetyCheck.utilizationPercent.toFixed(1)}%), performing aggressive cleanup`);

      // Perform aggressive cleanup
      const targetSize = CACHE_CONFIG.MAX_TOTAL_CACHE_SIZE * 0.5; // Target 50% of max
      evictLRUEntries(targetSize);

      // Re-check safety
      const recheckSafety = isCacheOperationSafe(cacheSize);
      if (!recheckSafety.safe) {
        console.warn(`Still unsafe after cleanup, skipping astronomy cache for ${cacheKey}`);
        return;
      }
    }

    localStorage.setItem(cacheKey, cacheString);
    console.log(`Astronomy data cached successfully for ${lat}, ${lng} on ${date.toISOString().split('T')[0]} (${(cacheSize / 1024).toFixed(1)}KB)`);

  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      console.error('localStorage quota exceeded, performing emergency cleanup');

      // Emergency cleanup - remove half of all cache entries
      const entries = getCacheEntries();
      const entriesToRemove = Math.ceil(entries.length / 2);

      entries.sort((a, b) => a.lastAccessed - b.lastAccessed);
      for (let i = 0; i < entriesToRemove && i < entries.length; i++) {
        try {
          localStorage.removeItem(entries[i].key);
          console.log(`Emergency cleanup: removed astronomy cache entry ${entries[i].key}`);
        } catch (cleanupError) {
          console.warn(`Error during emergency cleanup:`, cleanupError);
        }
      }

      // Try to cache again after cleanup
      try {
        const cacheObject = {
          data: compressAstronomyData(data), // Force compression in emergency
          timestamp: Date.now(),
          lastAccessed: Date.now(),
          cacheDate: new Date().toLocaleDateString(),
          location: { lat, lng },
          date: date.toISOString().split('T')[0],
          compressed: true
        };

        localStorage.setItem(generateCacheKey(lat, lng, date), JSON.stringify(cacheObject));
        console.log(`Astronomy data cached after emergency cleanup`);
      } catch (retryError) {
        console.error('Failed to cache astronomy data even after emergency cleanup:', retryError);
      }
    } else {
      console.warn('Error caching astronomy data:', error);
    }
  }
};


// --- MAIN FETCH FUNCTION WITH CACHING AND FALLBACK ---
export const fetchAstronomyDataCached = async (lat, lng, date = new Date(), forceRefresh = false) => {
  // Validate coordinates
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new Error('Invalid coordinates: lat and lng must be numbers');
  }

  console.log(`🔍 fetchAstronomyDataCached called with: lat=${lat}, lng=${lng}, date=${date.toISOString().split('T')[0]}, forceRefresh=${forceRefresh}`);

  // Check cache first unless force refresh is requested
  if (!forceRefresh) {
    const cached = getCachedData(lat, lng, date);
    if (cached) {
      console.log(`📦 Returning cached astronomy data (source: ${cached.data.apiSource || 'unknown'})`);
      return cached.data;
    }
  }

  try {
    console.log(`🌐 Attempting to fetch astronomy data from US Naval Observatory API for ${lat}, ${lng} on ${date.toISOString().split('T')[0]}...`);
    const liveData = await fetchAstronomyData(lat, lng, date);
    console.log('✅ Successfully fetched astronomy data from USNO API');

    // Cache the fresh data
    setCachedData(liveData, lat, lng, date);

    return liveData;
  } catch (error) {
    console.error('❌ Failed to fetch astronomy data from API:', error.message);
    
    // Return error data instead of mock data
    const errorData = {
      date: date.toISOString().split('T')[0],
      location: { lat, lng },
      sun: {
        rise: null,
        set: null,
        transit: null
      },
      moon: {
        rise: null,
        set: null,
        phase: null,
        fraction: null
      },
      error: `Failed to fetch astronomy data: ${error.message}`,
      apiSource: 'ERROR'
    };

    return errorData;
  }
};

// --- DEBUGGING AND TESTING FUNCTIONS ---
// Force refresh astronomy data and clear cache
export const forceRefreshAstronomyData = async (lat, lng, date = new Date()) => {
  console.log('🔄 Force refreshing astronomy data...');
  
  // Clear existing cache
  clearAstronomyCache(lat, lng, date);
  
  // Fetch fresh data
  return await fetchAstronomyDataCached(lat, lng, date, true);
};

// Test the USNO API directly without caching
export const testUSNOAPI = async (lat, lng, date = new Date()) => {
  console.log('🧪 Testing USNO API directly...');
  try {
    const result = await fetchAstronomyData(lat, lng, date);
    console.log('🎯 Direct USNO API test result:', result);
    return result;
  } catch (error) {
    console.error('💥 Direct USNO API test failed:', error);
    throw error;
  }
};

// --- UTILITY FUNCTIONS ---
// Get moon phase description from fraction
export const getMoonPhaseDescription = (fraction) => {
  if (fraction === null || fraction === undefined) return 'Unknown';

  const phase = fraction * 100; // Convert to percentage

  if (phase < 12.5) return 'New Moon';
  if (phase < 37.5) return 'Waxing Crescent';
  if (phase < 62.5) return 'First Quarter';
  if (phase < 87.5) return 'Waxing Gibbous';
  if (phase < 112.5) return 'Full Moon';
  if (phase < 137.5) return 'Waning Gibbous';
  if (phase < 162.5) return 'Last Quarter';
  if (phase < 187.5) return 'Waning Crescent';
  return 'New Moon';
};

// Format time string for display
export const formatAstronomyTime = (timeString) => {
  if (!timeString) return 'N/A';

  try {
    // Handle both HH:MM format and full time strings
    if (timeString.includes(':')) {
      const [hours, minutes] = timeString.split(':').map(Number);
      const date = new Date();
      date.setHours(hours, minutes, 0, 0);

      return date.toLocaleTimeString([], {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } else {
      // If it's already a formatted time string, return as-is
      return timeString;
    }
  } catch (error) {
    console.warn('Error formatting astronomy time:', error);
    return timeString;
  }
};

// Clear astronomy cache
export const clearAstronomyCache = (lat, lng, date = null) => {
  if (lat !== undefined && lng !== undefined) {
    if (date) {
      // Clear cache for specific location and date
      const cacheKey = generateCacheKey(lat, lng, date);
      localStorage.removeItem(cacheKey);
      console.log(`Astronomy cache cleared for ${lat}, ${lng} on ${date.toISOString().split('T')[0]}`);
    } else {
      // Clear all astronomy caches for specific location
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(CACHE_CONFIG.CACHE_PREFIX) &&
            key.includes(`_${Math.round(lat * 1000) / 1000}_${Math.round(lng * 1000) / 1000}_`)) {
          localStorage.removeItem(key);
        }
      });
      console.log(`All astronomy caches cleared for ${lat}, ${lng}`);
    }
  } else {
    // Clear all astronomy caches
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_CONFIG.CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    console.log('All astronomy caches cleared');
  }
};

// Get astronomy cache timestamp
export const getAstronomyCacheTimestamp = (lat, lng, date = new Date()) => {
  try {
    const cacheKey = generateCacheKey(lat, lng, date);
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;

    const { timestamp } = JSON.parse(cached);
    return timestamp;
  } catch {
    return null;
  }
};

// --- CACHE HEALTH MONITORING EXPORTS ---
// Export cache health monitoring functions for use in components
export const getAstronomyCacheHealth = () => {
  try {
    const totalSize = getTotalCacheSize();
    const entries = getCacheEntries();
    const utilizationPercent = (totalSize / CACHE_CONFIG.MAX_TOTAL_CACHE_SIZE) * 100;

    return {
      totalSize,
      totalSizeKB: (totalSize / 1024).toFixed(1),
      maxSize: CACHE_CONFIG.MAX_TOTAL_CACHE_SIZE,
      maxSizeKB: (CACHE_CONFIG.MAX_TOTAL_CACHE_SIZE / 1024).toFixed(1),
      utilizationPercent: utilizationPercent.toFixed(1),
      entryCount: entries.length,
      maxEntries: CACHE_CONFIG.MAX_CACHE_ENTRIES,
      isHealthy: utilizationPercent < 80 && entries.length < CACHE_CONFIG.MAX_CACHE_ENTRIES,
      needsCleanup: utilizationPercent > 90 || entries.length > CACHE_CONFIG.MAX_CACHE_ENTRIES,
      entries: entries.map(entry => ({
        key: entry.key,
        sizeKB: (entry.size / 1024).toFixed(1),
        type: entry.type,
        location: entry.location,
        lastAccessed: new Date(entry.lastAccessed).toLocaleString()
      }))
    };
  } catch (error) {
    console.error('Error getting astronomy cache health:', error);
    return {
      totalSize: 0,
      totalSizeKB: '0.0',
      maxSize: CACHE_CONFIG.MAX_TOTAL_CACHE_SIZE,
      maxSizeKB: (CACHE_CONFIG.MAX_TOTAL_CACHE_SIZE / 1024).toFixed(1),
      utilizationPercent: '0.0',
      entryCount: 0,
      maxEntries: CACHE_CONFIG.MAX_CACHE_ENTRIES,
      isHealthy: true,
      needsCleanup: false,
      entries: [],
      error: error.message
    };
  }
};

// Export cache maintenance function for manual cleanup
export const performAstronomyManualCacheMaintenance = () => {
  return performCacheMaintenance();
};

// Export function to get cache configuration
export const getAstronomyCacheConfig = () => {
  return {
    maxTotalSizeMB: (CACHE_CONFIG.MAX_TOTAL_CACHE_SIZE / (1024 * 1024)).toFixed(1),
    maxEntrySizeMB: (CACHE_CONFIG.MAX_ENTRY_SIZE / (1024 * 1024)).toFixed(1),
    maxEntries: CACHE_CONFIG.MAX_CACHE_ENTRIES,
    compressionThresholdKB: (CACHE_CONFIG.COMPRESSION_THRESHOLD / 1024).toFixed(1)
  };
};
