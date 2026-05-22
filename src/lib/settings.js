// --- SETTINGS MANAGEMENT SYSTEM ---
const SETTINGS_VERSION = 4;

// Default settings — used as a fallback before the backend responds.
const DEFAULT_SETTINGS = {
  version: SETTINGS_VERSION,
  lastUpdated: new Date().toISOString(),
  unitPreference: 'metric',
  themePreference: 'light',
  activities: [
    'Surfing',
    'Fishing',
    'Boating',
    'Hiking',
    'Camping',
    'Beach Day',
    'Kayaking',
    'Snorkeling'
  ],
  activityParams: {
    'Surfing': {
      'swellHeight': { type: 'normalize', optimal: 1.5, range: 1.5 },
      'swellPeriod': { type: 'normalize', optimal: 8, range: 4 },
      'windSpeed':   { type: 'normalize', optimal: 3, range: 5 }
    },
    'Fishing': {
      'windSpeed':  { type: 'inverse', max: 10 },
      'cloudCover': { type: 'normalize', optimal: 40, range: 30 }
    },
    'Boating': {
      'windSpeed':  { type: 'inverse', max: 12 },
      'waveHeight': { type: 'inverse', max: 1 }
    },
    'Hiking': {
      'airTemperature': { type: 'normalize', optimal: 22, range: 10 },
      'windSpeed':      { type: 'inverse', max: 10 },
      'cloudCover':     { type: 'inverse', max: 80 }
    },
    'Camping': {
      'airTemperature': { type: 'normalize', optimal: 20, range: 10 },
      'windSpeed':      { type: 'inverse', max: 8 },
      'cloudCover':     { type: 'inverse', max: 90 }
    },
    'Beach Day': {
      'airTemperature': { type: 'normalize', optimal: 28, range: 8 },
      'windSpeed':      { type: 'normalize', optimal: 4, range: 6 },
      'cloudCover':     { type: 'normalize', optimal: 15, range: 20 }
    },
    'Kayaking': {
      'windSpeed':  { type: 'inverse', max: 6 },
      'waveHeight': { type: 'inverse', max: 0.5 }
    },
    'Snorkeling': {
      'waterTemperature': { type: 'normalize', optimal: 26, range: 6 },
      'waveHeight':       { type: 'inverse', max: 0.3 }
    }
  }
};

// --- BACKEND API INTEGRATION ---

const API_BASE = '/api';

// Device ID — a stable UUID stored locally that identifies this browser/device.
// Only the ID lives in localStorage; all actual settings live in the backend.
const DEVICE_ID_KEY = 'activity_weather_device_id';

function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for non-HTTPS contexts or older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = generateUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

function apiHeaders() {
  return {
    'Content-Type': 'application/json',
    'X-Device-ID': getDeviceId(),
  };
}

// In-memory settings cache — populated by initSettings() at app startup.
// All synchronous reads use this cache so the rest of the app doesn't need
// to be made async.
let _settingsCache = null;

/**
 * Load settings from the backend and populate the in-memory cache.
 * Call once at application startup before rendering weather data.
 * Falls back to DEFAULT_SETTINGS if the request fails.
 *
 * @returns {Promise<Object>} The loaded settings object
 */
export const initSettings = async () => {
  try {
    const response = await fetch(`${API_BASE}/settings`, { headers: apiHeaders() });
    if (!response.ok) {
      throw new Error(`Settings API error: ${response.status} ${response.statusText}`);
    }
    const settings = await response.json();
    _settingsCache = settings;
    return settings;
  } catch (error) {
    console.warn('Failed to load settings from backend, using defaults:', error);
    if (!_settingsCache) {
      _settingsCache = { ...DEFAULT_SETTINGS };
    }
    return _settingsCache;
  }
};

/**
 * Return the current settings from the in-memory cache.
 * Ensure initSettings() has been called first; returns DEFAULT_SETTINGS otherwise.
 *
 * @returns {Object} Settings object
 */
export const loadSettings = () => {
  return _settingsCache || { ...DEFAULT_SETTINGS };
};

