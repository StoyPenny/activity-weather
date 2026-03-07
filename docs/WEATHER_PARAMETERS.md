# Weather Parameters Reference

This document provides a comprehensive reference for all available weather parameters in the Activity Weather application, based on the Stormglass API.

## Overview

The application supports 60+ weather parameters from the Stormglass API. These parameters can be used to configure custom activity ratings with automatic validation and fallback handling.

## Parameter Categories

### Atmospheric Parameters
Parameters related to air conditions and general weather.

| Parameter | Description | Unit | Example Use Cases |
|-----------|-------------|------|-------------------|
| `airTemperature` | Air temperature at 2m above ground | °C | All outdoor activities |
| `airTemperature80m` | Air temperature at 80m above sea level | °C | Aviation, high-altitude activities |
| `airTemperature100m` | Air temperature at 100m above sea level | °C | Aviation, high-altitude activities |
| `airTemperature1000hpa` | Air temperature at 1000hpa pressure level | °C | Weather analysis |
| `airTemperature800hpa` | Air temperature at 800hpa pressure level | °C | Weather analysis |
| `airTemperature500hpa` | Air temperature at 500hpa pressure level | °C | Weather analysis |
| `airTemperature200hpa` | Air temperature at 200hpa pressure level | °C | Weather analysis |
| `pressure` | Air pressure | hPa | Weather forecasting |
| `cloudCover` | Total cloud coverage | % | Photography, solar activities |
| `humidity` | Relative humidity | % | Comfort assessment |
| `dewPointTemperature` | Dew point temperature at 2m | °C | Fog prediction, comfort |
| `visibility` | Horizontal visibility | km | Aviation, driving |
| `precipitation` | Mean precipitation | mm/h | All outdoor activities |
| `rain` | Rain-type precipitation | mm/h | Specific rain activities |
| `snow` | Snow-type precipitation | mm/h | Winter sports |
| `graupel` | Graupel-type precipitation | mm/h | Weather analysis |

### Wind Parameters
Parameters related to wind conditions at various altitudes.

| Parameter | Description | Unit | Example Use Cases |
|-----------|-------------|------|-------------------|
| `windSpeed` | Wind speed at 10m above sea level | m/s | Sailing, flying, general activities |
| `windSpeed20m` | Wind speed at 20m above sea level | m/s | Wind energy, tall structures |
| `windSpeed30m` | Wind speed at 30m above sea level | m/s | Wind energy, tall structures |
| `windSpeed40m` | Wind speed at 40m above sea level | m/s | Wind energy, tall structures |
| `windSpeed50m` | Wind speed at 50m above sea level | m/s | Wind energy, tall structures |
| `windSpeed80m` | Wind speed at 80m above sea level | m/s | Aviation, wind energy |
| `windSpeed100m` | Wind speed at 100m above sea level | m/s | Aviation, wind energy |
| `windSpeed1000hpa` | Wind speed at 1000hpa pressure level | m/s | Weather analysis |
| `windSpeed800hpa` | Wind speed at 800hpa pressure level | m/s | Weather analysis |
| `windSpeed500hpa` | Wind speed at 500hpa pressure level | m/s | Weather analysis |
| `windSpeed200hpa` | Wind speed at 200hpa pressure level | m/s | Weather analysis |
| `windDirection` | Wind direction at 10m (0° = from north) | degrees | Sailing, flying, general activities |
| `windDirection20m` | Wind direction at 20m above sea level | degrees | Wind analysis |
| `windDirection30m` | Wind direction at 30m above sea level | degrees | Wind analysis |
| `windDirection40m` | Wind direction at 40m above sea level | degrees | Wind analysis |
| `windDirection50m` | Wind direction at 50m above sea level | degrees | Wind analysis |
| `windDirection80m` | Wind direction at 80m above sea level | degrees | Aviation |
| `windDirection100m` | Wind direction at 100m above sea level | degrees | Aviation |
| `windDirection1000hpa` | Wind direction at 1000hpa pressure level | degrees | Weather analysis |
| `windDirection800hpa` | Wind direction at 800hpa pressure level | degrees | Weather analysis |
| `windDirection500hpa` | Wind direction at 500hpa pressure level | degrees | Weather analysis |
| `windDirection200hpa` | Wind direction at 200hpa pressure level | degrees | Weather analysis |
| `gust` | Wind gust speed | m/s | Safety assessment |

### Marine Parameters
Parameters related to ocean and wave conditions.

| Parameter | Description | Unit | Example Use Cases |
|-----------|-------------|------|-------------------|
| `waveHeight` | Significant height of combined wind and swell waves | m | Surfing, boating, swimming |
| `waveDirection` | Direction of combined waves (0° = from north) | degrees | Surfing, navigation |
| `wavePeriod` | Period of combined wind and swell waves | seconds | Surfing, marine activities |
| `windWaveHeight` | Height of wind waves only | m | Surfing, boating |
| `windWaveDirection` | Direction of wind waves (0° = from north) | degrees | Surfing, navigation |
| `windWavePeriod` | Period of wind waves | seconds | Surfing, marine activities |
| `swellHeight` | Height of swell waves | m | Surfing, long-distance boating |
| `swellDirection` | Direction of swell waves (0° = from north) | degrees | Surfing, navigation |
| `swellPeriod` | Period of swell waves | seconds | Surfing, marine activities |
| `secondarySwellHeight` | Height of secondary swell waves | m | Advanced surfing analysis |
| `secondarySwellDirection` | Direction of secondary swell waves | degrees | Advanced surfing analysis |
| `secondarySwellPeriod` | Period of secondary swell waves | seconds | Advanced surfing analysis |
| `waterTemperature` | Water temperature | °C | Swimming, diving, water sports |

