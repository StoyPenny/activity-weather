// --- NOAA TIDE API CONFIGURATION ---
const NOAA_BASE_URL = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';

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
  // Cache entry prefix for tide data
  CACHE_PREFIX: 'tides_',
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

// Get total cache size for tide data
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

// Get all tide cache entries with metadata
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
      console.log(`Evicted tide cache entry: ${entry.key} (${(entry.size / 1024).toFixed(1)}KB)`);
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
        console.log(`Evicted expired tide cache entry: ${entry.key}`);
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
        console.log(`Evicted excess tide cache entry: ${entry.key}`);
      } catch (error) {
        console.warn(`Error removing excess entry ${entry.key}:`, error);
      }
    }
  }

  return removedCount;
};

// --- DATA COMPRESSION ---
// Simple compression using JSON optimization
const compressTideData = (data) => {
  try {
    // Create a more compact representation
    const compressed = {
      p: data.predictions?.map(pred => ({
        t: pred.t,
        v: pred.v,
        type: pred.type
      })) || [],
      m: data.metadata || null,
      d: data.disclaimer || null
    };

    return compressed;
  } catch (error) {
    console.warn('Error compressing tide data:', error);
    return data;
  }
};

// Decompress tide data back to original format
const decompressTideData = (compressed) => {
  try {
    if (!compressed.p) {
      // Data is not compressed, return as-is
      return compressed;
    }

    const decompressed = {
      predictions: compressed.p.map(pred => ({
        t: pred.t,
        v: pred.v,
        type: pred.type
      })),
      metadata: compressed.m,
      disclaimer: compressed.d
    };

    return decompressed;
  } catch (error) {
    console.warn('Error decompressing tide data:', error);
    return compressed;
  }
};

// --- CACHE HEALTH MANAGEMENT ---
// Perform cache maintenance
const performCacheMaintenance = () => {
  try {
    console.log('Starting tide cache maintenance...');

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
      console.log(`Tide cache maintenance: removed ${lruRemoved} LRU entries`);
    }

    const finalSize = getTotalCacheSize();
    const finalEntries = getCacheEntries().length;

    console.log(`Tide cache maintenance completed:
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
    console.error('Error during tide cache maintenance:', error);
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

// --- STATION LOOKUP ---
// Find nearest NOAA tide station to given coordinates
const findNearestTideStation = async (lat, lng) => {
  // NOAA station search API
  const stationUrl = 'https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/stations.json';

  const params = new URLSearchParams({
    type: 'tidepredictions',
    units: 'english'
  });

  try {
    const response = await fetch(`${stationUrl}?${params}`);
    if (!response.ok) {
      throw new Error(`NOAA station API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const stations = data.stations || [];

    // Find nearest station using Haversine distance
    let nearestStation = null;
    let minDistance = Infinity;

    for (const station of stations) {
      if (station.lat && station.lng) {
        const distance = calculateDistance(lat, lng, parseFloat(station.lat), parseFloat(station.lng));
        if (distance < minDistance) {
          minDistance = distance;
          nearestStation = station;
        }
      }
    }

    if (!nearestStation) {
      throw new Error('No tide stations found near the specified location');
    }

    console.log(`Found nearest tide station: ${nearestStation.name} (${nearestStation.id}) - ${minDistance.toFixed(1)}km away`);
    return nearestStation;

  } catch (error) {
    console.warn('Error finding tide station:', error);
    throw error;
  }
};