/**
 * Persist settings: updates the in-memory cache immediately and fires an
 * async POST to the backend (fire-and-forget; errors are logged but not thrown).
 *
 * @param {Object} settings - Settings object to save
 */
export const saveSettings = (settings) => {
  const settingsToSave = {
    ...settings,
    lastUpdated: new Date().toISOString(),
  };

  // Update cache immediately so synchronous readers see the new values at once.
  _settingsCache = settingsToSave;

  // Persist to backend in the background.
  const { lastUpdated, ...body } = settingsToSave;
  fetch(`${API_BASE}/settings`, {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify(body),
  }).catch(err => {
    console.warn('Failed to save settings to backend:', err);
  });
};

/**
 * Get effective settings (uses activityParams directly)
 * @returns {Object} Effective settings
 */
export const getEffectiveSettings = () => {
  const settings = loadSettings();

  const effective = { ...settings };

  if (!settings.activities) {
    effective.activities = Object.keys(settings.activityParams || {});
    saveSettings(effective);
  } else {
    effective.activities = settings.activities;
  }

  // activityParameters is an alias for activityParams
  effective.activityParameters = settings.activityParams || {};

  for (const activityName of effective.activities) {
    if (!effective.activityParameters[activityName]) {
      effective.activityParameters[activityName] = {};
    }
  }

  return effective;
};

/**
 * Reset settings to defaults via the backend.
 * @returns {Promise<Object>} The reset settings
 */
export const resetToDefaults = async () => {
  try {
    const defaultSettings = { ...DEFAULT_SETTINGS };
    const response = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify(defaultSettings),
    });
    if (!response.ok) {
      throw new Error(`Settings API error: ${response.status}`);
    }
    const saved = await response.json();
    _settingsCache = saved;
    return saved;
  } catch (error) {
    console.warn('Failed to reset settings:', error);
    return { ...DEFAULT_SETTINGS };
  }
};

/**
 * @deprecated Use updateActivityParameter instead
 */
export const updateUserPreferences = (activityName, preferences) => {
  console.warn('updateUserPreferences is deprecated; use updateActivityParameter');
  const updates = {};
  for (const [paramName, config] of Object.entries(preferences)) {
    updates[paramName] = config;
  }
  return updateActivityParameter(activityName, updates);
};

/**
 * Update parameter for an activity (unified)
 * @param {string} activityName
 * @param {Object|string} paramNameOrUpdates
 * @param {Object} [config]
 */
export const updateActivityParameter = (activityName, paramNameOrUpdates, config) => {
  const settings = loadSettings();

  if (!settings.activityParams) {
    settings.activityParams = {};
  }
  if (!settings.activityParams[activityName]) {
    settings.activityParams[activityName] = {};
  }

  let updates = {};
  if (typeof paramNameOrUpdates === 'object' && !config) {
    updates = paramNameOrUpdates;
  } else {
    updates[paramNameOrUpdates] = config;
  }

  for (const [paramName, paramConfig] of Object.entries(updates)) {
    settings.activityParams[activityName][paramName] = { ...paramConfig };
  }

  saveSettings(settings);
  return settings;
};

/**
 * @deprecated Use removeActivityParameter instead
 */
export const removeUserPreference = (activityName, parameterName) => {
  console.warn('removeUserPreference is deprecated; use removeActivityParameter');
  return removeActivityParameter(activityName, parameterName);
};

/**
 * Remove a parameter from activity params
 * @param {string} activityName
 * @param {string} parameterName
 */
export const removeActivityParameter = (activityName, parameterName) => {
  const settings = loadSettings();

  if (settings.activityParams?.[activityName]?.[parameterName]) {
    delete settings.activityParams[activityName][parameterName];

    if (Object.keys(settings.activityParams[activityName]).length === 0) {
      delete settings.activityParams[activityName];
    }

    saveSettings(settings);
  }

  return settings;
};

/**
 * @deprecated Use addActivityParameter instead
 */
export const addUserPreference = (activityName, parameterName, parameterConfig) => {
  console.warn('addUserPreference is deprecated; use addActivityParameter');
  return addActivityParameter(activityName, parameterName, parameterConfig);
};

