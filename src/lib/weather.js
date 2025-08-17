// --- STORMGLASS API CONFIGURATION ---
const STORMGLASS_API_KEY = import.meta.env.VITE_STORMGLASS_API_KEY;
const STORMGLASS_BASE_URL = 'https://api.stormglass.io/v2/weather/point';

// Parameters we need from the API (matching our current data structure)
const WEATHER_PARAMS = [
  'airTemperature',
  'cloudCover',
  'swellHeight',
  'swellPeriod',
  'waterTemperature',
  'waveHeight',
  'windSpeed',
  'humidity',
  'precipitation',
  'pressure',
  'dewPointTemperature',
  'visibility',
  'gust',
  'windDirection'
];

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
    { time: '2025-08-16T08:00:00+00:00', airTemperature: { sg: 22 }, cloudCover: { sg: 10 }, swellHeight: { sg: 1.2 }, swellPeriod: { sg: 8 }, waterTemperature: { sg: 23 }, waveHeight: { sg: 0.8 }, windSpeed: { sg: 2 }, humidity: { sg: 65 }, precipitation: { sg: 0 }, pressure: { sg: 1015 }, dewPointTemperature: { sg: 15 }, visibility: { sg: 10 }, gust: { sg: 3 }, windDirection: { sg: 180 } },
    { time: '2025-08-16T09:00:00+00:00', airTemperature: { sg: 23 }, cloudCover: { sg: 15 }, swellHeight: { sg: 1.3 }, swellPeriod: { sg: 8 }, waterTemperature: { sg: 23 }, waveHeight: { sg: 0.9 }, windSpeed: { sg: 3 }, humidity: { sg: 62 }, precipitation: { sg: 0 }, pressure: { sg: 1014 }, dewPointTemperature: { sg: 16 }, visibility: { sg: 10 }, gust: { sg: 4 }, windDirection: { sg: 185 } },
    { time: '2025-08-16T10:00:00+00:00', airTemperature: { sg: 25 }, cloudCover: { sg: 20 }, swellHeight: { sg: 1.5 }, swellPeriod: { sg: 7.5 }, waterTemperature: { sg: 24 }, waveHeight: { sg: 1.1 }, windSpeed: { sg: 4 }, humidity: { sg: 58 }, precipitation: { sg: 0 }, pressure: { sg: 1013 }, dewPointTemperature: { sg: 17 }, visibility: { sg: 10 }, gust: { sg: 5 }, windDirection: { sg: 190 } },
    { time: '2025-08-16T11:00:00+00:00', airTemperature: { sg: 26 }, cloudCover: { sg: 25 }, swellHeight: { sg: 1.8 }, swellPeriod: { sg: 7 }, waterTemperature: { sg: 24 }, waveHeight: { sg: 1.2 }, windSpeed: { sg: 5 }, humidity: { sg: 55 }, precipitation: { sg: 0 }, pressure: { sg: 1012 }, dewPointTemperature: { sg: 17 }, visibility: { sg: 9 }, gust: { sg: 6 }, windDirection: { sg: 195 } },
    // Midday (Hottest, wind picks up)
    { time: '2025-08-16T12:00:00+00:00', airTemperature: { sg: 28 }, cloudCover: { sg: 30 }, swellHeight: { sg: 2.0 }, swellPeriod: { sg: 6.5 }, waterTemperature: { sg: 25 }, waveHeight: { sg: 1.5 }, windSpeed: { sg: 6 }, humidity: { sg: 52 }, precipitation: { sg: 0 }, pressure: { sg: 1011 }, dewPointTemperature: { sg: 18 }, visibility: { sg: 8 }, gust: { sg: 8 }, windDirection: { sg: 200 } },
    { time: '2025-08-16T13:00:00+00:00', airTemperature: { sg: 29 }, cloudCover: { sg: 40 }, swellHeight: { sg: 2.1 }, swellPeriod: { sg: 6 }, waterTemperature: { sg: 25 }, waveHeight: { sg: 1.6 }, windSpeed: { sg: 7 }, humidity: { sg: 50 }, precipitation: { sg: 0.1 }, pressure: { sg: 1010 }, dewPointTemperature: { sg: 18 }, visibility: { sg: 7 }, gust: { sg: 9 }, windDirection: { sg: 205 } },
    { time: '2025-08-16T14:00:00+00:00', airTemperature: { sg: 29 }, cloudCover: { sg: 50 }, swellHeight: { sg: 2.0 }, swellPeriod: { sg: 6 }, waterTemperature: { sg: 25 }, waveHeight: { sg: 1.5 }, windSpeed: { sg: 7 }, humidity: { sg: 48 }, precipitation: { sg: 0.2 }, pressure: { sg: 1009 }, dewPointTemperature: { sg: 17 }, visibility: { sg: 6 }, gust: { sg: 9 }, windDirection: { sg: 210 } },
    // Afternoon (Clouds increase, wind may drop)
    { time: '2025-08-16T15:00:00+00:00', airTemperature: { sg: 28 }, cloudCover: { sg: 60 }, swellHeight: { sg: 1.9 }, swellPeriod: { sg: 6.5 }, waterTemperature: { sg: 25 }, waveHeight: { sg: 1.4 }, windSpeed: { sg: 6 }, humidity: { sg: 55 }, precipitation: { sg: 0.3 }, pressure: { sg: 1010 }, dewPointTemperature: { sg: 19 }, visibility: { sg: 5 }, gust: { sg: 7 }, windDirection: { sg: 215 } },
    { time: '2025-08-16T16:00:00+00:00', airTemperature: { sg: 27 }, cloudCover: { sg: 55 }, swellHeight: { sg: 1.8 }, swellPeriod: { sg: 7 }, waterTemperature: { sg: 24 }, waveHeight: { sg: 1.3 }, windSpeed: { sg: 5 }, humidity: { sg: 60 }, precipitation: { sg: 0.1 }, pressure: { sg: 1011 }, dewPointTemperature: { sg: 19 }, visibility: { sg: 6 }, gust: { sg: 6 }, windDirection: { sg: 220 } },
    { time: '2025-08-16T17:00:00+00:00', airTemperature: { sg: 26 }, cloudCover: { sg: 45 }, swellHeight: { sg: 1.6 }, swellPeriod: { sg: 7.5 }, waterTemperature: { sg: 24 }, waveHeight: { sg: 1.1 }, windSpeed: { sg: 4 }, humidity: { sg: 65 }, precipitation: { sg: 0 }, pressure: { sg: 1012 }, dewPointTemperature: { sg: 19 }, visibility: { sg: 8 }, gust: { sg: 5 }, windDirection: { sg: 225 } },
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