### Current Parameters
Parameters related to ocean currents.

| Parameter | Description | Unit | Example Use Cases |
|-----------|-------------|------|-------------------|
| `currentSpeed` | Speed of ocean current | m/s | Swimming, diving, navigation |
| `currentDirection` | Direction of current (0° = from north) | degrees | Navigation, diving |

### Ice and Snow Parameters
Parameters related to ice and snow conditions.

| Parameter | Description | Unit | Example Use Cases |
|-----------|-------------|------|-------------------|
| `iceCover` | Ice cover factor (0.0 to 1.0) | unitless | Arctic activities, shipping |
| `snowDepth` | Depth of snow | m | Winter sports, transportation |
| `snowAlbedo` | Reflectivity of snow cover (0.0 to 1.0) | unitless | Solar radiation analysis |
| `seaIceThickness` | Thickness of sea ice | m | Arctic navigation |
| `seaLevel` | Sea level relative to MSL | m | Coastal activities, tides |

## Parameter Configuration

### Configuration Types

#### Normalize Type
Used when there's an optimal value and performance decreases as you move away from it.

```javascript
{
  type: 'normalize',
  optimal: 25,    // Optimal value
  range: 10       // Range for scoring (±10 from optimal)
}
```

**Example**: Air temperature for hiking - optimal at 22°C, decreases as it gets hotter or colder.

#### Inverse Type
Used when lower values are better (performance decreases as values increase).

```javascript
{
  type: 'inverse',
  max: 15         // Maximum acceptable value
}
```

**Example**: Wind speed for kayaking - calmer is better, gets worse as wind increases.

## Parameter Validation and Fallbacks

The application includes automatic parameter validation with intelligent fallbacks:

### Automatic Fallbacks
- `wavePeriod` → `swellPeriod` → `windWavePeriod`
- `windWaveHeight` → `waveHeight` → `swellHeight`
- `windWavePeriod` → `wavePeriod` → `swellPeriod`
- `currentSpeed` → `windSpeed`
- `currentDirection` → `windDirection`

### Parameter Aliases
- `temp` → `airTemperature`
- `temperature` → `airTemperature`
- `wind` → `windSpeed`
- `waves` → `waveHeight`
- `swell` → `swellHeight`
- `current` → `currentSpeed`

## Activity-Specific Parameter Suggestions

### Marine Activities
**Surfing**: `swellHeight`, `swellPeriod`, `windSpeed`, `waveHeight`, `wavePeriod`, `windWaveHeight`

**Fishing**: `windSpeed`, `cloudCover`, `waterTemperature`, `currentSpeed`

**Boating**: `windSpeed`, `waveHeight`, `visibility`, `precipitation`

**Kayaking**: `windSpeed`, `waveHeight`, `currentSpeed`, `waterTemperature`

**Snorkeling**: `waterTemperature`, `waveHeight`, `visibility`, `currentSpeed`

### Land Activities
**Hiking**: `airTemperature`, `windSpeed`, `cloudCover`, `precipitation`, `humidity`

**Camping**: `airTemperature`, `windSpeed`, `cloudCover`, `precipitation`

**Beach Day**: `airTemperature`, `windSpeed`, `cloudCover`, `humidity`

## Error Handling

The system provides comprehensive error handling:

1. **Invalid Parameters**: Suggestions for similar valid parameters
2. **Missing Data**: Automatic fallback to similar parameters
3. **Configuration Errors**: Clear error messages with correction guidance
4. **Graceful Degradation**: Activities continue to work even with some invalid parameters

## Example Usage

```javascript
// Example activity configuration
const surfingConfig = {
  swellHeight: {
    type: 'normalize',
    optimal: 1.5,
    range: 1.5
  },
  swellPeriod: {
    type: 'normalize',
    optimal: 8,
    range: 4
  },
  windSpeed: {
    type: 'inverse',
    max: 10
  }
};
```

## Best Practices

1. **Choose Relevant Parameters**: Select parameters that actually affect your activity
2. **Use Appropriate Types**: Normalize for optimal ranges, inverse for "less is better"
3. **Consider Fallbacks**: The system will automatically use similar parameters if your first choice isn't available
4. **Test Configurations**: Use the application's validation to ensure your parameters work correctly
5. **Start Simple**: Begin with 2-3 key parameters and add more as needed

## API Limitations

- Parameters are sourced from the Stormglass API
- Not all parameters may be available for all locations
- Marine parameters are only available for coastal/ocean locations
- Some specialized parameters may have limited coverage

For the most up-to-date parameter availability, refer to the [Stormglass API documentation](https://docs.stormglass.io/).