/**
 * Add a new parameter to activity params
 * @param {string} activityName
 * @param {string} parameterName
 * @param {Object} parameterConfig
 */
export const addActivityParameter = (activityName, parameterName, parameterConfig) => {
  const settings = loadSettings();

  if (!settings.activityParams) {
    settings.activityParams = {};
  }
  if (!settings.activityParams[activityName]) {
    settings.activityParams[activityName] = {};
  }

  settings.activityParams[activityName][parameterName] = { ...parameterConfig };

  saveSettings(settings);
  return settings;
};

/**
 * Validate settings structure and values
 * @param {Object} settings
 * @returns {Array} Array of validation errors
 */
export const validateSettings = (settings) => {
  const errors = [];

  if (!settings) {
    errors.push('Settings object is required');
    return errors;
  }

  if (settings.version !== SETTINGS_VERSION) {
    errors.push(`Invalid settings version: ${settings.version}`);
  }

  if (!settings.activityParams) {
    errors.push('Missing activityParams object');
  }

  if (settings.activityParams) {
    for (const [activityName, parameters] of Object.entries(settings.activityParams)) {
      if (typeof parameters !== 'object' || parameters === null) {
        errors.push(`Invalid parameters for activity ${activityName}`);
        continue;
      }

      for (const [paramName, paramConfig] of Object.entries(parameters)) {
        if (!paramConfig || typeof paramConfig !== 'object') {
          errors.push(`Invalid configuration for parameter ${paramName} in activity ${activityName}`);
          continue;
        }

        if (!paramConfig.type || (paramConfig.type !== 'normalize' && paramConfig.type !== 'inverse')) {
          errors.push(`Invalid type for parameter ${paramName} in activity ${activityName}`);
          continue;
        }

        if (paramConfig.type === 'normalize') {
          if (typeof paramConfig.optimal !== 'number') {
            errors.push(`Invalid optimal value for normalize parameter ${paramName} in activity ${activityName}`);
          }
          if (typeof paramConfig.range !== 'number' || paramConfig.range <= 0) {
            errors.push(`Invalid range value for normalize parameter ${paramName} in activity ${activityName}`);
          }
        } else if (paramConfig.type === 'inverse') {
          if (typeof paramConfig.max !== 'number' || paramConfig.max <= 0) {
            errors.push(`Invalid max value for inverse parameter ${paramName} in activity ${activityName}`);
          }
        }
      }
    }
  }

  return errors;
};

/**
 * Get the current unit preference
 * @returns {string} 'metric' or 'imperial'
 */
export const getUnitPreference = () => {
  const settings = loadSettings();
  return settings.unitPreference || 'metric';
};

/**
 * Set the unit preference
 * @param {string} unit - 'metric' or 'imperial'
 */
export const setUnitPreference = (unit) => {
  if (unit !== 'metric' && unit !== 'imperial') {
    throw new Error('Unit preference must be "metric" or "imperial"');
  }

  const settings = loadSettings();
  settings.unitPreference = unit;
  saveSettings(settings);
};

/**
 * Convert temperature between Celsius and Fahrenheit
 */
export const convertTemperature = (value, fromUnit, toUnit) => {
  if (fromUnit === toUnit) return value;

  if (fromUnit === 'C' && toUnit === 'F') {
    return (value * 9 / 5) + 32;
  } else if (fromUnit === 'F' && toUnit === 'C') {
    return (value - 32) * 5 / 9;
  }

  return value;
};

/**
 * Convert speed between m/s and mph
 */
export const convertSpeed = (value, fromUnit, toUnit) => {
  if (fromUnit === toUnit) return value;

  if (fromUnit === 'm/s' && toUnit === 'mph') {
    return value * 2.23694;
  } else if (fromUnit === 'mph' && toUnit === 'm/s') {
    return value / 2.23694;
  }

  return value;
};

/**
 * Convert distance between meters and feet
 */
export const convertDistance = (value, fromUnit, toUnit) => {
  if (fromUnit === toUnit) return value;

  if (fromUnit === 'm' && toUnit === 'ft') {
    return value * 3.28084;
  } else if (fromUnit === 'ft' && toUnit === 'm') {
    return value / 3.28084;
  }

  return value;
};

