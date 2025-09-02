import { useMemo } from 'react';
import { Card } from './ui/card';
import ForecastCard from './ForecastCard';
import { filterForecastDataByDate, getAvailableForecastDates } from '../lib/weather';
import { Calendar } from 'lucide-react';

const WeeklyForecast = ({ forecastData, unitPreference = 'metric', onDaySelect }) => {
  const weeklyData = useMemo(() => {
    if (!forecastData || !forecastData.hours) {
      return [];
    }

    const availableDates = getAvailableForecastDates(forecastData);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get the next 7 days (starting from tomorrow)
    const next7Days = [];
    for (let i = 1; i <= 7; i++) {
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + i);

      // Find the closest available date in the forecast data
      const availableDate = availableDates.find(date =>
        date.toDateString() === targetDate.toDateString()
      );

      if (availableDate) {
        const dayData = filterForecastDataByDate(forecastData, availableDate);
        if (dayData && dayData.hours && dayData.hours.length > 0) {
          next7Days.push({
            date: availableDate,
            data: dayData
          });
        }
      }
    }

    return next7Days;
  }, [forecastData]);

  const handleDayClick = (dayData) => {
    if (onDaySelect && dayData.date) {
      onDaySelect(dayData.date);
    }
  };

  if (!forecastData || weeklyData.length === 0) {
    return null;
  }

  return (
    <Card className="p-4 mb-8 md:p-6 bg-white dark:bg-blue-950/20 dark:border-blue-900/50 rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-500" />
          7-Day Forecast
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Weather outlook for the coming week
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4">
        {weeklyData.map((day, index) => (
          <ForecastCard
            key={index}
            dayData={day.data}
            unitPreference={unitPreference}
            onClick={() => handleDayClick(day)}
          />
        ))}
      </div>

      {weeklyData.length < 7 && (
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Showing {weeklyData.length} of 7 days (forecast data may be limited)
          </p>
        </div>
      )}
    </Card>
  );
};

export default WeeklyForecast;
