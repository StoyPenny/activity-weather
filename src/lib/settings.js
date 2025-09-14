// --- SETTINGS MANAGEMENT SYSTEM ---
const SETTINGS_STORAGE_KEY = 'activity_scoring_settings';
const SETTINGS_VERSION = 4; // New version for unified activityParams structure

// Default settings for all activities and parameters
const DEFAULT_SETTINGS = {
  version: SETTINGS_VERSION,
  lastUpdated: new Date().toISOString(),
  unitPreference: 'metric', // 'metric' or 'imperial'
  themePreference: 'light', // 'light' or 'dark'
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
  }
};

/**
 * Load settings from localStorage
 * @returns {Object} Settings object
 */
export const loadSettings = () => {
  try {
    const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!stored) {
      // First time: initialize with defaults
      const initialSettings = { ...DEFAULT_SETTINGS };
      saveSettings(initialSettings); // Persist the initial template
      return initialSettings;
    }

    const parsed = JSON.parse(stored);
    
    // Handle version migration
    if (parsed.version < SETTINGS_VERSION) {
      console.log(`Migrating settings from version ${parsed.version} to ${SETTINGS_VERSION}`);
      
      let migrated = { ...parsed };
      
      if (parsed.version < 4) {
        // Migrate from v3 or earlier: merge defaults + userPreferences into activityParams
        const oldDefaults = parsed.defaults || DEFAULT_SETTINGS.defaults;
        const oldUserPrefs = parsed.userPreferences || {};
        
        const activityParams = {};
        
        // For activities in the list, merge defaults and user prefs
        const activities = parsed.activities || Object.keys(oldDefaults);
        for (const activity of activities) {
          const defaultsForActivity = oldDefaults[activity] || {};
          const userPrefsForActivity = oldUserPrefs[activity] || {};
          activityParams[activity] = {
            ...defaultsForActivity,
            ...userPrefsForActivity
          };
        }
        
        // For any user prefs not in activities list, add them (rare case)
        for (const activity in oldUserPrefs) {
          if (!activities.includes(activity)) {
            activities.push(activity);
            activityParams[activity] = oldUserPrefs[activity];
          }
        }
        
        migrated = {
          ...DEFAULT_SETTINGS,
          ...parsed,
          version: SETTINGS_VERSION,
          activities: activities,
          activityParams: activityParams,
          // Remove old fields
          defaults: undefined,
          userPreferences: undefined
        };
        
        // Save migrated settings
        saveSettings(migrated);
      }
      
      return migrated;
    }
    
    // For version 4+, return as-is (no merging)
    return parsed;
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
 * Get effective settings (uses activityParams directly)
 * @returns {Object} Effective settings
 */
export const getEffectiveSettings = () => {
  const settings = loadSettings();
  
  const effective = { ...settings };
  
  // Ensure activities list exists
  if (!settings.activities) {
    effective.activities = Object.keys(settings.activityParams || {});
    // Update storage if needed
    saveSettings(effective);
  } else {
    effective.activities = settings.activities;
  }
  
  // activityParameters is now just activityParams
  effective.activityParameters = settings.activityParams || {};
  
  // Ensure all activities in list have params (empty if not)
  for (const activityName of effective.activities) {
    if (!effective.activityParameters[activityName]) {
      effective.activityParameters[activityName] = {};
    }
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
      lastUpdated: new Date().toISOString()
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
 * DEPRECATED: Use updateActivityParameter instead
 * Update user preferences for an activity
 * @param {string} activityName - Name of the activity
 * @param {Object} preferences - Parameter preferences to update
 */
export const updateUserPreferences = (activityName, preferences) => {
  console.warn('updateUserPreferences is deprecated; use updateActivityParameter');
  // For backward compatibility, convert to new API
  const updates = {};
  for (const [paramName, config] of Object.entries(preferences)) {
    updates[paramName] = config;
  }
  return updateActivityParameter(activityName, updates);
};

/**
 * Update parameter for an activity (unified)
 * @param {string} activityName - Name of the activity
 * @param {Object|string} paramNameOrUpdates - Param name and config, or object of updates
 * @param {Object} config - Parameter config (if paramName provided)
 */
export const updateActivityParameter = (activityName, paramNameOrUpdates, config) => {
  const settings = loadSettings();
  
  // Ensure activityParams exists
  if (!settings.activityParams) {
    settings.activityParams = {};
  }
  
  // Ensure activity has params
  if (!settings.activityParams[activityName]) {
    settings.activityParams[activityName] = {};
  }
  
  let updates = {};
  if (typeof paramNameOrUpdates === 'object' && !config) {
    // Bulk update
    updates = paramNameOrUpdates;
  } else {
    // Single update
    updates[paramNameOrUpdates] = config;
  }
  
  // Apply updates
  for (const [paramName, paramConfig] of Object.entries(updates)) {
    settings.activityParams[activityName][paramName] = { ...paramConfig };
  }
  
  saveSettings(settings);
  return settings;
};

/**
 * DEPRECATED: Use removeActivityParameter instead
 * Remove a parameter from user preferences
 * @param {string} activityName - Name of the activity
 * @param {string} parameterName - Name of the parameter to remove
 */
export const removeUserPreference = (activityName, parameterName) => {
  console.warn('removeUserPreference is deprecated; use removeActivityParameter');
  return removeActivityParameter(activityName, parameterName);
};

/**
 * Remove a parameter from activity params
 * @param {string} activityName - Name of the activity
 * @param {string} parameterName - Name of the parameter to remove
 */
export const removeActivityParameter = (activityName, parameterName) => {
  const settings = loadSettings();
  
  if (settings.activityParams?.[activityName]?.[parameterName]) {
    delete settings.activityParams[activityName][parameterName];
    
    // Clean up empty activity params
    if (Object.keys(settings.activityParams[activityName]).length === 0) {
      delete settings.activityParams[activityName];
    }
    
    saveSettings(settings);
  }
  
  return settings;
};

/**
 * DEPRECATED: Use addActivityParameter instead
 * Add a new parameter to user preferences
 * @param {string} activityName - Name of the activity
 * @param {string} parameterName - Name of the parameter to add
 * @param {Object} parameterConfig - Configuration for the parameter
 */
export const addUserPreference = (activityName, parameterName, parameterConfig) => {
  console.warn('addUserPreference is deprecated; use addActivityParameter');
  return addActivityParameter(activityName, parameterName, parameterConfig);
};

/**
 * Add a new parameter to activity params
 * @param {string} activityName - Name of the activity
 * @param {string} parameterName - Name of the parameter to add
 * @param {Object} parameterConfig - Configuration for the parameter
 */
export const addActivityParameter = (activityName, parameterName, parameterConfig) => {
  const settings = loadSettings();
  
  // Ensure activityParams exists
  if (!settings.activityParams) {
    settings.activityParams = {};
  }
  
  // Ensure activity has params
  if (!settings.activityParams[activityName]) {
    settings.activityParams[activityName] = {};
  }
  
  // Add/update the parameter
  settings.activityParams[activityName][parameterName] = { ...parameterConfig };
  
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
  
  if (!settings.activityParams) {
    errors.push('Missing activityParams object');
  }
  
  // Validate each activity's parameters in activityParams
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

/**
 * Get the list of activities
 * @returns {Array} Array of activity names
 */
export const getActivityList = () => {
  const settings = loadSettings();
  // If no activities list exists, create one from activityParams keys
  if (!settings.activities) {
    settings.activities = Object.keys(settings.activityParams || {});
    saveSettings(settings);
  }
  return settings.activities || [];
};

/**
 * Set the list of activities
 * @param {Array} activities - Array of activity names
 */
export const setActivityList = (activities) => {
  if (!Array.isArray(activities)) {
    throw new Error('Activities must be an array');
  }
  
  const settings = loadSettings();
  settings.activities = activities;
  
  // Remove params for removed activities
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
 * @param {string} activityName - Name of the activity to add
 */
export const addActivity = (activityName) => {
  if (typeof activityName !== 'string' || !activityName.trim()) {
    throw new Error('Activity name must be a non-empty string');
  }
  
  const settings = loadSettings();
  // Initialize activities array if it doesn't exist
  if (!settings.activities) {
    settings.activities = Object.keys(settings.activityParams || {});
  }
  
  // Add the activity if it doesn't already exist
  if (!settings.activities.includes(activityName)) {
    settings.activities.push(activityName);
    
    // Initialize empty params for new activity
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
 * @param {string} activityName - Name of the activity to remove
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
 * @param {Array} newOrder - Array of activity names in the new order
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
 * @returns {Array} Array of valid parameter names
 */
export const getValidWeatherParameters = () => {
  // Import the WEATHER_PARAMS from weather.js
  // Note: This is a static list based on Stormglass API documentation
  return [
    // Basic atmospheric parameters
    'airTemperature', 'airTemperature80m', 'airTemperature100m', 'airTemperature1000hpa',
    'airTemperature800hpa', 'airTemperature500hpa', 'airTemperature200hpa', 'pressure',
    'cloudCover', 'humidity', 'dewPointTemperature', 'visibility', 'precipitation',
    'rain', 'snow', 'graupel',
    
    // Wind parameters
    'windSpeed', 'windSpeed20m', 'windSpeed30m', 'windSpeed40m', 'windSpeed50m',
    'windSpeed80m', 'windSpeed100m', 'windSpeed1000hpa', 'windSpeed800hpa',
    'windSpeed500hpa', 'windSpeed200hpa', 'windDirection', 'windDirection20m',
    'windDirection30m', 'windDirection40m', 'windDirection50m', 'windDirection80m',
    'windDirection100m', 'windDirection1000hpa', 'windDirection800hpa',
    'windDirection500hpa', 'windDirection200hpa', 'gust',
    
    // Wave and marine parameters
    'waveHeight', 'waveDirection', 'wavePeriod', 'windWaveHeight', 'windWaveDirection',
    'windWavePeriod', 'swellHeight', 'swellDirection', 'swellPeriod',
    'secondarySwellHeight', 'secondarySwellDirection', 'secondarySwellPeriod',
    'waterTemperature',
    
    // Current parameters
    'currentSpeed', 'currentDirection',
    
    // Ice and snow parameters
    'iceCover', 'snowDepth', 'snowAlbedo', 'seaIceThickness', 'seaLevel'
  ];
};

/**
 * Validate a weather parameter name
 * @param {string} parameterName - Parameter name to validate
 * @returns {Object} Validation result with isValid, suggestions, etc.
 */
export const validateWeatherParameter = (parameterName) => {
  const validParams = getValidWeatherParameters();
  const validParamSet = new Set(validParams);
  
  // Check if parameter is valid
  if (validParamSet.has(parameterName)) {
    return { isValid: true, parameter: parameterName };
  }
  
  // Check for similar parameters (fuzzy matching)
  const similarParams = validParams.filter(param =>
    param.toLowerCase().includes(parameterName.toLowerCase()) ||
    parameterName.toLowerCase().includes(param.toLowerCase())
  );
  
  return {
    isValid: false,
    parameter: parameterName,
    suggestions: similarParams.slice(0, 5) // Limit to top 5 suggestions
  };
};

/**
 * Validate parameter configuration object
 * @param {Object} paramConfig - Parameter configuration to validate
 * @returns {Object} Validation result
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
 * Validate and clean activity parameters (formerly user preferences)
 * @param {string} activityName - Name of the activity
 * @param {Object} preferences - Parameter preferences to validate
 * @returns {Object} Validation result with cleaned preferences
 */
export const validateAndCleanUserPreferences = (activityName, preferences) => {
  const cleanedPreferences = {};
  const warnings = [];
  const errors = [];
  
  for (const [paramName, paramConfig] of Object.entries(preferences)) {
    // Validate parameter name
    const paramValidation = validateWeatherParameter(paramName);
    if (!paramValidation.isValid) {
      const suggestion = paramValidation.suggestions.length > 0
        ? ` Did you mean: ${paramValidation.suggestions.join(', ')}?`
        : '';
      errors.push(`Invalid parameter '${paramName}' for activity '${activityName}'.${suggestion}`);
      continue;
    }
    
    // Validate parameter configuration
    const configValidation = validateParameterConfig(paramConfig);
    if (!configValidation.isValid) {
      errors.push(`Invalid configuration for parameter '${paramName}': ${configValidation.errors.join(', ')}`);
      continue;
    }
    
    // Parameter is valid, add to cleaned preferences
    cleanedPreferences[paramName] = { ...paramConfig };
  }
  
  return {
    isValid: errors.length === 0,
    cleanedPreferences,
    warnings,
    errors
  };
};

/**
 * DEPRECATED: Use updateActivityParameterWithValidation instead
 * Enhanced update user preferences with validation
 * @param {string} activityName - Name of the activity
 * @param {Object} preferences - Parameter preferences to update
 * @param {boolean} skipValidation - Skip validation (for internal use)
 * @returns {Object} Updated settings or validation errors
 */
export const updateUserPreferencesWithValidation = (activityName, preferences, skipValidation = false) => {
  console.warn('updateUserPreferencesWithValidation is deprecated; use updateActivityParameterWithValidation');
  return updateActivityParameterWithValidation(activityName, preferences, skipValidation);
};

/**
 * Enhanced update activity parameter with validation
 * @param {string} activityName - Name of the activity
 * @param {Object} preferences - Parameter preferences to update
 * @param {boolean} skipValidation - Skip validation (for internal use)
 * @returns {Object} Updated settings or validation errors
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
    
    // Use cleaned preferences
    preferences = validation.cleanedPreferences;
  }
  
  // Use the new updateActivityParameter function
  return updateActivityParameter(activityName, preferences);
};

/**
 * Get parameter suggestions for an activity type
 * @param {string} activityType - Type of activity (e.g., 'marine', 'atmospheric', 'wind')
 * @returns {Array} Array of suggested parameters
 */
export const getParameterSuggestions = (activityType) => {
  const suggestions = {
    marine: ['waveHeight', 'wavePeriod', 'windWaveHeight', 'windWavePeriod', 'swellHeight', 'swellPeriod', 'waterTemperature', 'currentSpeed'],
    atmospheric: ['airTemperature', 'pressure', 'cloudCover', 'humidity', 'precipitation', 'visibility'],
    wind: ['windSpeed', 'windDirection', 'gust'],
    surfing: ['swellHeight', 'swellPeriod', 'windSpeed', 'waveHeight', 'wavePeriod'],
    fishing: ['windSpeed', 'cloudCover', 'waterTemperature', 'currentSpeed'],
    boating: ['windSpeed', 'waveHeight', 'visibility', 'precipitation'],
    hiking: ['airTemperature', 'windSpeed', 'cloudCover', 'precipitation', 'humidity'],
    camping: ['airTemperature', 'windSpeed', 'cloudCover', 'precipitation'],
    beach: ['airTemperature', 'windSpeed', 'cloudCover', 'humidity'],
    kayaking: ['windSpeed', 'waveHeight', 'currentSpeed', 'waterTemperature'],
    snorkeling: ['waterTemperature', 'waveHeight', 'visibility', 'currentSpeed']
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
