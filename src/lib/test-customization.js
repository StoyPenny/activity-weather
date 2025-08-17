// Test script for activity scoring customization
import { loadSettings, saveSettings, resetToDefaults, addUserPreference, removeUserPreference } from './settings';
import { calculateAllHourlyRatings } from './weather';

// Test data that mimics the structure of real weather data
const testWeatherData = [
  {
    time: '2025-08-16T08:00:00+00:00',
    airTemperature: { sg: 22 },
    cloudCover: { sg: 10 },
    swellHeight: { sg: 1.2 },
    swellPeriod: { sg: 8 },
    waterTemperature: { sg: 23 },
    waveHeight: { sg: 0.8 },
    windSpeed: { sg: 2 }
  },
  {
    time: '2025-08-16T12:00:00+00:00',
    airTemperature: { sg: 28 },
    cloudCover: { sg: 30 },
    swellHeight: { sg: 2.0 },
    swellPeriod: { sg: 6.5 },
    waterTemperature: { sg: 25 },
    waveHeight: { sg: 1.5 },
    windSpeed: { sg: 6 }
  },
  {
    time: '2025-08-16T16:00:00+00:00',
    airTemperature: { sg: 27 },
    cloudCover: { sg: 55 },
    swellHeight: { sg: 1.8 },
    swellPeriod: { sg: 7 },
    waterTemperature: { sg: 24 },
    waveHeight: { sg: 1.3 },
    windSpeed: { sg: 5 }
  }
];

// Test 1: Load default settings
console.log('Test 1: Loading default settings');
try {
  const defaultSettings = loadSettings();
  console.log('✓ Default settings loaded successfully');
  console.log('✓ Settings version:', defaultSettings.version);
  console.log('✓ Number of activities with defaults:', Object.keys(defaultSettings.defaults).length);
} catch (error) {
  console.error('✗ Failed to load default settings:', error);
}

// Test 2: Add custom parameter
console.log('\nTest 2: Adding custom parameter');
try {
  const customParam = {
    type: 'normalize',
    optimal: 30,
    range: 5
  };
  
  const updatedSettings = addUserPreference('Beach Day', 'airTemperature', customParam);
  console.log('✓ Custom parameter added successfully');
  console.log('✓ Custom airTemperature for Beach Day:', updatedSettings.userPreferences['Beach Day'].airTemperature);
} catch (error) {
  console.error('✗ Failed to add custom parameter:', error);
}

// Test 3: Calculate ratings with custom settings
console.log('\nTest 3: Calculating ratings with custom settings');
try {
  const ratings = calculateAllHourlyRatings(testWeatherData);
  console.log('✓ Ratings calculated successfully');
  console.log('✓ Number of activities with ratings:', Object.keys(ratings).length);
  console.log('✓ Sample Beach Day rating (first hour):', ratings['Beach Day'][0].rating.toFixed(2));
  console.log('✓ Sample Beach Day rating (second hour):', ratings['Beach Day'][1].rating.toFixed(2));
} catch (error) {
  console.error('✗ Failed to calculate ratings:', error);
}

// Test 4: Reset to defaults
console.log('\nTest 4: Resetting to defaults');
try {
  const resetSettings = resetToDefaults();
  console.log('✓ Settings reset to defaults successfully');
  console.log('✓ User preferences after reset:', Object.keys(resetSettings.userPreferences).length === 0 ? 'Empty' : 'Not empty');
} catch (error) {
  console.error('✗ Failed to reset settings:', error);
}

// Test 5: Validate settings structure
console.log('\nTest 5: Validating settings structure');
try {
  const settings = loadSettings();
  // Check that all required activities exist
  const requiredActivities = ['Surfing', 'Fishing', 'Boating', 'Hiking', 'Camping', 'Beach Day', 'Kayaking', 'Snorkeling'];
  const missingActivities = requiredActivities.filter(activity => !settings.defaults[activity]);
  
  if (missingActivities.length === 0) {
    console.log('✓ All required activities present in defaults');
  } else {
    console.log('✗ Missing activities in defaults:', missingActivities);
  }
  
  // Check that each activity has parameters
  let allHaveParameters = true;
  for (const activity of requiredActivities) {
    if (!settings.defaults[activity] || Object.keys(settings.defaults[activity]).length === 0) {
      console.log(`✗ Activity ${activity} has no parameters`);
      allHaveParameters = false;
    }
  }
  
  if (allHaveParameters) {
    console.log('✓ All activities have parameters');
  }
} catch (error) {
  console.error('✗ Failed to validate settings structure:', error);
}

console.log('\n=== Test Summary ===');
console.log('All tests completed. Check output above for any errors.');