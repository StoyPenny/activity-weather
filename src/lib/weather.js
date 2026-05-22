// Import settings management functions
import { getEffectiveSettings } from './settings';

// Complete list of available Stormglass API parameters
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

// Core parameters most commonly used (for fallback/prioritization)
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
  validParameters: new Set(WEATHER_PARAMS),

  parameterMappings: {
    'temp':        'airTemperature',
    'temperature': 'airTemperature',
    'wind':        'windSpeed',
    'waves':       'waveHeight',
    'swell':       'swellHeight',
    'current':     'currentSpeed'
  },

  categories: {
    atmospheric: ['airTemperature', 'pressure', 'cloudCover', 'humidity', 'dewPointTemperature', 'visibility', 'precipitation', 'rain', 'snow'],
    wind:        ['windSpeed', 'windDirection', 'gust'],
    marine:      ['waveHeight', 'waveDirection', 'wavePeriod', 'windWaveHeight', 'windWaveDirection', 'windWavePeriod', 'swellHeight', 'swellDirection', 'swellPeriod'],
    current:     ['currentSpeed', 'currentDirection'],
    ice:         ['iceCover', 'snowDepth', 'seaIceThickness']
  }
};

// --- BACKEND API INTEGRATION ---

// In-memory map tracking the last response timestamp per location.
// Key: "lat_lng" (3 decimal places each).
const _timestamps = new Map();

const roundCoord = (n) => Math.round(n * 1000) / 1000;
const timestampKey = (lat, lng) => `${roundCoord(lat)}_${roundCoord(lng)}`;

/**
 * Fetch current weather data for a location via the backend proxy.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<{ hours: object[], meta: object }>}
 */
export const fetchWeatherData = async (lat, lng, forceRefresh = false) => {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new Error('Invalid coordinates: lat and lng must be numbers');
  }

  const params = new URLSearchParams({ lat, lng });
  if (forceRefresh) params.set('forceRefresh', 'true');

  let response;
  try {
    response = await fetch(`/api/weather/current?${params}`);
  } catch (networkErr) {
    throw new Error(`Failed to fetch weather data: ${networkErr.message}`);
  }

  if (response.status === 402) {
    const body = await response.json().catch(() => ({}));
    const err = new Error('API quota exceeded');
    err.quotaMeta = body.quotaMeta || { dailyQuota: 10, requestCount: 'unknown' };
    throw err;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch weather data: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Record the timestamp so getCacheTimestamp() can return it.
  _timestamps.set(timestampKey(lat, lng), data._cachedAt || Date.now());

  // Strip internal cache metadata before returning to callers.
  const { _cached, _cachedAt, ...weatherData } = data;
  return weatherData;
};

/**
 * Fetch forecast data for a location via the backend proxy.
 * The backend always returns the full 10-day payload regardless of `days`.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {number} [days=10]
 * @param {boolean} [forceRefresh=false]
 * @returns {Promise<{ hours: object[], meta: object }>}
 */
export const fetchForecastData = async (lat, lng, days = 10, forceRefresh = false) => {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new Error('Invalid coordinates: lat and lng must be numbers');
  }
  if (typeof days !== 'number' || days < 1 || days > 10) {
    throw new Error('Days parameter must be between 1 and 10');
  }

  const params = new URLSearchParams({ lat, lng, days });
  if (forceRefresh) params.set('forceRefresh', 'true');

  let response;
  try {
    response = await fetch(`/api/weather/forecast?${params}`);
  } catch (networkErr) {
    throw new Error(`Failed to fetch forecast data: ${networkErr.message}`);
  }

  if (response.status === 402) {
    const body = await response.json().catch(() => ({}));
    const err = new Error('API quota exceeded');
    err.quotaMeta = body.quotaMeta || { dailyQuota: 10, requestCount: 'unknown' };
    throw err;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch forecast data: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  const { _cached, _cachedAt, ...forecastData } = data;
  return forecastData;
};

// --- CACHE UTILITIES ---

/**
 * Clear the backend weather cache.
 *
 * When called with lat/lng, the forceRefresh flag on the next fetch is the
 * effective mechanism; we still flush local timestamps for that location.
 * When called without arguments, flushes the entire backend cache.
 *
 * @param {number} [lat]
 * @param {number} [lng]
 */
export const clearCache = (lat, lng) => {
  if (lat !== undefined && lng !== undefined) {
    // Clear local timestamp for this location only.
    _timestamps.delete(timestampKey(lat, lng));
  } else {
    // Full flush: clear local timestamps and the backend cache.
    _timestamps.clear();
    fetch('/api/weather/cache', { method: 'DELETE' }).catch(err => {
      console.warn('Failed to clear backend weather cache:', err);
    });
  }
};

