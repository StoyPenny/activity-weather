# Wave Height Data Analysis - Daytona Beach Issue

## Problem Summary
User is experiencing inaccurate wave height data in Daytona Beach, FL. App shows 5+ ft waves when actual conditions are less than 2 ft.

## Current Findings

### 1. Data Source Analysis
- **API**: Stormglass API (fc35270e-e440-11ef-806a-0242ac130003-fc35279a-e440-11ef-806a-0242ac130003)
- **Location**: Daytona Beach, FL (coordinates need verification)
- **Parameters**: Multiple wave parameters available: `waveHeight`, `swellHeight`, `windWaveHeight`

### 2. Code Analysis - Wave Height Display

#### WeatherSummary.jsx (Lines 35-38)
```javascript
const waveHeightUnit = getUnit('waveHeight');
const waveHeightRaw = currentWeather.waveHeight?.sg || 0;
// Convert to display units (match the chart conversion)
const waveHeight = parseFloat(waveHeightUnit.convert(waveHeightRaw).toFixed(2));
```

#### Unit Conversion (settings.js Lines 587-590)
```javascript
'waveHeight': {
  metric: { unit: 'm', convert: (v) => v },
  imperial: { unit: 'ft', convert: (v) => convertDistance(v, 'm', 'ft') }
},
```

#### Distance Conversion (settings.js Lines 529-532)
```javascript
if (fromUnit === 'm' && toUnit === 'ft') {
  // meters to feet
  return value * 3.28084;
}
```

### 3. Potential Issues Identified

#### Issue 1: Wrong Wave Parameter
- App uses `waveHeight` parameter from Stormglass
- Stormglass `waveHeight` might be **significant wave height** (Hs) which is typically higher than actual wave heights
- Should potentially use `swellHeight` or `windWaveHeight` for more accurate surf conditions

#### Issue 2: API Data Accuracy
- Stormglass data might be inaccurate for nearshore conditions
- Model data vs. actual buoy/observation data discrepancy
- Daytona Beach coordinates might be pointing to offshore location

#### Issue 3: Unit Conversion Verification
- Conversion factor: 1 meter = 3.28084 feet ✓ (correct)
- If API returns 1.58m, conversion = 1.58 × 3.28084 = 5.18 ft ✓ (matches screenshot)

### 4. Root Cause Analysis

**Most Likely Cause**: The Stormglass API `waveHeight` parameter is returning **significant wave height** data that represents offshore or deep-water conditions, not the actual breaking wave heights at the beach.

**Evidence**:
- 1.58m (5.18ft) is a reasonable significant wave height for offshore conditions
- User reports actual surf is <2ft, which would be typical for waves that break and lose energy approaching shore
- The conversion math is correct (1.58m × 3.28084 = 5.18ft)

### 5. Recommended Solutions

#### Solution 1: Use Different Wave Parameter
- Switch from `waveHeight` to `swellHeight` or `windWaveHeight`
- Test which parameter gives more accurate nearshore conditions

#### Solution 2: Apply Wave Height Reduction Factor
- Apply a reduction factor (0.3-0.6) to account for wave energy loss in shallow water
- Formula: `displayHeight = apiHeight × reductionFactor`

#### Solution 3: Location Verification
- Verify Daytona Beach coordinates are pointing to nearshore location
- Consider using multiple coordinate points and averaging

#### Solution 4: Parameter Combination
- Combine multiple wave parameters with weights
- Use swell height for base conditions, wind wave height for local effects

### 6. Testing Plan

1. **API Response Testing**: Examine raw Stormglass response for Daytona Beach
2. **Parameter Comparison**: Test `swellHeight` vs `waveHeight` vs `windWaveHeight`
3. **Location Testing**: Test different coordinates (nearshore vs offshore)
4. **Cross-Reference**: Compare with NOAA buoy data or surf reports
5. **Algorithm Testing**: Test different wave height calculation methods

### 7. Implementation Priority

**High Priority**:
- Switch to `swellHeight` parameter for surf conditions
- Add wave height reduction factor for nearshore conditions

**Medium Priority**:
- Verify and optimize Daytona Beach coordinates
- Add multiple wave parameter support with user selection

**Low Priority**:
- Integrate additional data sources for validation
- Add location-specific wave height adjustments

## Next Steps

1. Test API response with different wave parameters
2. Implement parameter switching capability
3. Add wave height reduction factor for surf conditions
4. Validate against real-world surf reports