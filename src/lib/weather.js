// --- STORMGLASS API CONFIGURATION ---
const STORMGLASS_API_KEY = import.meta.env.VITE_STORMGLASS_API_KEY;
const STORMGLASS_BASE_URL = 'https://api.stormglass.io/v2/weather/point';

// Import settings management functions
import { getEffectiveSettings } from './settings';

// Complete list of available Stormglass API parameters
// Based on official Stormglass API documentation
const WEATHER_PARAMS = [
  // Basic atmospheric parameters
  'airTemperature',
  'airTemperature80m',
  'airTemperature100m',
  'airTemperature1000hpa',
  'airTemperature800hpa',
  'airTemperature500hpa',
  'airTemperature200hpa',
  'pressure',
  'cloudCover',
  'humidity',
  'dewPointTemperature',
  'visibility',
  'precipitation',
  'rain',
  'snow',
  'graupel',
  
  // Wind parameters
  'windSpeed',
  'windSpeed20m',
  'windSpeed30m',
  'windSpeed40m',
  'windSpeed50m',
  'windSpeed80m',
  'windSpeed100m',
  'windSpeed1000hpa',
  'windSpeed800hpa',
  'windSpeed500hpa',
  'windSpeed200hpa',
  'windDirection',
  'windDirection20m',
  'windDirection30m',
  'windDirection40m',
  'windDirection50m',
  'windDirection80m',
  'windDirection100m',
  'windDirection1000hpa',
  'windDirection800hpa',
  'windDirection500hpa',
  'windDirection200hpa',
  'gust',
  
  // Wave and marine parameters
  'waveHeight',
  'waveDirection',
  'wavePeriod',
  'windWaveHeight',
  'windWaveDirection',
  'windWavePeriod',
  'swellHeight',
  'swellDirection',
  'swellPeriod',
  'secondarySwellHeight',
  'secondarySwellDirection',
  'secondarySwellPeriod',
  'waterTemperature',
  
  // Current parameters
  'currentSpeed',
  'currentDirection',
  
  // Ice and snow parameters
  'iceCover',
  'snowDepth',
  'snowAlbedo',
  'seaIceThickness',
  'seaLevel'
];

// Core parameters that are most commonly used (for fallback/prioritization)
const CORE_WEATHER_PARAMS = [
  'airTemperature',
  'cloudCover',
  'swellHeight',
  'swellPeriod',
  'waterTemperature',
  'waveHeight',
  'wavePeriod',
  'windWaveHeight',
  'windWavePeriod',
  'windSpeed',
  'humidity',
  'precipitation',
  'pressure',
  'dewPointTemperature',
  'visibility',
  'gust',
  'windDirection'
];

// Parameter validation and mapping system
const PARAMETER_VALIDATION = {
  // Valid parameters from Stormglass API
  validParameters: new Set(WEATHER_PARAMS),
  
  // Parameter aliases/mappings for common variations
  parameterMappings: {
    'temp': 'airTemperature',
    'temperature': 'airTemperature',
    'wind': 'windSpeed',
    'waves': 'waveHeight',
    'swell': 'swellHeight',
    'current': 'currentSpeed'
  },
  
  // Parameter categories for better organization
  categories: {
    atmospheric: ['airTemperature', 'pressure', 'cloudCover', 'humidity', 'dewPointTemperature', 'visibility', 'precipitation', 'rain', 'snow'],
    wind: ['windSpeed', 'windDirection', 'gust'],
    marine: ['waveHeight', 'waveDirection', 'wavePeriod', 'windWaveHeight', 'windWaveDirection', 'windWavePeriod', 'swellHeight', 'swellDirection', 'swellPeriod'],
    current: ['currentSpeed', 'currentDirection'],
    ice: ['iceCover', 'snowDepth', 'seaIceThickness']
  }
};

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
  // Cache entry prefix for weather data
  CACHE_PREFIX: 'weather_',
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

// Get total cache size for weather data
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

// Get all weather cache entries with metadata
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
      console.log(`Evicted cache entry: ${entry.key} (${(entry.size / 1024).toFixed(1)}KB)`);
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
        console.log(`Evicted expired cache entry: ${entry.key}`);
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
        console.log(`Evicted excess cache entry: ${entry.key}`);
      } catch (error) {
        console.warn(`Error removing excess entry ${entry.key}:`, error);
      }
    }
  }
  
  return removedCount;
};

// --- DATA COMPRESSION ---
// Simple compression using JSON optimization
const compressWeatherData = (data) => {
  try {
    // Create a more compact representation
    const compressed = {
      h: data.hours?.map(hour => {
        const compactHour = { t: hour.time };
        
        // Only store the 'sg' values, not the full objects
        for (const [param, value] of Object.entries(hour)) {
          if (param !== 'time' && value && typeof value === 'object' && value.sg !== undefined) {
            compactHour[param] = value.sg;
          }
        }
        
        return compactHour;
      }) || [],
      m: data.meta || null
    };
    
    return compressed;
  } catch (error) {
    console.warn('Error compressing weather data:', error);
    return data;
  }
};

