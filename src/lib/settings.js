// --- SETTINGS MANAGEMENT SYSTEM ---
const SETTINGS_STORAGE_KEY = 'activity_scoring_settings';
const SETTINGS_VERSION = 1;

// Default settings for all activities and parameters
const DEFAULT_SETTINGS = {
  version: SETTINGS_VERSION,
  lastUpdated: new Date().toISOString(),
  unitPreference: 'metric', // 'metric' or 'imperial'
  defaults: {
    'Surfing': {
      'swellHeight': {
        type: 'normalize',
        optimal: 1.5,
        range: 1.5
      },
      'swellPeriod': {
        type: 'normalize',
        optimal: 8,
        range: 4
      },
      'windSpeed': {
        type: 'normalize',
        optimal: 3,
        range: 5
      }
    },
    'Fishing': {
      'windSpeed': {
        type: 'inverse',
        max: 10
      },
      'cloudCover': {
        type: 'normalize',
        optimal: 40,
        range: 30
      }
    },
    'Boating': {
      'windSpeed': {
        type: 'inverse',
        max: 12
      },
      'waveHeight': {
        type: 'inverse',
        max: 1
      }
    },
    'Hiking': {
      'airTemperature': {
        type: 'normalize',
        optimal: 22,
        range: 10
      },
      'windSpeed': {
        type: 'inverse',
        max: 10
      },
      'cloudCover': {
        type: 'inverse',
        max: 80
      }
    },
    'Camping': {
      'airTemperature': {
        type: 'normalize',
        optimal: 20,
        range: 10
      },
      'windSpeed': {
        type: 'inverse',
        max: 8
      },
      'cloudCover': {
        type: 'inverse',
        max: 90
      }
    },
    'Beach Day': {
      'airTemperature': {
        type: 'normalize',
        optimal: 28,
        range: 8
      },
      'windSpeed': {
        type: 'normalize',
        optimal: 4,
        range: 6
      },
      'cloudCover': {
        type: 'normalize',
        optimal: 15,
        range: 20
      }
    },
    'Kayaking': {
      'windSpeed': {
        type: 'inverse',
        max: 6
      },
      'waveHeight': {
        type: 'inverse',
        max: 0.5
      }
    },
    'Snorkeling': {
      'waterTemperature': {
        type: 'normalize',
        optimal: 26,
        range: 6
      },
      'waveHeight': {
        type: 'inverse',
        max: 0.3
      }
    }
  },
  userPreferences: {}
};

/**
 * Load settings from localStorage
 * @returns {Object} Settings object
 */
export const loadSettings = () => {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!stored) {
      return { ...DEFAULT_SETTINGS };
    }

    const parsed = JSON.parse(stored);
    
    // Validate version and structure
    if (parsed.version !== SETTINGS_VERSION) {
      console.warn('Settings version mismatch, resetting to defaults');
      return { ...DEFAULT_SETTINGS };
    }
    
    // Merge with defaults to ensure all activities/parameters exist
    const merged = {
      ...DEFAULT_SETTINGS,
      ...parsed,
      defaults: {
        ...DEFAULT_SETTINGS.defaults,
        ...parsed.defaults
      },
      userPreferences: parsed.userPreferences || {}
    };
    
    return merged;
  } catch (error) {
    console.warn('Failed to load settings, using defaults:', error);
    return { ...DEFAULT_SETTINGS };
  }
};

/**
 * Save settings to localStorage
 * @param {Object} settings - Settings object to save
 */
export const saveSettings = (settings) => {
  try {
    const settingsToSave = {
      ...settings,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settingsToSave));
    console.log('Settings saved successfully');
  } catch (error) {
    console.warn('Failed to save settings:', error);
  }
};

/**
 * Get effective settings (defaults merged with user preferences)
 * @returns {Object} Effective settings
 */
