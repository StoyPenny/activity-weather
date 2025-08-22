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

// Helper function to check if two dates are the same calendar day (local timezone)
const isSameCalendarDay = (date1, date2) => {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
};

// --- MOCK DATA SERVICE (FALLBACK) ---
// This now includes data for multiple hours to simulate a daily forecast.
const mockWeatherData = {
  hours: [
    // Morning (Cooler, calmer)
    {
      time: '2025-08-16T08:00:00+00:00',
      airTemperature: { sg: 22 }, cloudCover: { sg: 10 }, swellHeight: { sg: 1.2 }, swellPeriod: { sg: 8 },
      waterTemperature: { sg: 23 }, waveHeight: { sg: 0.8 }, wavePeriod: { sg: 7.5 }, waveDirection: { sg: 180 },
      windWaveHeight: { sg: 0.5 }, windWavePeriod: { sg: 6 }, windWaveDirection: { sg: 185 },
      windSpeed: { sg: 2 }, humidity: { sg: 65 }, precipitation: { sg: 0 }, pressure: { sg: 1015 },
      dewPointTemperature: { sg: 15 }, visibility: { sg: 10 }, gust: { sg: 3 }, windDirection: { sg: 180 }
    },
    {
      time: '2025-08-16T09:00:00+00:00',
      airTemperature: { sg: 23 }, cloudCover: { sg: 15 }, swellHeight: { sg: 1.3 }, swellPeriod: { sg: 8 },
      waterTemperature: { sg: 23 }, waveHeight: { sg: 0.9 }, wavePeriod: { sg: 7.8 }, waveDirection: { sg: 185 },
      windWaveHeight: { sg: 0.6 }, windWavePeriod: { sg: 6.2 }, windWaveDirection: { sg: 190 },
      windSpeed: { sg: 3 }, humidity: { sg: 62 }, precipitation: { sg: 0 }, pressure: { sg: 1014 },
      dewPointTemperature: { sg: 16 }, visibility: { sg: 10 }, gust: { sg: 4 }, windDirection: { sg: 185 }
    },
    {
      time: '2025-08-16T10:00:00+00:00',
      airTemperature: { sg: 25 }, cloudCover: { sg: 20 }, swellHeight: { sg: 1.5 }, swellPeriod: { sg: 7.5 },
      waterTemperature: { sg: 24 }, waveHeight: { sg: 1.1 }, wavePeriod: { sg: 8.0 }, waveDirection: { sg: 190 },
      windWaveHeight: { sg: 0.7 }, windWavePeriod: { sg: 6.5 }, windWaveDirection: { sg: 195 },
      windSpeed: { sg: 4 }, humidity: { sg: 58 }, precipitation: { sg: 0 }, pressure: { sg: 1013 },
      dewPointTemperature: { sg: 17 }, visibility: { sg: 10 }, gust: { sg: 5 }, windDirection: { sg: 190 }
    },
    {
      time: '2025-08-16T11:00:00+00:00',
      airTemperature: { sg: 26 }, cloudCover: { sg: 25 }, swellHeight: { sg: 1.8 }, swellPeriod: { sg: 7 },
      waterTemperature: { sg: 24 }, waveHeight: { sg: 1.2 }, wavePeriod: { sg: 8.2 }, waveDirection: { sg: 195 },
      windWaveHeight: { sg: 0.8 }, windWavePeriod: { sg: 6.8 }, windWaveDirection: { sg: 200 },
      windSpeed: { sg: 5 }, humidity: { sg: 55 }, precipitation: { sg: 0 }, pressure: { sg: 1012 },
      dewPointTemperature: { sg: 17 }, visibility: { sg: 9 }, gust: { sg: 6 }, windDirection: { sg: 195 }
    },
    // Midday (Hottest, wind picks up)
    {
      time: '2025-08-16T12:00:00+00:00',
      airTemperature: { sg: 28 }, cloudCover: { sg: 30 }, swellHeight: { sg: 2.0 }, swellPeriod: { sg: 6.5 },
      waterTemperature: { sg: 25 }, waveHeight: { sg: 1.5 }, wavePeriod: { sg: 8.5 }, waveDirection: { sg: 200 },
      windWaveHeight: { sg: 1.0 }, windWavePeriod: { sg: 7.0 }, windWaveDirection: { sg: 205 },
      windSpeed: { sg: 6 }, humidity: { sg: 52 }, precipitation: { sg: 0 }, pressure: { sg: 1011 },
      dewPointTemperature: { sg: 18 }, visibility: { sg: 8 }, gust: { sg: 8 }, windDirection: { sg: 200 }
    },
    {
      time: '2025-08-16T13:00:00+00:00',
      airTemperature: { sg: 29 }, cloudCover: { sg: 40 }, swellHeight: { sg: 2.1 }, swellPeriod: { sg: 6 },
      waterTemperature: { sg: 25 }, waveHeight: { sg: 1.6 }, wavePeriod: { sg: 8.8 }, waveDirection: { sg: 205 },
      windWaveHeight: { sg: 1.1 }, windWavePeriod: { sg: 7.2 }, windWaveDirection: { sg: 210 },
      windSpeed: { sg: 7 }, humidity: { sg: 50 }, precipitation: { sg: 0.1 }, pressure: { sg: 1010 },
      dewPointTemperature: { sg: 18 }, visibility: { sg: 7 }, gust: { sg: 9 }, windDirection: { sg: 205 }
    },
    {
      time: '2025-08-16T14:00:00+00:00',
      airTemperature: { sg: 29 }, cloudCover: { sg: 50 }, swellHeight: { sg: 2.0 }, swellPeriod: { sg: 6 },
      waterTemperature: { sg: 25 }, waveHeight: { sg: 1.5 }, wavePeriod: { sg: 9.0 }, waveDirection: { sg: 210 },
      windWaveHeight: { sg: 1.0 }, windWavePeriod: { sg: 7.0 }, windWaveDirection: { sg: 215 },
      windSpeed: { sg: 7 }, humidity: { sg: 48 }, precipitation: { sg: 0.2 }, pressure: { sg: 1009 },
      dewPointTemperature: { sg: 17 }, visibility: { sg: 6 }, gust: { sg: 9 }, windDirection: { sg: 210 }
    },
    // Afternoon (Clouds increase, wind may drop)
    {
      time: '2025-08-16T15:00:00+00:00',
      airTemperature: { sg: 28 }, cloudCover: { sg: 60 }, swellHeight: { sg: 1.9 }, swellPeriod: { sg: 6.5 },
      waterTemperature: { sg: 25 }, waveHeight: { sg: 1.4 }, wavePeriod: { sg: 8.5 }, waveDirection: { sg: 215 },
      windWaveHeight: { sg: 0.9 }, windWavePeriod: { sg: 6.8 }, windWaveDirection: { sg: 220 },
      windSpeed: { sg: 6 }, humidity: { sg: 55 }, precipitation: { sg: 0.3 }, pressure: { sg: 1010 },
      dewPointTemperature: { sg: 19 }, visibility: { sg: 5 }, gust: { sg: 7 }, windDirection: { sg: 215 }
    },
    {
      time: '2025-08-16T16:00:00+00:00',
      airTemperature: { sg: 27 }, cloudCover: { sg: 55 }, swellHeight: { sg: 1.8 }, swellPeriod: { sg: 7 },
      waterTemperature: { sg: 24 }, waveHeight: { sg: 1.3 }, wavePeriod: { sg: 8.2 }, waveDirection: { sg: 220 },
      windWaveHeight: { sg: 0.8 }, windWavePeriod: { sg: 6.5 }, windWaveDirection: { sg: 225 },
      windSpeed: { sg: 5 }, humidity: { sg: 60 }, precipitation: { sg: 0.1 }, pressure: { sg: 1011 },
      dewPointTemperature: { sg: 19 }, visibility: { sg: 6 }, gust: { sg: 6 }, windDirection: { sg: 220 }
    },
    {
      time: '2025-08-16T17:00:00+00:00',
      airTemperature: { sg: 26 }, cloudCover: { sg: 45 }, swellHeight: { sg: 1.6 }, swellPeriod: { sg: 7.5 },
      waterTemperature: { sg: 24 }, waveHeight: { sg: 1.1 }, wavePeriod: { sg: 8.0 }, waveDirection: { sg: 225 },
      windWaveHeight: { sg: 0.7 }, windWavePeriod: { sg: 6.2 }, windWaveDirection: { sg: 230 },
      windSpeed: { sg: 4 }, humidity: { sg: 65 }, precipitation: { sg: 0 }, pressure: { sg: 1012 },
      dewPointTemperature: { sg: 19 }, visibility: { sg: 8 }, gust: { sg: 5 }, windDirection: { sg: 225 }
    },
  ],
};

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
    const cacheKey = generateCacheKey(lat, lng, type);
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    const cacheDate = new Date(timestamp);
    const currentDate = new Date();
    
    // Check if cache is from the same calendar day (local timezone)
    // Cache expires at midnight and refreshes for the new day
    if (isSameCalendarDay(cacheDate, currentDate)) {
      console.log(`Using cached ${type} weather data for ${lat}, ${lng} (cached on ${cacheDate.toLocaleDateString()})`);
      return { data, timestamp };
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
    const cacheKey = generateCacheKey(lat, lng, type);
    const now = new Date();
    const cacheObject = {
      data,
      timestamp: now.getTime(), // Store timestamp for date comparison
      cacheDate: now.toLocaleDateString(), // Human-readable cache date for debugging
      location: { lat, lng },
      type: type
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheObject));
    console.log(`${type} weather data cached successfully for ${lat}, ${lng} on ${now.toLocaleDateString()}`);
  } catch (error) {
    console.warn('Error caching data:', error);
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

// --- UTILITY FUNCTIONS FOR FORECAST DATA ---
// Generate mock forecast data for multiple days
const generateMockForecastData = (days) => {
  const mockHours = [];
  const baseDate = new Date();
  
  for (let day = 0; day < days; day++) {
    for (let hour = 0; hour < 24; hour++) {
      const currentDate = new Date(baseDate);
      currentDate.setDate(currentDate.getDate() + day);
      currentDate.setHours(hour, 0, 0, 0);
      
      // Vary conditions slightly for each day and hour
      const dayVariation = Math.sin(day * 0.5) * 3; // Slight variation across days
      const hourVariation = Math.sin(hour * 0.26) * 5; // Variation across hours of day
      
      mockHours.push({
        time: currentDate.toISOString(),
        airTemperature: { sg: 22 + dayVariation + hourVariation },
        cloudCover: { sg: Math.max(0, Math.min(100, 30 + dayVariation * 5 + hourVariation * 2)) },
        swellHeight: { sg: Math.max(0.5, 1.5 + dayVariation * 0.3) },
        swellPeriod: { sg: Math.max(4, 8 + dayVariation * 0.5) },
        waterTemperature: { sg: 23 + dayVariation * 0.5 },
        waveHeight: { sg: Math.max(0.3, 1.0 + dayVariation * 0.2) },
        wavePeriod: { sg: Math.max(5, 7.5 + dayVariation * 0.3) },
        waveDirection: { sg: 180 + day * 5 },
        windWaveHeight: { sg: Math.max(0.2, 0.7 + dayVariation * 0.1) },
        windWavePeriod: { sg: Math.max(4, 6.5 + dayVariation * 0.2) },
        windWaveDirection: { sg: 185 + day * 5 },
        windSpeed: { sg: Math.max(0, 4 + dayVariation + hourVariation * 0.5) },
        humidity: { sg: Math.max(30, Math.min(90, 60 + dayVariation * 3)) },
        precipitation: { sg: Math.max(0, dayVariation > 2 ? dayVariation - 2 : 0) },
        pressure: { sg: 1013 + dayVariation },
        dewPointTemperature: { sg: 16 + dayVariation * 0.5 },
        visibility: { sg: Math.max(3, 10 - Math.abs(dayVariation)) },
        gust: { sg: Math.max(0, 5 + dayVariation + hourVariation * 0.3) },
        windDirection: { sg: 180 + day * 10 }
      });
    }
  }
  
  return mockHours;
};

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
    
    console.warn('Failed to fetch live weather data, falling back to mock data:', error.message);
    // Simulate loading time even for fallback
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      hours: mockWeatherData.hours,
      meta: null // No quota info for mock data
    };
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
    
    console.warn('Failed to fetch forecast data, falling back to mock data:', error.message);
    // Generate mock forecast data for multiple days
    const mockForecastData = generateMockForecastData(days);
    await new Promise(resolve => setTimeout(resolve, 500));
    return {
      hours: mockForecastData,
      meta: null // No quota info for mock data
    };
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