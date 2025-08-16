import { Thermometer, Droplets, Eye, Wind, Gauge, CloudRain } from 'lucide-react';
import { Card } from './ui/card';
import { 
  getCurrentWeatherData, 
  calculateFeelsLike, 
  getWindDirection, 
  getPrecipitationChance 
} from '../lib/weather';

const WeatherSummary = ({ hourlyData }) => {
  if (!hourlyData || hourlyData.length === 0) {
    return null;
  }

  const currentWeather = getCurrentWeatherData(hourlyData);
  if (!currentWeather) return null;

  // Extract weather data with fallback values and convert to Imperial units
  const tempC = currentWeather.airTemperature?.sg || 0;
  const temp = Math.round((tempC * 9/5) + 32); // Convert Celsius to Fahrenheit
  const humidity = Math.round(currentWeather.humidity?.sg || 0);
  const pressureHpa = currentWeather.pressure?.sg || 1013;
  const pressure = Math.round(pressureHpa * 0.02953); // Convert hPa to inHg
  const windSpeedMs = currentWeather.windSpeed?.sg || 0;
  const windSpeed = Math.round(windSpeedMs * 2.237); // Convert m/s to mph
  const windDir = currentWeather.windDirection?.sg || 0;
  const visibilityKm = currentWeather.visibility?.sg || 10;
  const visibility = Math.round(visibilityKm * 0.621371); // Convert km to miles
  const precipitationMm = currentWeather.precipitation?.sg || 0;
  const precipitation = Math.round(precipitationMm * 0.0394 * 100) / 100; // Convert mm/h to in/h
  const cloudCover = currentWeather.cloudCover?.sg || 0;

  // Calculate derived values
  const feelsLikeC = calculateFeelsLike(tempC, humidity);
  const feelsLike = Math.round((feelsLikeC * 9/5) + 32); // Convert feels like to Fahrenheit
  const windDirection = getWindDirection(windDir);
  const precipChance = Math.round(getPrecipitationChance(precipitationMm, cloudCover));

  const weatherItems = [
    {
      icon: Thermometer,
      label: 'Temperature',
      value: `${temp}°F`,
      subValue: `Feels like ${feelsLike}°F`
    },
    {
      icon: CloudRain,
      label: 'Precipitation',
      value: `${precipChance}%`,
      subValue: precipitation > 0 ? `${precipitation.toFixed(2)} in/h` : 'No rain'
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
      value: `${windSpeed} mph`,
      subValue: `${windDirection}`
    },
    {
      icon: Gauge,
      label: 'Pressure',
      value: `${pressure.toFixed(2)} inHg`,
      subValue: pressure > 30.2 ? 'High' : pressure > 29.8 ? 'Normal' : 'Low'
    },
    {
      icon: Eye,
      label: 'Visibility',
      value: `${visibility} mi`,
      subValue: visibility > 5 ? 'Excellent' : visibility > 3 ? 'Good' : 'Poor'
    }
  ];

  return (
    <Card className="p-6 mb-8 bg-white dark:bg-gray-800 shadow-lg">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Current Weather Conditions
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Real-time weather data for your location
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