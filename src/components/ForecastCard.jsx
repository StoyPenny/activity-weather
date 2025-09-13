import { Card } from './ui/card';
import { getParameterUnits } from '../lib/settings';
import { Cloud, Sun, CloudRain, CloudSnow, Wind, Eye } from 'lucide-react';

const ForecastCard = ({ dayData, unitPreference = 'metric', onClick }) => {
  if (!dayData || !dayData.hours || dayData.hours.length === 0) {
    return null;
  }

  const getUnit = (param) => getParameterUnits(param, unitPreference);

  // Get date information
  const date = new Date(dayData.hours[0].time);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = date.toDateString() === today.toDateString();
  const dayName = isToday ? 'Today' : date.toLocaleDateString([], { weekday: 'short' });
  const monthDay = date.toLocaleDateString([], { month: 'short', day: 'numeric' });

  // Calculate high/low temperatures for the day
  const temperatures = dayData.hours.map(hour => hour.airTemperature?.sg || 0);
  const highTemp = Math.max(...temperatures);
  const lowTemp = Math.min(...temperatures);

  const tempUnit = getUnit('airTemperature');
  const highTempDisplay = Math.round(tempUnit.convert(highTemp));
  const lowTempDisplay = Math.round(tempUnit.convert(lowTemp));

  // Calculate average conditions
  const avgCloudCover = dayData.hours.reduce((sum, hour) => sum + (hour.cloudCover?.sg || 0), 0) / dayData.hours.length;
  const avgPrecipitation = dayData.hours.reduce((sum, hour) => sum + (hour.precipitation?.sg || 0), 0) / dayData.hours.length;
  const maxWindSpeed = Math.max(...dayData.hours.map(hour => hour.windSpeed?.sg || 0));

  const windUnit = getUnit('windSpeed');
  const maxWindDisplay = Math.round(windUnit.convert(maxWindSpeed));

  // Determine weather condition and icon
  const getWeatherCondition = () => {
    if (avgPrecipitation > 2) return { condition: 'Heavy Rain', icon: CloudRain, color: 'text-blue-600' };
    if (avgPrecipitation > 0.5) return { condition: 'Rain', icon: CloudRain, color: 'text-blue-500' };
    if (avgCloudCover > 80) return { condition: 'Cloudy', icon: Cloud, color: 'text-gray-500' };
    if (avgCloudCover > 50) return { condition: 'Partly Cloudy', icon: Cloud, color: 'text-gray-400' };
    if (maxWindSpeed > 15) return { condition: 'Windy', icon: Wind, color: 'text-green-600' };
    return { condition: 'Sunny', icon: Sun, color: 'text-yellow-500' };
  };

  const { condition, icon: WeatherIcon, color } = getWeatherCondition();

  // Calculate precipitation chance
  const precipChance = Math.min(100, Math.max(0,
    avgPrecipitation > 1 ? 80 + avgCloudCover * 0.2 :
    avgPrecipitation > 0.2 ? 40 + avgCloudCover * 0.4 :
    avgCloudCover > 70 ? avgCloudCover * 0.5 :
    avgCloudCover > 40 ? avgCloudCover * 0.3 : 10
  ));

  return (
    <Card
      className="p-4 bg-white dark:bg-blue-950/20 dark:border-blue-900/50 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer hover:scale-105"
      onClick={onClick}
    >
      <div className="text-center">
        {/* Date */}
        <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
          {dayName}
        </div>
        <div className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          {monthDay}
        </div>

        {/* Weather Icon */}
        <div className="flex justify-center mb-3">
          <WeatherIcon className={`w-12 h-12 ${color}`} />
        </div>

        {/* Temperature */}
        <div className="flex justify-center items-baseline gap-1 mb-2">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">
            {highTempDisplay}°
          </span>
          <span className="text-lg text-gray-500 dark:text-gray-400">
            {lowTempDisplay}°
          </span>
        </div>

        {/* Condition */}
        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          {condition}
        </div>

        {/* Precipitation Chance */}
        <div className="flex items-center justify-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <CloudRain className="w-4 h-4" />
          <span>{Math.round(precipChance)}%</span>
        </div>

        {/* Wind Speed */}
        <div className="flex items-center justify-center gap-1 text-sm text-gray-600 dark:text-gray-400 mt-1">
          <Wind className="w-4 h-4" />
          <span>{maxWindDisplay} {windUnit.unit}</span>
        </div>
      </div>
    </Card>
  );
};

export default ForecastCard;