// --- CACHE MANAGEMENT FUNCTIONS ---
// Cache refreshes once per calendar day at local midnight
const generateCacheKey = (lat, lng) => {
  // Round to 3 decimal places for cache key (roughly 100m precision)
  const roundedLat = Math.round(lat * 1000) / 1000;
  const roundedLng = Math.round(lng * 1000) / 1000;
  return `weather_${roundedLat}_${roundedLng}`;
};

const getCachedData = (lat, lng) => {
  try {
    const cacheKey = generateCacheKey(lat, lng);
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    const cacheDate = new Date(timestamp);
    const currentDate = new Date();
    
    // Check if cache is from the same calendar day (local timezone)
    // Cache expires at midnight and refreshes for the new day
    if (isSameCalendarDay(cacheDate, currentDate)) {
      console.log(`Using cached weather data for ${lat}, ${lng} (cached on ${cacheDate.toLocaleDateString()})`);
      return { data, timestamp };
    } else {
      console.log(`Cache expired (cached on ${cacheDate.toLocaleDateString()}, now ${currentDate.toLocaleDateString()}), will fetch fresh data`);
      localStorage.removeItem(cacheKey);
      return null;
    }
  } catch (error) {
    console.warn('Error reading cache:', error);
    const cacheKey = generateCacheKey(lat, lng);
    localStorage.removeItem(cacheKey);
    return null;
  }
};

