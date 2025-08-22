import { Thermometer, Droplets, Eye, Wind, Gauge, CloudRain } from 'lucide-react';
import { Card } from './ui/card';
import { 
  getCurrentWeatherData, 
  calculateFeelsLike, 
  getWindDirection, 
  getPrecipitationChance,
} from '../lib/weather';
import { getParameterUnits } from '../lib/settings';

const WeatherSummary = ({ hourlyData, unitPreference = 'metric', activeLocation = null }) => {
  if (!hourlyData || hourlyData.length === 0) {
    return null;
  }

  const currentWeather = getCurrentWeatherData(hourlyData);
  if (!currentWeather) return null;

  // Get unit conversion functions based on preference
  const getUnit = (param) => getParameterUnits(param, unitPreference);

  // Extract and convert weather data
  const tempC = currentWeather.airTemperature?.sg || 0;
  const tempUnit = getUnit('airTemperature');
  const temp = Math.round(tempUnit.convert(tempC));
  
  const humidity = Math.round(currentWeather.humidity?.sg || 0);

  const pressureUnit = getUnit('pressure');
  const pressure = (currentWeather.pressure?.sg || 1013);
  const displayPressure = pressureUnit.convert(pressure).toFixed(2);

  const windSpeedUnit = getUnit('windSpeed');
  const windSpeed = Math.round(windSpeedUnit.convert(currentWeather.windSpeed?.sg || 0));
  
  const windDir = currentWeather.windDirection?.sg || 0;
  const windDirection = getWindDirection(windDir);
  
  const visibilityUnit = getUnit('visibility');
  const visibility = Math.round(visibilityUnit.convert(currentWeather.visibility?.sg || 10));

  const precipitationUnit = getUnit('precipitation');
  const precipitation = precipitationUnit.convert(currentWeather.precipitation?.sg || 0);
  
  const cloudCover = currentWeather.cloudCover?.sg || 0;

  // Calculate derived values
  const feelsLikeC = calculateFeelsLike(tempC, humidity);
  const feelsLike = Math.round(tempUnit.convert(feelsLikeC));
  const precipChance = Math.round(getPrecipitationChance(currentWeather.precipitation?.sg || 0, cloudCover));

  const weatherItems = [
    {
      icon: Thermometer,
      label: 'Temperature',
      value: `${temp}°${tempUnit.unit.replace('°','')}`,
      subValue: `Feels like ${feelsLike}°${tempUnit.unit.replace('°','')}`
    },
    {
      icon: CloudRain,
      label: 'Precipitation',
      value: `${precipChance}%`,
      subValue: precipitation > 0 ? `${precipitation.toFixed(2)} ${precipitationUnit.unit}/h` : 'No rain'
    },
    {
      icon: Droplets,
      label: 'Humidity',
      value: `${humidity}%`,
      subValue: humidity > 70 ? 'High' : humidity > 40 ? 'Moderate' : 'Low'
    },
    {
      icon: Wind,
      label: 'Wind',
      value: `${windSpeed} ${windSpeedUnit.unit}`,
      subValue: `${windDirection}`
    },
    {
      icon: Gauge,
      label: 'Pressure',
      value: `${displayPressure} ${pressureUnit.unit}`,
      subValue: pressure > 1022 ? 'High' : pressure > 1009 ? 'Normal' : 'Low'
    },
    {
      icon: Eye,
      label: 'Visibility',
      value: `${visibility} ${visibilityUnit.unit}`,
      subValue: visibility > 5 ? 'Excellent' : visibility > 3 ? 'Good' : 'Poor'
    }
  ];

  return (
    <Card className="p-6 mb-8 bg-white dark:bg-gray-800 shadow-lg border-l-4 border-l-green-500">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <span className="inline-block w-3 h-3 bg-green-500 rounded-full animate-pulse"></span>
          Current Weather Conditions {activeLocation ? `- ${activeLocation.name}` : ''}
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Live weather data for today - always shows current conditions regardless of forecast day selection
        </p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {weatherItems.map((item, index) => {
          const IconComponent = item.icon;
          return (
            <div key={index} className="flex flex-col items-center text-center p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
              <IconComponent className="w-6 h-6 text-blue-500 dark:text-blue-400 mb-2" />
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                {item.label}
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {item.value}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-500">
                {item.subValue}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default WeatherSummary;