/**
 * Get display units for a parameter based on user preference
 */
export const getParameterUnits = (parameter, unitPreference) => {
  const units = {
    'airTemperature': {
      metric:   { unit: '°C', convert: (v) => v },
      imperial: { unit: '°F', convert: (v) => convertTemperature(v, 'C', 'F') }
    },
    'waterTemperature': {
      metric:   { unit: '°C', convert: (v) => v },
      imperial: { unit: '°F', convert: (v) => convertTemperature(v, 'C', 'F') }
    },
    'dewPointTemperature': {
      metric:   { unit: '°C', convert: (v) => v },
      imperial: { unit: '°F', convert: (v) => convertTemperature(v, 'C', 'F') }
    },
    'pressure': {
      metric:   { unit: 'hPa', convert: (v) => v },
      imperial: { unit: 'inHg', convert: (v) => v / 33.863886666667 }
    },
    'visibility': {
      metric:   { unit: 'km', convert: (v) => v },
      imperial: { unit: 'mi', convert: (v) => v * 0.621371 }
    },
    'precipitation': {
      metric:   { unit: 'mm', convert: (v) => v },
      imperial: { unit: 'in', convert: (v) => v * 0.0393701 }
    },
    'windSpeed': {
      metric:   { unit: 'm/s', convert: (v) => v },
      imperial: { unit: 'mph', convert: (v) => convertSpeed(v, 'm/s', 'mph') }
    },
    'gust': {
      metric:   { unit: 'm/s', convert: (v) => v },
      imperial: { unit: 'mph', convert: (v) => convertSpeed(v, 'm/s', 'mph') }
    },
    'currentSpeed': {
      metric:   { unit: 'm/s', convert: (v) => v },
      imperial: { unit: 'mph', convert: (v) => convertSpeed(v, 'm/s', 'mph') }
    },
    'waveHeight': {
      metric:   { unit: 'm', convert: (v) => v },
      imperial: { unit: 'ft', convert: (v) => convertDistance(v, 'm', 'ft') }
    },
    'swellHeight': {
      metric:   { unit: 'm', convert: (v) => v },
      imperial: { unit: 'ft', convert: (v) => convertDistance(v, 'm', 'ft') }
    },
    'default': {
      metric:   { unit: '', convert: (v) => v },
      imperial: { unit: '', convert: (v) => v }
    }
  };

  const paramUnits = units[parameter] || units['default'];
  return paramUnits[unitPreference] || paramUnits['metric'];
};

/**
 * Get the list of activities
 * @returns {Array} Array of activity names
 */
export const getActivityList = () => {
  const settings = loadSettings();
  if (!settings.activities) {
    settings.activities = Object.keys(settings.activityParams || {});
    saveSettings(settings);
  }
  return settings.activities || [];
};

/**
 * Set the list of activities
 * @param {Array} activities
 */
export const setActivityList = (activities) => {
  if (!Array.isArray(activities)) {
    throw new Error('Activities must be an array');
  }

  const settings = loadSettings();
  settings.activities = activities;

  if (settings.activityParams) {
    for (const activity of Object.keys(settings.activityParams)) {
      if (!activities.includes(activity)) {
        delete settings.activityParams[activity];
      }
    }
  }

  saveSettings(settings);
  return settings;
};

/**
 * Add a new activity
 * @param {string} activityName
 */
export const addActivity = (activityName) => {
  if (typeof activityName !== 'string' || !activityName.trim()) {
    throw new Error('Activity name must be a non-empty string');
  }

  const settings = loadSettings();
  if (!settings.activities) {
    settings.activities = Object.keys(settings.activityParams || {});
  }

  if (!settings.activities.includes(activityName)) {
    settings.activities.push(activityName);

    if (!settings.activityParams) {
      settings.activityParams = {};
    }
    if (!settings.activityParams[activityName]) {
      settings.activityParams[activityName] = {};
    }

    saveSettings(settings);
  }

  return settings;
};

/**
 * Remove an activity
 * @param {string} activityName
 */