export const getEffectiveSettings = () => {
  const settings = loadSettings();
  
  // Merge defaults with user preferences
  const effective = { ...settings };
  effective.activities = {};
  
  // For each activity, merge defaults with user preferences
  for (const [activityName, defaultParams] of Object.entries(settings.defaults)) {
    effective.activities[activityName] = {
      ...defaultParams,
      ...(settings.userPreferences[activityName] || {})
    };
  }
  
  return effective;
};

/**
 * Reset settings to defaults
 */
export const resetToDefaults = () => {
  try {
    const defaultSettings = {
      ...DEFAULT_SETTINGS,
      lastUpdated: new Date().toISOString(),
      userPreferences: {}
    };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(defaultSettings));
    console.log('Settings reset to defaults');
    return defaultSettings;
  } catch (error) {
    console.warn('Failed to reset settings:', error);
    return { ...DEFAULT_SETTINGS };
  }
};

/**
 * Update user preferences for an activity
 * @param {string} activityName - Name of the activity
 * @param {Object} preferences - Parameter preferences to update
 */
export const updateUserPreferences = (activityName, preferences) => {
  const settings = loadSettings();
  
  // Initialize userPreferences if it doesn't exist
  if (!settings.userPreferences) {
    settings.userPreferences = {};
  }
  
  // Initialize activity preferences if they don't exist
  if (!settings.userPreferences[activityName]) {
    settings.userPreferences[activityName] = {};
  }
  
  // Update the preferences
  settings.userPreferences[activityName] = {
    ...settings.userPreferences[activityName],
    ...preferences
  };
  
  saveSettings(settings);
  return settings;
};

/**
 * Remove a parameter from user preferences
 * @param {string} activityName - Name of the activity
 * @param {string} parameterName - Name of the parameter to remove
 */
export const removeUserPreference = (activityName, parameterName) => {
  const settings = loadSettings();
  
  if (settings.userPreferences?.[activityName]?.[parameterName]) {
    delete settings.userPreferences[activityName][parameterName];
    
    // Clean up empty activity object
    if (Object.keys(settings.userPreferences[activityName]).length === 0) {
      delete settings.userPreferences[activityName];
    }
    
    saveSettings(settings);
  }
  
  return settings;
};

/**
 * Add a new parameter to user preferences
 * @param {string} activityName - Name of the activity
 * @param {string} parameterName - Name of the parameter to add
 * @param {Object} parameterConfig - Configuration for the parameter
 */
export const addUserPreference = (activityName, parameterName, parameterConfig) => {
  const settings = loadSettings();
  
  // Initialize userPreferences if it doesn't exist
  if (!settings.userPreferences) {
    settings.userPreferences = {};
  }
  
  // Initialize activity preferences if they don't exist
  if (!settings.userPreferences[activityName]) {
    settings.userPreferences[activityName] = {};
  }
  
  // Add the parameter
  settings.userPreferences[activityName][parameterName] = parameterConfig;
  
  saveSettings(settings);
  return settings;
};

/**
 * Validate settings structure and values
 * @param {Object} settings - Settings to validate
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
  
  if (!settings.defaults) {
    errors.push('Missing defaults object');
  }
  
  if (!settings.userPreferences) {
    errors.push('Missing userPreferences object');
  }
  
  // Validate each activity's parameters
  const allActivities = {
    ...settings.defaults,
    ...settings.userPreferences
  };
  
  for (const [activityName, parameters] of Object.entries(allActivities)) {
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
 * @param {number} value - Temperature value
 * @param {string} fromUnit - Source unit ('C' or 'F')
 * @param {string} toUnit - Target unit ('C' or 'F')
 * @returns {number} Converted temperature
 */
export const convertTemperature = (value, fromUnit, toUnit) => {
  if (fromUnit === toUnit) return value;
  
  if (fromUnit === 'C' && toUnit === 'F') {
    // Celsius to Fahrenheit
    return (value * 9/5) + 32;
  } else if (fromUnit === 'F' && toUnit === 'C') {
    // Fahrenheit to Celsius
    return (value - 32) * 5/9;
  }
  
  return value;
};