const setCachedData = (data, lat, lng) => {
  try {
    const cacheKey = generateCacheKey(lat, lng);
    const now = new Date();
    const cacheObject = {
      data,
      timestamp: now.getTime(), // Store timestamp for date comparison
      cacheDate: now.toLocaleDateString(), // Human-readable cache date for debugging
      location: { lat, lng }
    };
    localStorage.setItem(cacheKey, JSON.stringify(cacheObject));
    console.log(`Weather data cached successfully for ${lat}, ${lng} on ${now.toLocaleDateString()}`);
  } catch (error) {
    console.warn('Error caching data:', error);
  }
};

export const clearCache = (lat, lng) => {
  if (lat !== undefined && lng !== undefined) {
    // Clear cache for specific location
    const cacheKey = generateCacheKey(lat, lng);
    localStorage.removeItem(cacheKey);
    console.log(`Weather cache cleared for ${lat}, ${lng}`);
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

export const getCacheTimestamp = (lat, lng) => {
  try {
    const cacheKey = generateCacheKey(lat, lng);
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;
    
    const { timestamp } = JSON.parse(cached);
    return timestamp;
  } catch {
    return null;
  }
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

// --- RATING LOGIC ---
const normalize = (value, optimal, range) => Math.max(0, 10 - (Math.abs(value - optimal) / range) * 10);
const inverseNormalize = (value, max) => Math.max(0, 10 - (value / max) * 10);

const rateSurfing = (d) => (normalize(d.swellHeight.sg, 1.5, 1.5) + normalize(d.swellPeriod.sg, 8, 4) + normalize(d.windSpeed.sg, 3, 5)) / 3;
const rateFishing = (d) => (inverseNormalize(d.windSpeed.sg, 10) + normalize(d.cloudCover.sg, 40, 30)) / 2;
const rateBoating = (d) => (inverseNormalize(d.windSpeed.sg, 12) + inverseNormalize(d.waveHeight.sg, 1)) / 2;
const rateHiking = (d) => (normalize(d.airTemperature.sg, 22, 10) + inverseNormalize(d.windSpeed.sg, 10) + inverseNormalize(d.cloudCover.sg, 80)) / 3;
const rateCamping = (d) => (normalize(d.airTemperature.sg, 20, 10) + inverseNormalize(d.windSpeed.sg, 8) + inverseNormalize(d.cloudCover.sg, 90)) / 3;
const rateBeachDay = (d) => (normalize(d.airTemperature.sg, 28, 8) + normalize(d.windSpeed.sg, 4, 6) + normalize(d.cloudCover.sg, 15, 20)) / 3;
const rateKayaking = (d) => (inverseNormalize(d.windSpeed.sg, 6) + inverseNormalize(d.waveHeight.sg, 0.5)) / 2;
const rateSnorkeling = (d) => (normalize(d.waterTemperature.sg, 26, 6) + inverseNormalize(d.waveHeight.sg, 0.3)) / 2;

// --- Main Calculation Function - MODIFIED ---
// This now processes an array of hourly data and returns ratings for each hour.
export const calculateAllHourlyRatings = (hourlyData) => {
  const activities = {
    Surfing: rateSurfing, Fishing: rateFishing, Boating: rateBoating,
    Hiking: rateHiking, Camping: rateCamping, 'Beach Day': rateBeachDay,
    Kayaking: rateKayaking, Snorkeling: rateSnorkeling,
  };

  const masterRatings = {};
  for (const activityName in activities) {
    masterRatings[activityName] = hourlyData.map(hourData => ({
        time: hourData.time,
        rating: activities[activityName](hourData)
    }));
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