export const removeActivity = (activityName) => {
  if (typeof activityName !== 'string' || !activityName.trim()) {
    throw new Error('Activity name must be a non-empty string');
  }

  const settings = loadSettings();
  if (settings.activities) {
    const index = settings.activities.indexOf(activityName);
    if (index !== -1) {
      settings.activities.splice(index, 1);
      saveSettings(settings);
    }
  }

  return settings;
};

/**
 * Reorder activities
 * @param {Array} newOrder
 */
export const reorderActivities = (newOrder) => {
  if (!Array.isArray(newOrder)) {
    throw new Error('New order must be an array');
  }

  const settings = loadSettings();
  settings.activities = newOrder;
  saveSettings(settings);
  return settings;
};

/**
 * Get list of valid weather parameters from Stormglass API
 * @returns {Array}
 */
export const getValidWeatherParameters = () => {
  return [
    'airTemperature', 'airTemperature80m', 'airTemperature100m', 'airTemperature1000hpa',
    'airTemperature800hpa', 'airTemperature500hpa', 'airTemperature200hpa', 'pressure',
    'cloudCover', 'humidity', 'dewPointTemperature', 'visibility', 'precipitation',
    'rain', 'snow', 'graupel',
    'windSpeed', 'windSpeed20m', 'windSpeed30m', 'windSpeed40m', 'windSpeed50m',
    'windSpeed80m', 'windSpeed100m', 'windSpeed1000hpa', 'windSpeed800hpa',
    'windSpeed500hpa', 'windSpeed200hpa', 'windDirection', 'windDirection20m',
    'windDirection30m', 'windDirection40m', 'windDirection50m', 'windDirection80m',
    'windDirection100m', 'windDirection1000hpa', 'windDirection800hpa',
    'windDirection500hpa', 'windDirection200hpa', 'gust',
    'waveHeight', 'waveDirection', 'wavePeriod', 'windWaveHeight', 'windWaveDirection',
    'windWavePeriod', 'swellHeight', 'swellDirection', 'swellPeriod',
    'secondarySwellHeight', 'secondarySwellDirection', 'secondarySwellPeriod',
    'waterTemperature',
    'currentSpeed', 'currentDirection',
    'iceCover', 'snowDepth', 'snowAlbedo', 'seaIceThickness', 'seaLevel'
  ];
};

/**
 * Validate a weather parameter name
 * @param {string} parameterName
 * @returns {Object}
 */
export const validateWeatherParameter = (parameterName) => {
  const validParams = getValidWeatherParameters();
  const validParamSet = new Set(validParams);

  if (validParamSet.has(parameterName)) {
    return { isValid: true, parameter: parameterName };
  }

  const similarParams = validParams.filter(param =>
    param.toLowerCase().includes(parameterName.toLowerCase()) ||
    parameterName.toLowerCase().includes(param.toLowerCase())
  );

  return {
    isValid: false,
    parameter: parameterName,
    suggestions: similarParams.slice(0, 5)
  };
};

/**
 * Validate parameter configuration object
 * @param {Object} paramConfig
 * @returns {Object}
 */
export const validateParameterConfig = (paramConfig) => {
  const errors = [];

  if (!paramConfig || typeof paramConfig !== 'object') {
    errors.push('Parameter configuration must be an object');
    return { isValid: false, errors };
  }

  if (!paramConfig.type || (paramConfig.type !== 'normalize' && paramConfig.type !== 'inverse')) {
    errors.push('Parameter type must be "normalize" or "inverse"');
  }

  if (paramConfig.type === 'normalize') {
    if (typeof paramConfig.optimal !== 'number') {
      errors.push('Normalize type requires "optimal" to be a number');
    }
    if (typeof paramConfig.range !== 'number' || paramConfig.range <= 0) {
      errors.push('Normalize type requires "range" to be a positive number');
    }
  } else if (paramConfig.type === 'inverse') {
    if (typeof paramConfig.max !== 'number' || paramConfig.max <= 0) {
      errors.push('Inverse type requires "max" to be a positive number');
    }
  }

  return { isValid: errors.length === 0, errors };
};

