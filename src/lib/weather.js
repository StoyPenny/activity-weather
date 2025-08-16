// --- STORMGLASS API CONFIGURATION ---
const STORMGLASS_API_KEY = import.meta.env.VITE_STORMGLASS_API_KEY;
const STORMGLASS_BASE_URL = 'https://api.stormglass.io/v2/weather/point';

// Port Orange, FL coordinates
const PORT_ORANGE_COORDS = {
  lat: 29.1386,
  lng: -81.0067
};

// Parameters we need from the API (matching our current data structure)
const WEATHER_PARAMS = [
  'airTemperature',
  'cloudCover',
  'swellHeight',
  'swellPeriod',
  'waterTemperature',
  'waveHeight',
  'windSpeed'
];

// --- CACHING CONFIGURATION ---
const CACHE_KEY = 'stormglass_weather_data';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

// --- MOCK DATA SERVICE (FALLBACK) ---
// This now includes data for multiple hours to simulate a daily forecast.
const mockWeatherData = {
  hours: [
    // Morning (Cooler, calmer)
    { time: '2025-08-16T08:00:00+00:00', airTemperature: { sg: 22 }, cloudCover: { sg: 10 }, swellHeight: { sg: 1.2 }, swellPeriod: { sg: 8 }, waterTemperature: { sg: 23 }, waveHeight: { sg: 0.8 }, windSpeed: { sg: 2 } },
    { time: '2025-08-16T09:00:00+00:00', airTemperature: { sg: 23 }, cloudCover: { sg: 15 }, swellHeight: { sg: 1.3 }, swellPeriod: { sg: 8 }, waterTemperature: { sg: 23 }, waveHeight: { sg: 0.9 }, windSpeed: { sg: 3 } },
    { time: '2025-08-16T10:00:00+00:00', airTemperature: { sg: 25 }, cloudCover: { sg: 20 }, swellHeight: { sg: 1.5 }, swellPeriod: { sg: 7.5 }, waterTemperature: { sg: 24 }, waveHeight: { sg: 1.1 }, windSpeed: { sg: 4 } },
    { time: '2025-08-16T11:00:00+00:00', airTemperature: { sg: 26 }, cloudCover: { sg: 25 }, swellHeight: { sg: 1.8 }, swellPeriod: { sg: 7 }, waterTemperature: { sg: 24 }, waveHeight: { sg: 1.2 }, windSpeed: { sg: 5 } },
    // Midday (Hottest, wind picks up)
    { time: '2025-08-16T12:00:00+00:00', airTemperature: { sg: 28 }, cloudCover: { sg: 30 }, swellHeight: { sg: 2.0 }, swellPeriod: { sg: 6.5 }, waterTemperature: { sg: 25 }, waveHeight: { sg: 1.5 }, windSpeed: { sg: 6 } },
    { time: '2025-08-16T13:00:00+00:00', airTemperature: { sg: 29 }, cloudCover: { sg: 40 }, swellHeight: { sg: 2.1 }, swellPeriod: { sg: 6 }, waterTemperature: { sg: 25 }, waveHeight: { sg: 1.6 }, windSpeed: { sg: 7 } },
    { time: '2025-08-16T14:00:00+00:00', airTemperature: { sg: 29 }, cloudCover: { sg: 50 }, swellHeight: { sg: 2.0 }, swellPeriod: { sg: 6 }, waterTemperature: { sg: 25 }, waveHeight: { sg: 1.5 }, windSpeed: { sg: 7 } },
    // Afternoon (Clouds increase, wind may drop)
    { time: '2025-08-16T15:00:00+00:00', airTemperature: { sg: 28 }, cloudCover: { sg: 60 }, swellHeight: { sg: 1.9 }, swellPeriod: { sg: 6.5 }, waterTemperature: { sg: 25 }, waveHeight: { sg: 1.4 }, windSpeed: { sg: 6 } },
    { time: '2025-08-16T16:00:00+00:00', airTemperature: { sg: 27 }, cloudCover: { sg: 55 }, swellHeight: { sg: 1.8 }, swellPeriod: { sg: 7 }, waterTemperature: { sg: 24 }, waveHeight: { sg: 1.3 }, windSpeed: { sg: 5 } },
    { time: '2025-08-16T17:00:00+00:00', airTemperature: { sg: 26 }, cloudCover: { sg: 45 }, swellHeight: { sg: 1.6 }, swellPeriod: { sg: 7.5 }, waterTemperature: { sg: 24 }, waveHeight: { sg: 1.1 }, windSpeed: { sg: 4 } },
  ],
};

// --- STORMGLASS API SERVICE ---
const fetchStormglassData = async () => {
  if (!STORMGLASS_API_KEY) {
    throw new Error('STORMGLASS_API_KEY not found in environment variables');
  }

  // Get today's date range (start of day to end of day)
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const params = new URLSearchParams({
    lat: PORT_ORANGE_COORDS.lat.toString(),
    lng: PORT_ORANGE_COORDS.lng.toString(),
    params: WEATHER_PARAMS.join(','),
    start: Math.floor(startOfDay.getTime() / 1000).toString(),
    end: Math.floor(endOfDay.getTime() / 1000).toString()
  });

  const response = await fetch(`${STORMGLASS_BASE_URL}?${params}`, {
    headers: {
      'Authorization': STORMGLASS_API_KEY
    }
  });

  if (!response.ok) {
    throw new Error(`Stormglass API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return data.hours;
};

// --- CACHE MANAGEMENT FUNCTIONS ---
const getCachedData = () => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is still valid (within 1 hour)
    if (now - timestamp < CACHE_DURATION) {
      console.log('Using cached weather data');
      return { data, timestamp };
    } else {
      console.log('Cache expired, will fetch fresh data');
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
  } catch (error) {
    console.warn('Error reading cache:', error);
    localStorage.removeItem(CACHE_KEY);
    return null;
  }
};

const setCachedData = (data) => {
  try {
    const cacheObject = {
      data,
      timestamp: Date.now()
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheObject));
    console.log('Weather data cached successfully');
  } catch (error) {
    console.warn('Error caching data:', error);
  }
};

export const clearCache = () => {
  localStorage.removeItem(CACHE_KEY);
  console.log('Weather cache cleared');
};

export const getCacheTimestamp = () => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const { timestamp } = JSON.parse(cached);
    return timestamp;
  } catch {
    return null;
  }
};

// --- MAIN FETCH FUNCTION WITH CACHING AND FALLBACK ---
export const fetchWeatherData = async (forceRefresh = false) => {
  // Check cache first unless force refresh is requested
  if (!forceRefresh) {
    const cached = getCachedData();
    if (cached) {
      return cached.data;
    }
  }

  try {
    console.log('Attempting to fetch live weather data from Stormglass API...');
    const liveData = await fetchStormglassData();
    console.log('Successfully fetched live weather data');
    
    // Cache the fresh data
    setCachedData(liveData);
    
    return liveData;
  } catch (error) {
    console.warn('Failed to fetch live weather data, falling back to mock data:', error.message);
    // Simulate loading time even for fallback
    await new Promise(resolve => setTimeout(resolve, 500));
    return mockWeatherData.hours;
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