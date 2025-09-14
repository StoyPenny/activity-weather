import { Thermometer, Droplets, Eye, Wind, Gauge, CloudRain, Waves, Bubbles } from 'lucide-react';
import { Card } from './ui/card';
import { 
  getCurrentWeatherData, 
  calculateFeelsLike, 
  getWindDirection, 
  getPrecipitationChance,
} from '../lib/weather';
import { getParameterUnits } from '../lib/settings';

const WeatherSummary = ({ hourlyData, unitPreference = 'metric' }) => {
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

  const windSpeedUnit = getUnit('windSpeed');
  const windSpeed = Math.round(windSpeedUnit.convert(currentWeather.windSpeed?.sg || 0));
  
  const windDir = currentWeather.windDirection?.sg || 0;
  const windDirection = getWindDirection(windDir);

  // const waveHeightUnit = getUnit('waveHeight');
  // const waveHeightRaw = currentWeather.waveHeight?.sg || 0;
  // // Convert to display units (match the chart conversion)
  // const waveHeight = parseFloat(waveHeightUnit.convert(waveHeightRaw).toFixed(2));


  const swellHeightUnit = getUnit('swellHeight');
  const swellHeightRaw = currentWeather.swellHeight?.sg || 0;
  // Convert to display units (match the chart conversion)
  const swellHeight = parseFloat(swellHeightUnit.convert(swellHeightRaw).toFixed(2));
 

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
      value: temp,
      unit: tempUnit.unit.replace('°',''),
      subValue: `Feels like ${feelsLike}°${tempUnit.unit.replace('°','')}`
    },
    {
      icon: CloudRain,
      label: 'Precipitation',
      value: precipChance,
      unit: '%',
      subValue: precipitation > 0 ? `${precipitation.toFixed(2)} ${precipitationUnit.unit}/h` : 'No rain'
    },
    {
      icon: Bubbles,
      label: 'Humidity',
      value: humidity,
      unit: '%',
      subValue: humidity > 70 ? 'High' : humidity > 40 ? 'Moderate' : 'Low'
    },
    {
      icon: Wind,
      label: 'Wind',
      value: windSpeed,
      unit: windSpeedUnit.unit,
      subValue: `${windDirection}`
    },
    {
      icon: Waves,
      label: 'Swell Height',
      value: swellHeight,
      unit:swellHeightUnit.unit,
      subValue: swellHeight > 5 ? 'Great' : swellHeight > 3 ? 'Normal' : 'Low'
    },
    {
      icon: Eye,
      label: 'Visibility',
      value: visibility,
      unit: visibilityUnit.unit,
      subValue: visibility > 5 ? 'Excellent' : visibility > 3 ? 'Good' : 'Poor'
    }
  ];

  return (
    <Card className="p-4 mb-8 md:p-6 bg-white dark:bg-blue-950/20 dark:border-blue-900/50 rounded-lg shadow-lg">
      
      <h2 className="text-xl text-center text-gray-900 dark:text-white dark:text-opacity-50 mb-2">
        Current Conditions
      </h2>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {weatherItems.map((item, index) => {
          const IconComponent = item.icon;
          return (
            <div key={index} className="flex flex-col items-center text-center p-3 rounded-lg bg-gray-50 dark:bg-blue-900/30 relative">
              <IconComponent className="w-8 h-8 text-blue-500 dark:text-blue-400 dark:opacity-50 mb-1" />
              
              <div className="text-5xl font-bold mb-1 text-gray-900 dark:text-white">
                {item.value}
                <span className="text-xl font-normal ml-1">{item.unit}</span>
              </div>
              <div className="text-xs text-gray-700 dark:text-gray-500">
                {item.subValue}
              </div>
              <div className="text-[0.6rem] text-gray-400 dark:text-gray-400 mb-1">
                {item.label}
              </div>
            </div>
          );
        })}
      </div>

    </Card>
  );
};

export default WeatherSummary;