/**
 * Convert speed between m/s and mph
 * @param {number} value - Speed value
 * @param {string} fromUnit - Source unit ('m/s' or 'mph')
 * @param {string} toUnit - Target unit ('m/s' or 'mph')
 * @returns {number} Converted speed
 */
export const convertSpeed = (value, fromUnit, toUnit) => {
  if (fromUnit === toUnit) return value;
  
  if (fromUnit === 'm/s' && toUnit === 'mph') {
    // m/s to mph
    return value * 2.23694;
  } else if (fromUnit === 'mph' && toUnit === 'm/s') {
    // mph to m/s
    return value / 2.23694;
  }
  
  return value;
};

/**
 * Convert distance between meters and feet
 * @param {number} value - Distance value
 * @param {string} fromUnit - Source unit ('m' or 'ft')
 * @param {string} toUnit - Target unit ('m' or 'ft')
 * @returns {number} Converted distance
 */
export const convertDistance = (value, fromUnit, toUnit) => {
  if (fromUnit === toUnit) return value;
  
  if (fromUnit === 'm' && toUnit === 'ft') {
    // meters to feet
    return value * 3.28084;
  } else if (fromUnit === 'ft' && toUnit === 'm') {
    // feet to meters
    return value / 3.28084;
  }
  
  return value;
};

/**
 * Get display units for a parameter based on user preference
 * @param {string} parameter - Parameter name
 * @param {string} unitPreference - 'metric' or 'imperial'
 * @returns {Object} Object with unit and conversion info
 */
export const getParameterUnits = (parameter, unitPreference) => {
  const units = {
    // Temperature parameters
    'airTemperature': {
      metric: { unit: '°C', convert: (v) => v },
      imperial: { unit: '°F', convert: (v) => convertTemperature(v, 'C', 'F') }
    },
    'waterTemperature': {
      metric: { unit: '°C', convert: (v) => v },
      imperial: { unit: '°F', convert: (v) => convertTemperature(v, 'C', 'F') }
    },
    'dewPointTemperature': {
      metric: { unit: '°C', convert: (v) => v },
      imperial: { unit: '°F', convert: (v) => convertTemperature(v, 'C', 'F') }
    },
    'pressure': {
      metric: { unit: 'hPa', convert: (v) => v },
      imperial: { unit: 'inHg', convert: (v) => v / 33.863886666667 }
    },
    'visibility': {
        metric: { unit: 'km', convert: (v) => v },
        imperial: { unit: 'mi', convert: (v) => v * 0.621371 }
    },
    'precipitation': {
        metric: { unit: 'mm', convert: (v) => v },
        imperial: { unit: 'in', convert: (v) => v * 0.0393701 }
    },
    
    // Speed parameters
    'windSpeed': {
      metric: { unit: 'm/s', convert: (v) => v },
      imperial: { unit: 'mph', convert: (v) => convertSpeed(v, 'm/s', 'mph') }
    },
    'gust': {
      metric: { unit: 'm/s', convert: (v) => v },
      imperial: { unit: 'mph', convert: (v) => convertSpeed(v, 'm/s', 'mph') }
    },
    'currentSpeed': {
      metric: { unit: 'm/s', convert: (v) => v },
      imperial: { unit: 'mph', convert: (v) => convertSpeed(v, 'm/s', 'mph') }
    },
    'waveHeight': {
      metric: { unit: 'm', convert: (v) => v },
      imperial: { unit: 'ft', convert: (v) => convertDistance(v, 'm', 'ft') }
    },
    'swellHeight': {
      metric: { unit: 'm', convert: (v) => v },
      imperial: { unit: 'ft', convert: (v) => convertDistance(v, 'm', 'ft') }
    },
    
    // Default (no conversion needed)
    'default': {
      metric: { unit: '', convert: (v) => v },
      imperial: { unit: '', convert: (v) => v }
    }
  };
  
  const paramUnits = units[parameter] || units['default'];
  return paramUnits[unitPreference] || paramUnits['metric'];
};