/**
 * Validate and clean activity parameters
 * @param {string} activityName
 * @param {Object} preferences
 * @returns {Object}
 */
export const validateAndCleanUserPreferences = (activityName, preferences) => {
  const cleanedPreferences = {};
  const warnings = [];
  const errors = [];

  for (const [paramName, paramConfig] of Object.entries(preferences)) {
    const paramValidation = validateWeatherParameter(paramName);
    if (!paramValidation.isValid) {
      const suggestion = paramValidation.suggestions.length > 0
        ? ` Did you mean: ${paramValidation.suggestions.join(', ')}?`
        : '';
      errors.push(`Invalid parameter '${paramName}' for activity '${activityName}'.${suggestion}`);
      continue;
    }

    const configValidation = validateParameterConfig(paramConfig);
    if (!configValidation.isValid) {
      errors.push(`Invalid configuration for parameter '${paramName}': ${configValidation.errors.join(', ')}`);
      continue;
    }

    cleanedPreferences[paramName] = { ...paramConfig };
  }

  return { isValid: errors.length === 0, cleanedPreferences, warnings, errors };
};

/**
 * @deprecated Use updateActivityParameterWithValidation instead
 */
export const updateUserPreferencesWithValidation = (activityName, preferences, skipValidation = false) => {
  console.warn('updateUserPreferencesWithValidation is deprecated; use updateActivityParameterWithValidation');
  return updateActivityParameterWithValidation(activityName, preferences, skipValidation);
};

/**
 * Enhanced update activity parameter with validation
 * @param {string} activityName
 * @param {Object} preferences
 * @param {boolean} [skipValidation=false]
 * @returns {Object}
 */
export const updateActivityParameterWithValidation = (activityName, preferences, skipValidation = false) => {
  if (!skipValidation) {
    const validation = validateAndCleanUserPreferences(activityName, preferences);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    if (validation.warnings.length > 0) {
      console.warn('Parameter warnings:', validation.warnings);
    }

    preferences = validation.cleanedPreferences;
  }

  return updateActivityParameter(activityName, preferences);
};

/**
 * Get parameter suggestions for an activity type
 * @param {string} activityType
 * @returns {Array}
 */
export const getParameterSuggestions = (activityType) => {
  const suggestions = {
    marine:      ['waveHeight', 'wavePeriod', 'windWaveHeight', 'windWavePeriod', 'swellHeight', 'swellPeriod', 'waterTemperature', 'currentSpeed'],
    atmospheric: ['airTemperature', 'pressure', 'cloudCover', 'humidity', 'precipitation', 'visibility'],
    wind:        ['windSpeed', 'windDirection', 'gust'],
    surfing:     ['swellHeight', 'swellPeriod', 'windSpeed', 'waveHeight', 'wavePeriod'],
    fishing:     ['windSpeed', 'cloudCover', 'waterTemperature', 'currentSpeed'],
    boating:     ['windSpeed', 'waveHeight', 'visibility', 'precipitation'],
    hiking:      ['airTemperature', 'windSpeed', 'cloudCover', 'precipitation', 'humidity'],
    camping:     ['airTemperature', 'windSpeed', 'cloudCover', 'precipitation'],
    beach:       ['airTemperature', 'windSpeed', 'cloudCover', 'humidity'],
    kayaking:    ['windSpeed', 'waveHeight', 'currentSpeed', 'waterTemperature'],
    snorkeling:  ['waterTemperature', 'waveHeight', 'visibility', 'currentSpeed']
  };

  return suggestions[activityType.toLowerCase()] || suggestions.atmospheric;
};

/**
 * Get the current theme preference
 * @returns {string} 'light' or 'dark'
 */
export const getThemePreference = () => {
  const settings = loadSettings();
  return settings.themePreference || 'light';
};

/**
 * Set the theme preference
 * @param {string} theme - 'light' or 'dark'
 */
export const setThemePreference = (theme) => {
  if (theme !== 'light' && theme !== 'dark') {
    throw new Error('Theme preference must be "light" or "dark"');
  }

  const settings = loadSettings();
  settings.themePreference = theme;
  saveSettings(settings);
};