// Haversine distance calculation
const calculateDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// --- NOAA TIDE API SERVICE ---
const fetchTideData = async (stationId, date = new Date()) => {
  // Validate station ID
  if (!stationId || typeof stationId !== 'string') {
    throw new Error('Invalid station ID provided');
  }

  // Format date range (start of day to end of day)
  const startDate = new Date(date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date(date);
  endDate.setHours(23, 59, 59, 999);

  const beginDate = startDate.toISOString().split('T')[0].replace(/-/g, '');
  const endDateStr = endDate.toISOString().split('T')[0].replace(/-/g, '');

  const params = new URLSearchParams({
    product: 'predictions',
    application: 'NOS.COOPS.TAC.WL',
    begin_date: beginDate,
    end_date: endDateStr,
    datum: 'MLLW',
    station: stationId,
    time_zone: 'lst_ldt',
    units: 'english',
    format: 'json'
  });

  const response = await fetch(`${NOAA_BASE_URL}?${params}`);

  if (!response.ok) {
    console.error(`NOAA Tide API error: ${response.status} ${response.statusText}`);
    throw new Error(`NOAA Tide API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log('NOAA Tide API Response:', data);

  // Transform the data to a more usable format
  const transformedData = {
    date: date.toISOString().split('T')[0],
    station: {
      id: stationId,
      name: data.metadata?.name || 'Unknown Station',
      lat: data.metadata?.lat || null,
      lng: data.metadata?.lng || null
    },
    predictions: data.predictions || [],
    metadata: data.metadata || null,
    disclaimer: data.disclaimer || null,
    raw: data
  };

  return transformedData;
};

// --- CACHE MANAGEMENT FUNCTIONS ---
// Cache refreshes once per calendar day at local midnight
const generateCacheKey = (stationId, date) => {
  const dateStr = date.toISOString().split('T')[0];
  return `tides_${stationId}_${dateStr}`;
};

const getCachedData = (stationId, date = new Date()) => {
  try {
    // Perform cache maintenance before reading
    performCacheMaintenance();

    const cacheKey = generateCacheKey(stationId, date);
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
      const decompressedData = decompressTideData(data);

      console.log(`Using cached tide data for station ${stationId} on ${date.toISOString().split('T')[0]} (cached on ${cacheDate.toLocaleDateString()})`);
      return { data: decompressedData, timestamp };
    } else {
      console.log(`Tide cache expired (cached on ${cacheDate.toLocaleDateString()}, now ${currentDate.toLocaleDateString()}), will fetch fresh data`);
      localStorage.removeItem(cacheKey);
      return null;
    }
  } catch (error) {
    console.warn('Error reading tide cache:', error);
    const cacheKey = generateCacheKey(stationId, date);
    localStorage.removeItem(cacheKey);
    return null;
  }
};

const setCachedData = (data, stationId, date = new Date()) => {
  try {
    // Perform cache maintenance before writing
    performCacheMaintenance();

    const cacheKey = generateCacheKey(stationId, date);
    const now = new Date();

    // Compress data if it's large enough
    let dataToStore = data;
    const dataString = JSON.stringify(data);
    const dataSize = getStringSize(dataString);

    if (dataSize > CACHE_CONFIG.COMPRESSION_THRESHOLD) {
      dataToStore = compressTideData(data);
      console.log(`Compressing tide data: ${(dataSize / 1024).toFixed(1)}KB -> ${(getStringSize(JSON.stringify(dataToStore)) / 1024).toFixed(1)}KB`);
    }

    const cacheObject = {
      data: dataToStore,
      timestamp: now.getTime(),
      lastAccessed: now.getTime(),
      cacheDate: now.toLocaleDateString(),
      stationId: stationId,
      date: date.toISOString().split('T')[0],
      compressed: dataToStore !== data
    };

    const cacheString = JSON.stringify(cacheObject);
    const cacheSize = getStringSize(cacheString);

    // Check if this entry is too large
    if (cacheSize > CACHE_CONFIG.MAX_ENTRY_SIZE) {
      console.warn(`Tide cache entry too large (${(cacheSize / 1024).toFixed(1)}KB), skipping cache for ${cacheKey}`);
      return;
    }

    // Check if cache operation is safe
    const safetyCheck = isCacheOperationSafe(cacheSize);
    if (!safetyCheck.safe) {
      console.warn(`Tide cache operation would exceed quota (${safetyCheck.utilizationPercent.toFixed(1)}%), performing aggressive cleanup`);

      // Perform aggressive cleanup
      const targetSize = CACHE_CONFIG.MAX_TOTAL_CACHE_SIZE * 0.5; // Target 50% of max
      evictLRUEntries(targetSize);

      // Re-check safety
      const recheckSafety = isCacheOperationSafe(cacheSize);
      if (!recheckSafety.safe) {
        console.warn(`Still unsafe after cleanup, skipping tide cache for ${cacheKey}`);
        return;
      }
    }

    localStorage.setItem(cacheKey, cacheString);
    console.log(`Tide data cached successfully for station ${stationId} on ${date.toISOString().split('T')[0]} (${(cacheSize / 1024).toFixed(1)}KB)`);

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
          console.log(`Emergency cleanup: removed tide cache entry ${entries[i].key}`);
        } catch (cleanupError) {
          console.warn(`Error during emergency cleanup:`, cleanupError);
        }
      }

      // Try to cache again after cleanup
      try {
        const cacheObject = {
          data: compressTideData(data), // Force compression in emergency
          timestamp: Date.now(),
          lastAccessed: Date.now(),
          cacheDate: new Date().toLocaleDateString(),
          stationId: stationId,
          date: date.toISOString().split('T')[0],
          compressed: true
        };

        localStorage.setItem(generateCacheKey(stationId, date), JSON.stringify(cacheObject));
        console.log(`Tide data cached after emergency cleanup`);
      } catch (retryError) {
        console.error('Failed to cache tide data even after emergency cleanup:', retryError);
      }
    } else {
      console.warn('Error caching tide data:', error);
    }
  }
};

// --- MAIN FETCH FUNCTION WITH CACHING AND FALLBACK ---
export const fetchTideDataCached = async (lat, lng, date = new Date(), forceRefresh = false) => {
  // Validate coordinates
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new Error('Invalid coordinates: lat and lng must be numbers');
  }

  try {
    // First, find the nearest tide station
    console.log(`Finding nearest tide station for ${lat}, ${lng}...`);
    const station = await findNearestTideStation(lat, lng);
    const stationId = station.id;

    // Check cache first unless force refresh is requested
    if (!forceRefresh) {
      const cached = getCachedData(stationId, date);
      if (cached) {
        return { ...cached.data, station };
      }
    }

    // Fetch fresh data
    console.log(`Attempting to fetch tide data from NOAA API for station ${stationId} on ${date.toISOString().split('T')[0]}...`);
    const liveData = await fetchTideData(stationId, date);
    console.log('Successfully fetched tide data');

    // Cache the fresh data
    setCachedData(liveData, stationId, date);

    return liveData;
  } catch (error) {
    console.warn('Failed to fetch tide data:', error.message);
    // Return a basic structure with null values
    return {
      date: date.toISOString().split('T')[0],
      station: {
        id: null,
        name: 'No station found',
        lat: lat,
        lng: lng
      },
      predictions: [],
      metadata: null,
      disclaimer: null,
      error: error.message
    };
  }
};

// --- UTILITY FUNCTIONS ---
// Get tide type description
export const getTideTypeDescription = (type) => {
  switch (type) {
    case 'H': return 'High Tide';
    case 'L': return 'Low Tide';
    case 'h': return 'Higher High Tide';
    case 'l': return 'Lower Low Tide';
    default: return 'Tide';
  }
};

// Format tide time for display
export const formatTideTime = (timeString) => {
  if (!timeString) return 'N/A';

  try {
    // NOAA returns time in ISO format like "2025-01-15 08:45"
    const date = new Date(timeString.replace(' ', 'T'));

    return date.toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.warn('Error formatting tide time:', error);
    return timeString;
  }
};

// Get next tide events
export const getNextTideEvents = (tideData, count = 4) => {
  if (!tideData || !tideData.predictions || tideData.predictions.length === 0) {
    return [];
  }

  const now = new Date();
  const futureTides = tideData.predictions
    .filter(prediction => new Date(prediction.t) > now)
    .sort((a, b) => new Date(a.t) - new Date(b.t))
    .slice(0, count);

  return futureTides.map(tide => ({
    time: tide.t,
    height: parseFloat(tide.v),
    type: tide.type,
    description: getTideTypeDescription(tide.type)
  }));
};

// Get current tide status
export const getCurrentTideStatus = (tideData) => {
  if (!tideData || !tideData.predictions || tideData.predictions.length === 0) {
    return null;
  }

  const now = new Date();
  const sortedPredictions = tideData.predictions
    .map(pred => ({ ...pred, time: new Date(pred.t) }))
    .sort((a, b) => a.time - b.time);

  // Find the most recent tide and the next one
  let lastTide = null;
  let nextTide = null;

  for (const tide of sortedPredictions) {
    if (tide.time <= now) {
      lastTide = tide;
    } else {
      nextTide = tide;
      break;
    }
  }

  if (!lastTide || !nextTide) {
    return null;
  }

  const timeDiff = nextTide.time - lastTide.time;
  const elapsed = now - lastTide.time;
  const progress = elapsed / timeDiff;

  return {
    currentHeight: lastTide.height + (nextTide.height - lastTide.height) * progress,
    lastTide: {
      time: lastTide.t,
      height: parseFloat(lastTide.v),
      type: lastTide.type,
      description: getTideTypeDescription(lastTide.type)
    },
    nextTide: {
      time: nextTide.t,
      height: parseFloat(nextTide.v),
      type: nextTide.type,
      description: getTideTypeDescription(nextTide.type)
    },
    trend: nextTide.height > lastTide.height ? 'rising' : 'falling',
    progress: Math.min(100, Math.max(0, progress * 100))
  };
};

// Clear tide cache
export const clearTideCache = (stationId = null, date = null) => {
  if (stationId && date) {
    // Clear cache for specific station and date
    const cacheKey = generateCacheKey(stationId, date);
    localStorage.removeItem(cacheKey);
    console.log(`Tide cache cleared for station ${stationId} on ${date.toISOString().split('T')[0]}`);
  } else if (stationId) {
    // Clear all caches for specific station
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_CONFIG.CACHE_PREFIX) && key.includes(`_${stationId}_`)) {
        localStorage.removeItem(key);
      }
    });
    console.log(`All tide caches cleared for station ${stationId}`);
  } else {
    // Clear all tide caches
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(CACHE_CONFIG.CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
    console.log('All tide caches cleared');
  }
};

// Get tide cache timestamp
export const getTideCacheTimestamp = (stationId, date = new Date()) => {
  try {
    const cacheKey = generateCacheKey(stationId, date);
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
export const getTideCacheHealth = () => {
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
    console.error('Error getting tide cache health:', error);
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
export const performTideManualCacheMaintenance = () => {
  return performCacheMaintenance();
};

// Export function to get cache configuration
export const getTideCacheConfig = () => {
  return {
    maxTotalSizeMB: (CACHE_CONFIG.MAX_TOTAL_CACHE_SIZE / (1024 * 1024)).toFixed(1),
    maxEntrySizeMB: (CACHE_CONFIG.MAX_ENTRY_SIZE / (1024 * 1024)).toFixed(1),
    maxEntries: CACHE_CONFIG.MAX_CACHE_ENTRIES,
    compressionThresholdKB: (CACHE_CONFIG.COMPRESSION_THRESHOLD / 1024).toFixed(1)
  };
};
