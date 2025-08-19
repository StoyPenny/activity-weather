// Test script for unit conversion functionality
import { convertTemperature, convertSpeed, convertDistance, getParameterUnits } from './settings';
import { saveLocation, loadLocation, clearStoredLocation } from './location';

console.log('=== Unit Conversion Test ===');

// Test temperature conversion
console.log('\n1. Temperature Conversion Tests:');
console.log('20°C to °F:', convertTemperature(20, 'C', 'F').toFixed(1) + '°F');
console.log('68°F to °C:', convertTemperature(68, 'F', 'C').toFixed(1) + '°C');
console.log('0°C to °F:', convertTemperature(0, 'C', 'F').toFixed(1) + '°F');
console.log('32°F to °C:', convertTemperature(32, 'F', 'C').toFixed(1) + '°C');

// Test speed conversion
console.log('\n2. Speed Conversion Tests:');
console.log('10 m/s to mph:', convertSpeed(10, 'm/s', 'mph').toFixed(1) + ' mph');
console.log('22.37 mph to m/s:', convertSpeed(22.37, 'mph', 'm/s').toFixed(1) + ' m/s');
console.log('5 m/s to mph:', convertSpeed(5, 'm/s', 'mph').toFixed(1) + ' mph');
console.log('11.18 mph to m/s:', convertSpeed(11.18, 'mph', 'm/s').toFixed(1) + ' m/s');

// Test distance conversion
console.log('\n3. Distance Conversion Tests:');
console.log('2 m to ft:', convertDistance(2, 'm', 'ft').toFixed(1) + ' ft');
console.log('6.56 ft to m:', convertDistance(6.56, 'ft', 'm').toFixed(1) + ' m');
console.log('1 m to ft:', convertDistance(1, 'm', 'ft').toFixed(1) + ' ft');
console.log('3.28 ft to m:', convertDistance(3.28, 'ft', 'm').toFixed(1) + ' m');

// Test parameter units
console.log('\n4. Parameter Units Tests:');
console.log('airTemperature (metric):', getParameterUnits('airTemperature', 'metric'));
console.log('airTemperature (imperial):', getParameterUnits('airTemperature', 'imperial'));
console.log('windSpeed (metric):', getParameterUnits('windSpeed', 'metric'));
console.log('windSpeed (imperial):', getParameterUnits('windSpeed', 'imperial'));
console.log('waveHeight (metric):', getParameterUnits('waveHeight', 'metric'));
console.log('waveHeight (imperial):', getParameterUnits('waveHeight', 'imperial'));

console.log('\n=== Test Summary ===');
console.log('All unit conversion tests completed.');

// Multi-location persistence tests
console.log('\n=== Multi-location Storage Test ===');
const testLocations = [
  { name: 'New York, NY', lat: 40.7128, lng: -74.006 },
  { name: 'Los Angeles, CA', lat: 34.0522, lng: -118.2437 }
];
saveLocation(testLocations);
const loaded = loadLocation();
console.log('Saved 2 locations, loaded:', loaded);

clearStoredLocation();
const cleared = loadLocation();
console.log('After clearing, loaded locations:', cleared);