/**
 * Return the timestamp of the last weather response for a location.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {number|null} Unix milliseconds, or null if not yet fetched
 */
export const getCacheTimestamp = (lat, lng) => {
  return _timestamps.get(timestampKey(lat, lng)) || null;
};

/**
 * Return cache status from the backend (entry count, keys, ages).
 *
 * @returns {Promise<Object>}
 */
export const getCacheHealth = async () => {
  try {
    const response = await fetch('/api/weather/cache');
    if (!response.ok) {
      throw new Error(`Cache status error: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Error getting cache health:', error);
    return { entryCount: 0, entries: [], error: error.message };
  }
};

/**
 * Flush all backend weather cache entries.
 *
 * @returns {Promise<Object>}
 */
export const performManualCacheMaintenance = async () => {
  try {
    const response = await fetch('/api/weather/cache', { method: 'DELETE' });
    if (!response.ok) {
      throw new Error(`Cache flush error: ${response.status}`);
    }
    _timestamps.clear();
    return await response.json();
  } catch (error) {
    console.error('Error flushing cache:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Return cache configuration info (server-side values are fixed).
 *
 * @returns {Object}
 */
export const getCacheConfig = () => ({
  strategy: 'server-side in-memory',
  expiry:   'daily (midnight rollover)',
  note:     'Cache is managed by the Express backend; no client-side cache is used.'
});

// Helper: local date string (YYYY-MM-DD) from a Date object
const getLocalDateString = (date) => {
  const year  = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day   = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper: local date string from a UTC timestamp string
const getLocalDateStringFromUTC = (utcTimeString) => {
  return getLocalDateString(new Date(utcTimeString));
};

/**
 * Filter forecast data to hours belonging to a specific date (timezone-aware).
 *
 * @param {Object} forecastData
 * @param {Date} targetDate
 * @returns {{ hours: object[], meta: object }}
 */
export const filterForecastDataByDate = (forecastData, targetDate) => {
  if (!forecastData || !forecastData.hours) {
    return { hours: [], meta: forecastData?.meta || null };
  }

  const targetDateStr = getLocalDateString(targetDate);
  const filteredHours = forecastData.hours.filter(hour =>
    getLocalDateStringFromUTC(hour.time) === targetDateStr
  );

  return { hours: filteredHours, meta: forecastData.meta };
};

/**
 * Return all unique dates available in forecast data (timezone-aware).
 *
 * @param {Object} forecastData
 * @returns {Date[]}
 */
export const getAvailableForecastDates = (forecastData) => {
  if (!forecastData || !forecastData.hours) {
    return [];
  }

  const dates = new Set();
  forecastData.hours.forEach(hour => {
    dates.add(getLocalDateStringFromUTC(hour.time));
  });

  return Array.from(dates).sort().map(dateStr => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  });
};

/**
 * Check if a date has forecast data available (timezone-aware).
 *
 * @param {Object} forecastData
 * @param {Date} targetDate
 * @returns {boolean}
 */
export const isForecastDateAvailable = (forecastData, targetDate) => {
  const availableDates = getAvailableForecastDates(forecastData);
  const targetDateStr = getLocalDateString(targetDate);
  return availableDates.some(date => getLocalDateString(date) === targetDateStr);
};

// --- RATING LOGIC ---
const normalize        = (value, optimal, range) => Math.max(0, 10 - (Math.abs(value - optimal) / range) * 10);
const inverseNormalize = (value, max)            => Math.max(0, 10 - (value / max) * 10);

// Parameter validation helpers
const validateParameter = (paramName) => {
  if (PARAMETER_VALIDATION.validParameters.has(paramName)) {
    return { isValid: true, parameter: paramName };
  }

  const mappedParam = PARAMETER_VALIDATION.parameterMappings[paramName.toLowerCase()];
  if (mappedParam && PARAMETER_VALIDATION.validParameters.has(mappedParam)) {
    return { isValid: true, parameter: mappedParam, mapped: true, original: paramName };
  }

  const similarParams = Array.from(PARAMETER_VALIDATION.validParameters).filter(param =>
    param.toLowerCase().includes(paramName.toLowerCase()) ||
    paramName.toLowerCase().includes(param.toLowerCase())
  );

  return { isValid: false, parameter: paramName, suggestions: similarParams.slice(0, 3) };
};

const findParameterFallback = (paramName) => {
  const fallbackMappings = {
    'wavePeriod':      ['swellPeriod', 'windWavePeriod'],
    'windWaveHeight':  ['waveHeight', 'swellHeight'],
    'windWavePeriod':  ['wavePeriod', 'swellPeriod'],
    'waveHeight':      ['swellHeight', 'windWaveHeight'],
    'swellHeight':     ['waveHeight', 'windWaveHeight'],
    'temperature':     ['airTemperature', 'waterTemperature'],
    'wind':            ['windSpeed'],
    'current':         ['currentSpeed'],
    'currentSpeed':    ['windSpeed'],
    'currentDirection':['windDirection']
  };

  const fallbacks = fallbackMappings[paramName] || [];
  return fallbacks.find(fallback => PARAMETER_VALIDATION.validParameters.has(fallback));
};

// Enhanced rating function with comprehensive parameter validation
const rateWithParameters = (data, parameters, returnDetails = false) => {
  const ratings  = [];
  const metrics  = {};
  const warnings = [];
  const errors   = [];

  for (const [paramName, paramConfig] of Object.entries(parameters)) {
    const validation     = validateParameter(paramName);
    let actualParamName  = validation.parameter;

    if (!validation.isValid) {
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

    if (!data[actualParamName] || data[actualParamName].sg === undefined) {
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

    if (!paramConfig.type || (paramConfig.type !== 'normalize' && paramConfig.type !== 'inverse')) {
      errors.push(`Invalid configuration for parameter '${paramName}': type must be 'normalize' or 'inverse'`);
      continue;
    }

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

      if (returnDetails) {
        metrics[paramName] = {
          value,
          score,
          config: { ...paramConfig },
          actualParameter: actualParamName,
          ...(actualParamName !== paramName && { fallbackUsed: true })
        };
      }
    } catch (error) {
      errors.push(`Error calculating score for '${paramName}': ${error.message}`);
    }
  }

  if (warnings.length > 0) console.warn('Weather parameter warnings:', warnings);
  if (errors.length > 0)   console.error('Weather parameter errors:', errors);

  const averageRating = ratings.length > 0
    ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
    : 0;

  if (returnDetails) {
    return {
      rating: averageRating,
      metrics,
      warnings,
      errors,
      validParameterCount: ratings.length,
      totalParameterCount: Object.keys(parameters).length
    };
  }

  return averageRating;
};

// Activity-specific rating functions (fall back to hardcoded defaults when no params supplied)
const rateSurfing = (d, params, returnDetails = false) => {
  if (params) return rateWithParameters(d, params, returnDetails);
  const rating = (normalize(d.swellHeight.sg, 1.5, 1.5) + normalize(d.swellPeriod.sg, 8, 4) + normalize(d.windSpeed.sg, 3, 5)) / 3;
  if (returnDetails) {
    return {
      rating,
      metrics: {
        swellHeight: { value: d.swellHeight.sg, score: normalize(d.swellHeight.sg, 1.5, 1.5), config: { type: 'normalize', optimal: 1.5, range: 1.5 } },
        swellPeriod: { value: d.swellPeriod.sg, score: normalize(d.swellPeriod.sg, 8, 4),     config: { type: 'normalize', optimal: 8, range: 4 } },
        windSpeed:   { value: d.windSpeed.sg,   score: normalize(d.windSpeed.sg, 3, 5),       config: { type: 'normalize', optimal: 3, range: 5 } }
      }
    };
  }
  return rating;
};

const rateFishing = (d, params, returnDetails = false) => {
  if (params) return rateWithParameters(d, params, returnDetails);
  const rating = (inverseNormalize(d.windSpeed.sg, 10) + normalize(d.cloudCover.sg, 40, 30)) / 2;
  if (returnDetails) {
    return {
      rating,
      metrics: {
        windSpeed:  { value: d.windSpeed.sg,  score: inverseNormalize(d.windSpeed.sg, 10),   config: { type: 'inverse', max: 10 } },
        cloudCover: { value: d.cloudCover.sg, score: normalize(d.cloudCover.sg, 40, 30),     config: { type: 'normalize', optimal: 40, range: 30 } }
      }
    };
  }
  return rating;
};

const rateBoating = (d, params, returnDetails = false) => {
  if (params) return rateWithParameters(d, params, returnDetails);
  const rating = (inverseNormalize(d.windSpeed.sg, 12) + inverseNormalize(d.waveHeight.sg, 1)) / 2;
  if (returnDetails) {
    return {
      rating,
      metrics: {
        windSpeed:  { value: d.windSpeed.sg,  score: inverseNormalize(d.windSpeed.sg, 12),  config: { type: 'inverse', max: 12 } },
        waveHeight: { value: d.waveHeight.sg, score: inverseNormalize(d.waveHeight.sg, 1),  config: { type: 'inverse', max: 1 } }
      }
    };
  }
  return rating;
};

const rateHiking = (d, params, returnDetails = false) => {
  if (params) return rateWithParameters(d, params, returnDetails);
  const rating = (normalize(d.airTemperature.sg, 22, 10) + inverseNormalize(d.windSpeed.sg, 10) + inverseNormalize(d.cloudCover.sg, 80)) / 3;
  if (returnDetails) {
    return {
      rating,
      metrics: {
        airTemperature: { value: d.airTemperature.sg, score: normalize(d.airTemperature.sg, 22, 10),      config: { type: 'normalize', optimal: 22, range: 10 } },
        windSpeed:      { value: d.windSpeed.sg,       score: inverseNormalize(d.windSpeed.sg, 10),        config: { type: 'inverse', max: 10 } },
        cloudCover:     { value: d.cloudCover.sg,      score: inverseNormalize(d.cloudCover.sg, 80),       config: { type: 'inverse', max: 80 } }
      }
    };
  }
  return rating;
};

const rateCamping = (d, params, returnDetails = false) => {
  if (params) return rateWithParameters(d, params, returnDetails);
  const rating = (normalize(d.airTemperature.sg, 20, 10) + inverseNormalize(d.windSpeed.sg, 8) + inverseNormalize(d.cloudCover.sg, 90)) / 3;
  if (returnDetails) {
    return {
      rating,
      metrics: {
        airTemperature: { value: d.airTemperature.sg, score: normalize(d.airTemperature.sg, 20, 10),      config: { type: 'normalize', optimal: 20, range: 10 } },
        windSpeed:      { value: d.windSpeed.sg,       score: inverseNormalize(d.windSpeed.sg, 8),         config: { type: 'inverse', max: 8 } },
        cloudCover:     { value: d.cloudCover.sg,      score: inverseNormalize(d.cloudCover.sg, 90),       config: { type: 'inverse', max: 90 } }
      }
    };
  }
  return rating;
};

const rateBeachDay = (d, params, returnDetails = false) => {
  if (params) return rateWithParameters(d, params, returnDetails);
  const rating = (normalize(d.airTemperature.sg, 28, 8) + normalize(d.windSpeed.sg, 4, 6) + normalize(d.cloudCover.sg, 15, 20)) / 3;
  if (returnDetails) {
    return {
      rating,
      metrics: {
        airTemperature: { value: d.airTemperature.sg, score: normalize(d.airTemperature.sg, 28, 8),       config: { type: 'normalize', optimal: 28, range: 8 } },
        windSpeed:      { value: d.windSpeed.sg,       score: normalize(d.windSpeed.sg, 4, 6),             config: { type: 'normalize', optimal: 4, range: 6 } },
        cloudCover:     { value: d.cloudCover.sg,      score: normalize(d.cloudCover.sg, 15, 20),          config: { type: 'normalize', optimal: 15, range: 20 } }
      }
    };
  }
  return rating;
};

const rateKayaking = (d, params, returnDetails = false) => {
  if (params) return rateWithParameters(d, params, returnDetails);
  const rating = (inverseNormalize(d.windSpeed.sg, 6) + inverseNormalize(d.waveHeight.sg, 0.5)) / 2;
  if (returnDetails) {
    return {
      rating,
      metrics: {
        windSpeed:  { value: d.windSpeed.sg,  score: inverseNormalize(d.windSpeed.sg, 6),    config: { type: 'inverse', max: 6 } },
        waveHeight: { value: d.waveHeight.sg, score: inverseNormalize(d.waveHeight.sg, 0.5), config: { type: 'inverse', max: 0.5 } }
      }
    };
  }
  return rating;
};

const rateSnorkeling = (d, params, returnDetails = false) => {
  if (params) return rateWithParameters(d, params, returnDetails);
  const rating = (normalize(d.waterTemperature.sg, 26, 6) + inverseNormalize(d.waveHeight.sg, 0.3)) / 2;
  if (returnDetails) {
    return {
      rating,
      metrics: {
        waterTemperature: { value: d.waterTemperature.sg, score: normalize(d.waterTemperature.sg, 26, 6),   config: { type: 'normalize', optimal: 26, range: 6 } },
        waveHeight:       { value: d.waveHeight.sg,       score: inverseNormalize(d.waveHeight.sg, 0.3),    config: { type: 'inverse', max: 0.3 } }
      }
    };
  }
  return rating;
};

const ACTIVITY_RATING_FUNCTIONS = {
  'Surfing':   rateSurfing,
  'Fishing':   rateFishing,
  'Boating':   rateBoating,
  'Hiking':    rateHiking,
  'Camping':   rateCamping,
  'Beach Day': rateBeachDay,
  'Kayaking':  rateKayaking,
  'Snorkeling':rateSnorkeling
};

/**
 * Calculate hourly activity ratings for each activity in settings.
 *
 * @param {object[]} hourlyData
 * @returns {Object} Map of activityName → [{time, rating}]
 */
export const calculateAllHourlyRatings = (hourlyData) => {
  const settings      = getEffectiveSettings();
  const activityList  = settings.activities || Object.keys(ACTIVITY_RATING_FUNCTIONS);
  const masterRatings = {};

  for (const activityName of activityList) {
    const ratingFunction = ACTIVITY_RATING_FUNCTIONS[activityName]
      ? ACTIVITY_RATING_FUNCTIONS[activityName]
      : (d, params) => rateWithParameters(d, params || {});

    const activityParams = settings.activityParameters?.[activityName] || {};

    masterRatings[activityName] = hourlyData.map(hourData => ({
      time:   hourData.time,
      rating: ratingFunction(hourData, activityParams)
    }));
  }

  return masterRatings;
};

/**
 * Calculate hourly ratings with detailed metric breakdowns.
 *
 * @param {object[]} hourlyData
 * @returns {Object} Map of activityName → [{time, rating, metrics}]
 */
export const calculateAllHourlyRatingsWithDetails = (hourlyData) => {
  const settings      = getEffectiveSettings();
  const activityList  = settings.activities || Object.keys(ACTIVITY_RATING_FUNCTIONS);
  const masterRatings = {};

  for (const activityName of activityList) {
    const ratingFunction = ACTIVITY_RATING_FUNCTIONS[activityName]
      ? ACTIVITY_RATING_FUNCTIONS[activityName]
      : (d, params, returnDetails) => rateWithParameters(d, params || {}, returnDetails);

    const activityParams = settings.activityParameters?.[activityName] || {};

    masterRatings[activityName] = hourlyData.map(hourData => {
      const result = ratingFunction(hourData, activityParams, true);
      return {
        time:    hourData.time,
        rating:  result.rating || result,
        metrics: result.metrics || {}
      };
    });
  }

  return masterRatings;
};

/**
 * Return the hourly record closest to the current time.
 *
 * @param {object[]} hourlyData
 * @returns {object|null}
 */
export const getCurrentWeatherData = (hourlyData) => {
  if (!hourlyData || hourlyData.length === 0) return null;

  const now = new Date();
  let closestHour = hourlyData[0];
  let minDiff = Math.abs(new Date(closestHour.time).getTime() - now.getTime());

  for (const hour of hourlyData) {
    const diff = Math.abs(new Date(hour.time).getTime() - now.getTime());
    if (diff < minDiff) {
      minDiff = diff;
      closestHour = hour;
    }
  }

  return closestHour;
};

// --- UTILITY FUNCTIONS FOR WEATHER DISPLAY ---

export const calculateFeelsLike = (temp, humidity) => {
  if (temp < 27) return temp;

  const rh = humidity;
  const t  = temp;

  const hi = -8.78469475556 +
             1.61139411    * t  +
             2.33854883889 * rh +
            -0.14611605    * t  * rh +
            -0.012308094   * t  * t  +
            -0.0164248277778 * rh * rh +
             0.002211732   * t  * t  * rh +
             0.00072546    * t  * rh * rh +
            -0.000003582   * t  * t  * rh * rh;

  return Math.round(hi);
};

export const getWindDirection = (degrees) => {
  const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  const index      = Math.round(degrees / 22.5) % 16;
  return directions[index];
};

export const getPrecipitationChance = (precipitation, cloudCover) => {
  if (precipitation > 0.5) return Math.min(90, 60 + cloudCover * 0.3);
  if (precipitation > 0.1) return Math.min(70, 30 + cloudCover * 0.4);
  if (cloudCover > 70)     return Math.min(40, cloudCover * 0.4);
  if (cloudCover > 40)     return Math.min(20, cloudCover * 0.2);
  return Math.max(0, cloudCover * 0.1);
};