// Decompress weather data back to original format
const decompressWeatherData = (compressed) => {
  try {
    if (!compressed.h) {
      // Data is not compressed, return as-is
      return compressed;
    }
    
    const decompressed = {
      hours: compressed.h.map(hour => {
        const expandedHour = { time: hour.t };
        
        // Restore the object format with 'sg' property
        for (const [param, value] of Object.entries(hour)) {
          if (param !== 't') {
            expandedHour[param] = { sg: value };
          }
        }
        
        return expandedHour;
      }),
      meta: compressed.m
    };
    
    return decompressed;
  } catch (error) {
    console.warn('Error decompressing weather data:', error);
    return compressed;
  }
};

// --- CACHE HEALTH MANAGEMENT ---
// Perform cache maintenance
const performCacheMaintenance = () => {
  try {
    console.log('Starting cache maintenance...');
    
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
      console.log(`Cache maintenance: removed ${lruRemoved} LRU entries`);
    }
    
    const finalSize = getTotalCacheSize();
    const finalEntries = getCacheEntries().length;
    
    console.log(`Cache maintenance completed:
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
    console.error('Error during cache maintenance:', error);
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

/* Mock weather data removed — failures now surface errors to the UI instead of returning mock data. */

// --- STORMGLASS API SERVICE ---
const fetchStormglassData = async (lat, lng) => {
  if (!STORMGLASS_API_KEY) {
    throw new Error('STORMGLASS_API_KEY not found in environment variables');
  }

  // Validate coordinates
  if (typeof lat !== 'number' || typeof lng !== 'number' ||
      lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error('Invalid coordinates provided');
  }

  // Get today's date range (start of day to end of day)
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const params = new URLSearchParams({
    lat: lat.toString(),
    lng: lng.toString(),
    params: WEATHER_PARAMS.join(','),
    start: Math.floor(startOfDay.getTime() / 1000).toString(),
    end: Math.floor(endOfDay.getTime() / 1000).toString()
  });

  const response = await fetch(`${STORMGLASS_BASE_URL}?${params}`, {
    headers: {
      'Authorization': STORMGLASS_API_KEY
    }
  });

  // Handle 402 Payment Required (quota exceeded) specifically
  if (response.status === 402) {
    try {
      const data = await response.json();
      if (data.meta) {
        throw new Error(`API_QUOTA_EXCEEDED:${JSON.stringify(data.meta)}`);
      }
    } catch {
      // If we can't parse the response, create a generic quota exceeded error
      console.warn('Could not parse 402 response, assuming quota exceeded');
    }
    // Generic quota exceeded error when we can't get specific meta data
    throw new Error(`API_QUOTA_EXCEEDED:{"dailyQuota": 10, "requestCount": "unknown"}`);
  }

  if (!response.ok) {
    throw new Error(`Stormglass API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Check if API quota is exceeded via error message
  if (data.errors && data.errors.key === "API quota exceeded" && data.meta) {
    throw new Error(`API_QUOTA_EXCEEDED:${JSON.stringify(data.meta)}`);
  }

  return {
    hours: data.hours,
    meta: data.meta
  };
};

// --- FORECAST DATA FETCH FUNCTION ---
const fetchStormglassForecastData = async (lat, lng, days = 10) => {
  if (!STORMGLASS_API_KEY) {
    throw new Error('STORMGLASS_API_KEY not found in environment variables');
  }

  // Validate coordinates
  if (typeof lat !== 'number' || typeof lng !== 'number' ||
      lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    throw new Error('Invalid coordinates provided');
  }

  // Validate days parameter
  if (typeof days !== 'number' || days < 1 || days > 10) {
    throw new Error('Days parameter must be between 1 and 10');
  }

  // Get forecast date range (today to days ahead)
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endDate = new Date(startOfToday);
  endDate.setDate(endDate.getDate() + days);

  const params = new URLSearchParams({
    lat: lat.toString(),
    lng: lng.toString(),
    params: WEATHER_PARAMS.join(','),
    start: Math.floor(startOfToday.getTime() / 1000).toString(),
    end: Math.floor(endDate.getTime() / 1000).toString()
  });

  const response = await fetch(`${STORMGLASS_BASE_URL}?${params}`, {
    headers: {
      'Authorization': STORMGLASS_API_KEY
    }
  });

  // Handle 402 Payment Required (quota exceeded) specifically
  if (response.status === 402) {
    try {
      const data = await response.json();
      if (data.meta) {
        throw new Error(`API_QUOTA_EXCEEDED:${JSON.stringify(data.meta)}`);
      }
    } catch {
      console.warn('Could not parse 402 response, assuming quota exceeded');
    }
    throw new Error(`API_QUOTA_EXCEEDED:{"dailyQuota": 10, "requestCount": "unknown"}`);
  }

  if (!response.ok) {
    throw new Error(`Stormglass API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Check if API quota is exceeded via error message
  if (data.errors && data.errors.key === "API quota exceeded" && data.meta) {
    throw new Error(`API_QUOTA_EXCEEDED:${JSON.stringify(data.meta)}`);
  }

  return {
    hours: data.hours,
    meta: data.meta
  };
};

// --- CACHE MANAGEMENT FUNCTIONS ---
// Cache refreshes once per calendar day at local midnight
const generateCacheKey = (lat, lng, type = 'current') => {
  // Round to 3 decimal places for cache key (roughly 100m precision)
  const roundedLat = Math.round(lat * 1000) / 1000;
  const roundedLng = Math.round(lng * 1000) / 1000;
  return `weather_${type}_${roundedLat}_${roundedLng}`;
};

const getCachedData = (lat, lng, type = 'current') => {
  try {
    // Perform cache maintenance before reading
    performCacheMaintenance();
    
    const cacheKey = generateCacheKey(lat, lng, type);
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
      const decompressedData = decompressWeatherData(data);
      
      console.log(`Using cached ${type} weather data for ${lat}, ${lng} (cached on ${cacheDate.toLocaleDateString()})`);
      return { data: decompressedData, timestamp };
    } else {
      console.log(`${type} cache expired (cached on ${cacheDate.toLocaleDateString()}, now ${currentDate.toLocaleDateString()}), will fetch fresh data`);
      localStorage.removeItem(cacheKey);
      return null;
    }
  } catch (error) {
    console.warn('Error reading cache:', error);
    const cacheKey = generateCacheKey(lat, lng, type);
    localStorage.removeItem(cacheKey);
    return null;
  }
};

const setCachedData = (data, lat, lng, type = 'current') => {
  try {
    // Perform cache maintenance before writing
    performCacheMaintenance();
    
    const cacheKey = generateCacheKey(lat, lng, type);
    const now = new Date();
    
    // Compress data if it's large enough
    let dataToStore = data;
    const dataString = JSON.stringify(data);
    const dataSize = getStringSize(dataString);
    
    if (dataSize > CACHE_CONFIG.COMPRESSION_THRESHOLD) {
      dataToStore = compressWeatherData(data);
      console.log(`Compressing ${type} data: ${(dataSize / 1024).toFixed(1)}KB -> ${(getStringSize(JSON.stringify(dataToStore)) / 1024).toFixed(1)}KB`);
    }
    
    const cacheObject = {
      data: dataToStore,
      timestamp: now.getTime(),
      lastAccessed: now.getTime(),
      cacheDate: now.toLocaleDateString(),
      location: { lat, lng },
      type: type,
      compressed: dataToStore !== data
    };
    
    const cacheString = JSON.stringify(cacheObject);
    const cacheSize = getStringSize(cacheString);
    
    // Check if this entry is too large
    if (cacheSize > CACHE_CONFIG.MAX_ENTRY_SIZE) {
      console.warn(`Cache entry too large (${(cacheSize / 1024).toFixed(1)}KB), skipping cache for ${cacheKey}`);
      return;
    }
    
    // Check if cache operation is safe
    const safetyCheck = isCacheOperationSafe(cacheSize);
    if (!safetyCheck.safe) {
      console.warn(`Cache operation would exceed quota (${safetyCheck.utilizationPercent.toFixed(1)}%), performing aggressive cleanup`);
      
      // Perform aggressive cleanup
      const targetSize = CACHE_CONFIG.MAX_TOTAL_CACHE_SIZE * 0.5; // Target 50% of max
      evictLRUEntries(targetSize);
      
      // Re-check safety
      const recheckSafety = isCacheOperationSafe(cacheSize);
      if (!recheckSafety.safe) {
        console.warn(`Still unsafe after cleanup, skipping cache for ${cacheKey}`);
        return;
      }
    }
    
    localStorage.setItem(cacheKey, cacheString);
    console.log(`${type} weather data cached successfully for ${lat}, ${lng} (${(cacheSize / 1024).toFixed(1)}KB)`);
    
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
          console.log(`Emergency cleanup: removed ${entries[i].key}`);
        } catch (cleanupError) {
          console.warn(`Error during emergency cleanup:`, cleanupError);
        }
      }
      
      // Try to cache again after cleanup
      try {
        const cacheObject = {
          data: compressWeatherData(data), // Force compression in emergency
          timestamp: Date.now(),
          lastAccessed: Date.now(),
          cacheDate: new Date().toLocaleDateString(),
          location: { lat, lng },
          type: type,
          compressed: true
        };
        
        localStorage.setItem(generateCacheKey(lat, lng, type), JSON.stringify(cacheObject));
        console.log(`${type} weather data cached after emergency cleanup`);
      } catch (retryError) {
        console.error('Failed to cache even after emergency cleanup:', retryError);
      }
    } else {
      console.warn('Error caching data:', error);
    }
  }
};

const getCachedForecastData = (lat, lng) => {
  return getCachedData(lat, lng, 'forecast');
};

const setCachedForecastData = (data, lat, lng) => {
  setCachedData(data, lat, lng, 'forecast');
};

export const clearCache = (lat, lng, type = null) => {
  if (lat !== undefined && lng !== undefined) {
    if (type) {
      // Clear cache for specific location and type
      const cacheKey = generateCacheKey(lat, lng, type);
      localStorage.removeItem(cacheKey);
      console.log(`${type} weather cache cleared for ${lat}, ${lng}`);
    } else {
      // Clear both current and forecast cache for specific location
      const currentKey = generateCacheKey(lat, lng, 'current');
      const forecastKey = generateCacheKey(lat, lng, 'forecast');
      localStorage.removeItem(currentKey);
      localStorage.removeItem(forecastKey);
      console.log(`All weather caches cleared for ${lat}, ${lng}`);
    }
  } else {
    // Clear all weather caches
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('weather_')) {
        localStorage.removeItem(key);
      }
    });
    console.log('All weather caches cleared');
  }
};

export const getCacheTimestamp = (lat, lng, type = 'current') => {
  try {
    const cacheKey = generateCacheKey(lat, lng, type);
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;
    
    const { timestamp } = JSON.parse(cached);
    return timestamp;
  } catch {
    return null;
  }
};

/* Mock forecast generator removed — failures now surface errors to the UI instead of returning generated mock data. */

// --- MAIN FETCH FUNCTION WITH CACHING AND FALLBACK ---
export const fetchWeatherData = async (lat, lng, forceRefresh = false) => {
  // Validate coordinates
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new Error('Invalid coordinates: lat and lng must be numbers');
  }

  // Check cache first unless force refresh is requested
  if (!forceRefresh) {
    const cached = getCachedData(lat, lng);
    if (cached) {
      return cached.data;
    }
  }

  try {
    console.log(`Attempting to fetch live weather data from Stormglass API for ${lat}, ${lng}...`);
    const liveData = await fetchStormglassData(lat, lng);
    console.log('Successfully fetched live weather data');
    
    // Cache the fresh data (now includes both hours and meta)
    setCachedData(liveData, lat, lng);
    
    return liveData;
} catch (error) {
  // Check if this is a quota exceeded error
  if (error.message.startsWith('API_QUOTA_EXCEEDED:')) {
    const metaString = error.message.replace('API_QUOTA_EXCEEDED:', '');
    const quotaMeta = JSON.parse(metaString);
    console.warn('API quota exceeded. Preserving cached data if available.');

    // Try to return cached data without clearing it
    const cached = getCachedData(lat, lng);
    if (cached) {
      // Return cached data but with updated quota meta
      return {
        ...cached.data,
        meta: quotaMeta
      };
    }

    // If no cache available, throw quota exceeded error with meta
    const quotaError = new Error('API quota exceeded');
    quotaError.quotaMeta = quotaMeta;
    throw quotaError;
  }

  // For all other errors, surface them to the caller instead of returning mock data.
  // This makes it clear to the UI that live data could not be fetched.
  console.error('Failed to fetch live weather data:', error);
  throw new Error(`Failed to fetch weather data: ${error.message}`);
}
};

// --- FORECAST FETCH FUNCTION WITH CACHING AND FALLBACK ---
export const fetchForecastData = async (lat, lng, days = 10, forceRefresh = false) => {
  // Validate coordinates
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new Error('Invalid coordinates: lat and lng must be numbers');
  }

  // Validate days parameter
  if (typeof days !== 'number' || days < 1 || days > 10) {
    throw new Error('Days parameter must be between 1 and 10');
  }

  // Check cache first unless force refresh is requested
  if (!forceRefresh) {
    const cached = getCachedForecastData(lat, lng);
    if (cached) {
      return cached.data;
    }
  }

  try {
    console.log(`Attempting to fetch ${days}-day forecast data from Stormglass API for ${lat}, ${lng}...`);
    const liveData = await fetchStormglassForecastData(lat, lng, days);
    console.log('Successfully fetched forecast data');
    
    // Cache the fresh forecast data
    setCachedForecastData(liveData, lat, lng);
    
    return liveData;
} catch (error) {
  // Check if this is a quota exceeded error
  if (error.message.startsWith('API_QUOTA_EXCEEDED:')) {
    const metaString = error.message.replace('API_QUOTA_EXCEEDED:', '');
    const quotaMeta = JSON.parse(metaString);
    console.warn('API quota exceeded for forecast. Preserving cached data if available.');

    // Try to return cached forecast data without clearing it
    const cached = getCachedForecastData(lat, lng);
    if (cached) {
      // Return cached data but with updated quota meta
      return {
        ...cached.data,
        meta: quotaMeta
      };
    }

    // If no cache available, throw quota exceeded error with meta
    const quotaError = new Error('API quota exceeded');
    quotaError.quotaMeta = quotaMeta;
    throw quotaError;
  }

  // For other forecast fetch errors, surface them to the caller instead of returning generated mock data.
  console.error('Failed to fetch forecast data:', error);
  throw new Error(`Failed to fetch forecast data: ${error.message}`);
}
};

// Helper function to get local date string (YYYY-MM-DD) from a Date object
const getLocalDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to get local date string from UTC timestamp
const getLocalDateStringFromUTC = (utcTimeString) => {
  const utcDate = new Date(utcTimeString);
  return getLocalDateString(utcDate);
};

// Filter forecast data by specific date (timezone-aware)
export const filterForecastDataByDate = (forecastData, targetDate) => {
  if (!forecastData || !forecastData.hours) {
    return { hours: [], meta: forecastData?.meta || null };
  }

  // Get target date string in local timezone
  const targetDateStr = getLocalDateString(targetDate);
  
  const filteredHours = forecastData.hours.filter(hour => {
    // Convert UTC hour time to local date string for comparison
    const hourDateStr = getLocalDateStringFromUTC(hour.time);
    return hourDateStr === targetDateStr;
  });

  return {
    hours: filteredHours,
    meta: forecastData.meta
  };
};

// Get available forecast dates from forecast data (timezone-aware)
export const getAvailableForecastDates = (forecastData) => {
  if (!forecastData || !forecastData.hours) {
    return [];
  }

  const dates = new Set();
  forecastData.hours.forEach(hour => {
    // Convert UTC hour time to local date string
    const dateStr = getLocalDateStringFromUTC(hour.time);
    dates.add(dateStr);
  });

  // Convert date strings back to Date objects in local timezone
  return Array.from(dates).sort().map(dateStr => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day); // month is 0-indexed in Date constructor
  });
};

// Check if a date has forecast data available (timezone-aware)
export const isForecastDateAvailable = (forecastData, targetDate) => {
  const availableDates = getAvailableForecastDates(forecastData);
  const targetDateStr = getLocalDateString(targetDate);
  
  return availableDates.some(date =>
    getLocalDateString(date) === targetDateStr
  );
};

// --- RATING LOGIC ---
const normalize = (value, optimal, range) => Math.max(0, 10 - (Math.abs(value - optimal) / range) * 10);
const inverseNormalize = (value, max) => Math.max(0, 10 - (value / max) * 10);

// Parameter validation helper functions
const validateParameter = (paramName) => {
  // Check if parameter is valid
  if (PARAMETER_VALIDATION.validParameters.has(paramName)) {
    return { isValid: true, parameter: paramName };
  }
  
  // Check if parameter has a mapping
  const mappedParam = PARAMETER_VALIDATION.parameterMappings[paramName.toLowerCase()];
  if (mappedParam && PARAMETER_VALIDATION.validParameters.has(mappedParam)) {
    return { isValid: true, parameter: mappedParam, mapped: true, original: paramName };
  }
  
  // Check for similar parameters (fuzzy matching)
  const similarParams = Array.from(PARAMETER_VALIDATION.validParameters).filter(param =>
    param.toLowerCase().includes(paramName.toLowerCase()) ||
    paramName.toLowerCase().includes(param.toLowerCase())
  );
  
  return {
    isValid: false,
    parameter: paramName,
    suggestions: similarParams.slice(0, 3) // Limit to top 3 suggestions
  };
};

const findParameterFallback = (paramName) => {
  // Define fallback mappings for common parameter variations
  const fallbackMappings = {
    'wavePeriod': ['swellPeriod', 'windWavePeriod'],
    'windWaveHeight': ['waveHeight', 'swellHeight'],
    'windWavePeriod': ['wavePeriod', 'swellPeriod'],
    'waveHeight': ['swellHeight', 'windWaveHeight'],
    'swellHeight': ['waveHeight', 'windWaveHeight'],
    'temperature': ['airTemperature', 'waterTemperature'],
    'wind': ['windSpeed'],
    'current': ['currentSpeed'],
    'currentSpeed': ['windSpeed'], // Fallback for current speed when not available
    'currentDirection': ['windDirection'] // Fallback for current direction
  };
  
  const fallbacks = fallbackMappings[paramName] || [];
  return fallbacks.find(fallback => PARAMETER_VALIDATION.validParameters.has(fallback));
};

// Enhanced rating function with comprehensive parameter validation
const rateWithParameters = (data, parameters, returnDetails = false) => {
  const ratings = [];
  const metrics = {};
  const warnings = [];
  const errors = [];
  
  for (const [paramName, paramConfig] of Object.entries(parameters)) {
    // Validate parameter
    const validation = validateParameter(paramName);
    let actualParamName = validation.parameter;
    
    if (!validation.isValid) {
      // Try to find a fallback parameter
      const fallback = findParameterFallback(paramName);
      if (fallback && data[fallback] && data[fallback].sg !== undefined) {
        actualParamName = fallback;
        warnings.push(`Parameter '${paramName}' not available, using fallback '${fallback}'`);
      } else {
        const suggestion = validation.suggestions.length > 0
          ? ` Did you mean: ${validation.suggestions.join(', ')}?`
          : '';
        errors.push(`Parameter '${paramName}' is not available in Stormglass API.${suggestion}`);
        continue;
      }
    } else if (validation.mapped) {
      warnings.push(`Parameter '${validation.original}' mapped to '${actualParamName}'`);
    }
    
    // Check if the parameter exists in the actual weather data
    if (!data[actualParamName] || data[actualParamName].sg === undefined) {
      // Try fallback if main parameter is missing from data
      const fallback = findParameterFallback(actualParamName);
      if (fallback && data[fallback] && data[fallback].sg !== undefined) {
        warnings.push(`Parameter '${actualParamName}' not found in weather data, using '${fallback}'`);
        actualParamName = fallback;
      } else {
        warnings.push(`Parameter '${actualParamName}' not found in weather data - skipping`);
        continue;
      }
    }
    
    const value = data[actualParamName].sg;
    let score = 0;
    
    // Validate parameter configuration
    if (!paramConfig.type || (paramConfig.type !== 'normalize' && paramConfig.type !== 'inverse')) {
      errors.push(`Invalid configuration for parameter '${paramName}': type must be 'normalize' or 'inverse'`);
      continue;
    }
    
    // Calculate score based on configuration type
    try {
      if (paramConfig.type === 'normalize') {
        if (typeof paramConfig.optimal !== 'number' || typeof paramConfig.range !== 'number') {
          errors.push(`Invalid normalize configuration for '${paramName}': optimal and range must be numbers`);
          continue;
        }
        score = normalize(value, paramConfig.optimal, paramConfig.range);
      } else if (paramConfig.type === 'inverse') {
        if (typeof paramConfig.max !== 'number') {
          errors.push(`Invalid inverse configuration for '${paramName}': max must be a number`);
          continue;
        }
        score = inverseNormalize(value, paramConfig.max);
      }
      
      ratings.push(score);
      
      // Store detailed metric information if requested
      if (returnDetails) {
        metrics[paramName] = {
          value: value,
          score: score,
          config: { ...paramConfig },
          actualParameter: actualParamName,
          ...(actualParamName !== paramName && { fallbackUsed: true })
        };
      }
    } catch (error) {
      errors.push(`Error calculating score for '${paramName}': ${error.message}`);
    }
  }
  
  // Log warnings and errors
  if (warnings.length > 0) {
    console.warn('Weather parameter warnings:', warnings);
  }
  if (errors.length > 0) {
    console.error('Weather parameter errors:', errors);
  }
  
  // Calculate average rating
  const averageRating = ratings.length > 0 ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : 0;
  
  // Return detailed breakdown if requested, otherwise just the rating
  if (returnDetails) {
    return {
      rating: averageRating,
      metrics: metrics,
      warnings: warnings,
      errors: errors,
      validParameterCount: ratings.length,
      totalParameterCount: Object.keys(parameters).length
    };
  }
  
  return averageRating;
};

// Updated rating functions that use parameter configurations
const rateSurfing = (d, params, returnDetails = false) => {
  if (params) {
    return rateWithParameters(d, params, returnDetails);
  }
  // Fallback to original hardcoded values
  const rating = (normalize(d.swellHeight.sg, 1.5, 1.5) + normalize(d.swellPeriod.sg, 8, 4) + normalize(d.windSpeed.sg, 3, 5)) / 3;
  
  if (returnDetails) {
    return {
      rating: rating,
      metrics: {
        swellHeight: { value: d.swellHeight.sg, score: normalize(d.swellHeight.sg, 1.5, 1.5), config: { type: 'normalize', optimal: 1.5, range: 1.5 } },
        swellPeriod: { value: d.swellPeriod.sg, score: normalize(d.swellPeriod.sg, 8, 4), config: { type: 'normalize', optimal: 8, range: 4 } },
        windSpeed: { value: d.windSpeed.sg, score: normalize(d.windSpeed.sg, 3, 5), config: { type: 'normalize', optimal: 3, range: 5 } }
      }
    };
  }
  return rating;
};

const rateFishing = (d, params, returnDetails = false) => {
  if (params) {
    return rateWithParameters(d, params, returnDetails);
  }
  // Fallback to original hardcoded values
  const rating = (inverseNormalize(d.windSpeed.sg, 10) + normalize(d.cloudCover.sg, 40, 30)) / 2;
  
  if (returnDetails) {
    return {
      rating: rating,
      metrics: {
        windSpeed: { value: d.windSpeed.sg, score: inverseNormalize(d.windSpeed.sg, 10), config: { type: 'inverse', max: 10 } },
        cloudCover: { value: d.cloudCover.sg, score: normalize(d.cloudCover.sg, 40, 30), config: { type: 'normalize', optimal: 40, range: 30 } }
      }
    };
  }
  return rating;
};

const rateBoating = (d, params, returnDetails = false) => {
  if (params) {
    return rateWithParameters(d, params, returnDetails);
  }
  // Fallback to original hardcoded values
  const rating = (inverseNormalize(d.windSpeed.sg, 12) + inverseNormalize(d.waveHeight.sg, 1)) / 2;
  
  if (returnDetails) {
    return {
      rating: rating,
      metrics: {
        windSpeed: { value: d.windSpeed.sg, score: inverseNormalize(d.windSpeed.sg, 12), config: { type: 'inverse', max: 12 } },
        waveHeight: { value: d.waveHeight.sg, score: inverseNormalize(d.waveHeight.sg, 1), config: { type: 'inverse', max: 1 } }
      }
    };
  }
  return rating;
};

const rateHiking = (d, params, returnDetails = false) => {
  if (params) {
    return rateWithParameters(d, params, returnDetails);
  }
  // Fallback to original hardcoded values
  const rating = (normalize(d.airTemperature.sg, 22, 10) + inverseNormalize(d.windSpeed.sg, 10) + inverseNormalize(d.cloudCover.sg, 80)) / 3;
  
  if (returnDetails) {
    return {
      rating: rating,
      metrics: {
        airTemperature: { value: d.airTemperature.sg, score: normalize(d.airTemperature.sg, 22, 10), config: { type: 'normalize', optimal: 22, range: 10 } },
        windSpeed: { value: d.windSpeed.sg, score: inverseNormalize(d.windSpeed.sg, 10), config: { type: 'inverse', max: 10 } },
        cloudCover: { value: d.cloudCover.sg, score: inverseNormalize(d.cloudCover.sg, 80), config: { type: 'inverse', max: 80 } }
      }
    };
  }
  return rating;
};

const rateCamping = (d, params, returnDetails = false) => {
  if (params) {
    return rateWithParameters(d, params, returnDetails);
  }
  // Fallback to original hardcoded values
  const rating = (normalize(d.airTemperature.sg, 20, 10) + inverseNormalize(d.windSpeed.sg, 8) + inverseNormalize(d.cloudCover.sg, 90)) / 3;
  
  if (returnDetails) {
    return {
      rating: rating,
      metrics: {
        airTemperature: { value: d.airTemperature.sg, score: normalize(d.airTemperature.sg, 20, 10), config: { type: 'normalize', optimal: 20, range: 10 } },
        windSpeed: { value: d.windSpeed.sg, score: inverseNormalize(d.windSpeed.sg, 8), config: { type: 'inverse', max: 8 } },
        cloudCover: { value: d.cloudCover.sg, score: inverseNormalize(d.cloudCover.sg, 90), config: { type: 'inverse', max: 90 } }
      }
    };
  }
  return rating;
};

const rateBeachDay = (d, params, returnDetails = false) => {
  if (params) {
    return rateWithParameters(d, params, returnDetails);
  }
  // Fallback to original hardcoded values
  const rating = (normalize(d.airTemperature.sg, 28, 8) + normalize(d.windSpeed.sg, 4, 6) + normalize(d.cloudCover.sg, 15, 20)) / 3;
  
  if (returnDetails) {
    return {
      rating: rating,
      metrics: {
        airTemperature: { value: d.airTemperature.sg, score: normalize(d.airTemperature.sg, 28, 8), config: { type: 'normalize', optimal: 28, range: 8 } },
        windSpeed: { value: d.windSpeed.sg, score: normalize(d.windSpeed.sg, 4, 6), config: { type: 'normalize', optimal: 4, range: 6 } },
        cloudCover: { value: d.cloudCover.sg, score: normalize(d.cloudCover.sg, 15, 20), config: { type: 'normalize', optimal: 15, range: 20 } }
      }
    };
  }
  return rating;
};

const rateKayaking = (d, params, returnDetails = false) => {
  if (params) {
    return rateWithParameters(d, params, returnDetails);
  }
  // Fallback to original hardcoded values
  const rating = (inverseNormalize(d.windSpeed.sg, 6) + inverseNormalize(d.waveHeight.sg, 0.5)) / 2;
  
  if (returnDetails) {
    return {
      rating: rating,
      metrics: {
        windSpeed: { value: d.windSpeed.sg, score: inverseNormalize(d.windSpeed.sg, 6), config: { type: 'inverse', max: 6 } },
        waveHeight: { value: d.waveHeight.sg, score: inverseNormalize(d.waveHeight.sg, 0.5), config: { type: 'inverse', max: 0.5 } }
      }
    };
  }
  return rating;
};

const rateSnorkeling = (d, params, returnDetails = false) => {
  if (params) {
    return rateWithParameters(d, params, returnDetails);
  }
  // Fallback to original hardcoded values
  const rating = (normalize(d.waterTemperature.sg, 26, 6) + inverseNormalize(d.waveHeight.sg, 0.3)) / 2;
  
  if (returnDetails) {
    return {
      rating: rating,
      metrics: {
        waterTemperature: { value: d.waterTemperature.sg, score: normalize(d.waterTemperature.sg, 26, 6), config: { type: 'normalize', optimal: 26, range: 6 } },
        waveHeight: { value: d.waveHeight.sg, score: inverseNormalize(d.waveHeight.sg, 0.3), config: { type: 'inverse', max: 0.3 } }
      }
    };
  }
  return rating;
};

// Map of activity names to rating functions
const ACTIVITY_RATING_FUNCTIONS = {
  'Surfing': rateSurfing,
  'Fishing': rateFishing,
  'Boating': rateBoating,
  'Hiking': rateHiking,
  'Camping': rateCamping,
  'Beach Day': rateBeachDay,
  'Kayaking': rateKayaking,
  'Snorkeling': rateSnorkeling
};

// --- Main Calculation Function - MODIFIED ---
// This now processes an array of hourly data and returns ratings for each hour.
export const calculateAllHourlyRatings = (hourlyData) => {
  // Get effective settings (defaults merged with user preferences)
  const settings = getEffectiveSettings();
  
  // Use the activity list from settings
  const activityList = settings.activities || Object.keys(ACTIVITY_RATING_FUNCTIONS);

  const masterRatings = {};
  for (const activityName of activityList) {
    // Choose a rating function: specific one if available, otherwise generic fallback
    const ratingFunction = ACTIVITY_RATING_FUNCTIONS[activityName]
      ? ACTIVITY_RATING_FUNCTIONS[activityName]
      : (d, params) => rateWithParameters(d, params || {});
    
    // Get parameter configuration for this activity (may be empty {})
    const activityParams = settings.activityParameters?.[activityName] || {};
    
    masterRatings[activityName] = hourlyData.map(hourData => ({
        time: hourData.time,
        rating: ratingFunction(hourData, activityParams)
    }));
  }
  return masterRatings;
};

// --- Enhanced Calculation Function with Detailed Metrics ---
// This function returns detailed metric breakdowns for each hour
export const calculateAllHourlyRatingsWithDetails = (hourlyData) => {
  // Get effective settings (defaults merged with user preferences)
  const settings = getEffectiveSettings();
  
  // Use the activity list from settings
  const activityList = settings.activities || Object.keys(ACTIVITY_RATING_FUNCTIONS);

  const masterRatings = {};
  for (const activityName of activityList) {
    // Choose a rating function: specific one if available, otherwise generic fallback
    const ratingFunction = ACTIVITY_RATING_FUNCTIONS[activityName]
      ? ACTIVITY_RATING_FUNCTIONS[activityName]
      : (d, params, returnDetails) => rateWithParameters(d, params || {}, returnDetails);
    
    // Get parameter configuration for this activity (may be empty {})
    const activityParams = settings.activityParameters?.[activityName] || {};
    
    masterRatings[activityName] = hourlyData.map(hourData => {
      const result = ratingFunction(hourData, activityParams, true);
      return {
        time: hourData.time,
        rating: result.rating || result, // Handle both detailed and simple returns
        metrics: result.metrics || {}
      };
    });
  }
  return masterRatings;
};

// --- CURRENT WEATHER EXTRACTION ---
// Function to get current weather data (first hour of the day or closest to current time)
export const getCurrentWeatherData = (hourlyData) => {
  if (!hourlyData || hourlyData.length === 0) return null;
  
  const now = new Date();
  const currentHour = now.getHours();
  
  // Find the closest hour to current time, or use first available hour
  let closestHour = hourlyData[0];
  let minDiff = Infinity;
  
  for (const hour of hourlyData) {
    const hourTime = new Date(hour.time);
    const hourOfDay = hourTime.getHours();
    const diff = Math.abs(hourOfDay - currentHour);
    
    if (diff < minDiff) {
      minDiff = diff;
      closestHour = hour;
    }
  }
  
  return closestHour;
};

// --- UTILITY FUNCTIONS FOR WEATHER DISPLAY ---
export const calculateFeelsLike = (temp, humidity) => {
  // Simple heat index calculation for "feels like" temperature
  if (temp < 27) return temp; // Below 80°F, feels like equals actual temp
  
  const rh = humidity;
  const t = temp;
  
  // Simplified heat index formula
  const hi = -8.78469475556 +
             1.61139411 * t +
             2.33854883889 * rh +
             -0.14611605 * t * rh +
             -0.012308094 * t * t +
             -0.0164248277778 * rh * rh +
             0.002211732 * t * t * rh +
             0.00072546 * t * rh * rh +
             -0.000003582 * t * t * rh * rh;
  
  return Math.round(hi);
};

export const getWindDirection = (degrees) => {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
};

export const getPrecipitationChance = (precipitation, cloudCover) => {
  // Estimate precipitation chance based on precipitation amount and cloud cover
  if (precipitation > 0.5) return Math.min(90, 60 + cloudCover * 0.3);
  if (precipitation > 0.1) return Math.min(70, 30 + cloudCover * 0.4);
  if (cloudCover > 70) return Math.min(40, cloudCover * 0.4);
  if (cloudCover > 40) return Math.min(20, cloudCover * 0.2);
  return Math.max(0, cloudCover * 0.1);
};

// --- CACHE HEALTH MONITORING EXPORTS ---
// Export cache health monitoring functions for use in components
export const getCacheHealth = () => {
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
    console.error('Error getting cache health:', error);
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
export const performManualCacheMaintenance = () => {
  return performCacheMaintenance();
};

// Export function to get cache configuration
export const getCacheConfig = () => {
  return {
    maxTotalSizeMB: (CACHE_CONFIG.MAX_TOTAL_CACHE_SIZE / (1024 * 1024)).toFixed(1),
    maxEntrySizeMB: (CACHE_CONFIG.MAX_ENTRY_SIZE / (1024 * 1024)).toFixed(1),
    maxEntries: CACHE_CONFIG.MAX_CACHE_ENTRIES,
    compressionThresholdKB: (CACHE_CONFIG.COMPRESSION_THRESHOLD / 1024).toFixed(1)
  };
};