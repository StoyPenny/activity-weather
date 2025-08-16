import { useEffect, useState } from 'react';
import { fetchWeatherData, calculateAllHourlyRatings } from "./lib/weather";
import ActivityTimelineCard from "./components/ActivityTimelineCard";

function App() {
  const [ratings, setRatings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadWeatherData = async () => {
      try {
        setLoading(true);
        setError(null);
        const hourlyData = await fetchWeatherData();
        const calculatedRatings = calculateAllHourlyRatings(hourlyData);
        setRatings(calculatedRatings);
      } catch (err) {
        setError("Failed to load weather data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadWeatherData();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 dark:text-white mb-4">
            Hourly Activity Planner
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Full-day activity ratings for Port Orange, Florida
          </p>
        </header>

        {loading && (
          <div className="flex flex-col justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-blue-500 dark:border-gray-700 dark:border-t-blue-400"></div>
            <p className="mt-6 text-xl text-gray-600 dark:text-gray-400">Calculating Daily Ratings...</p>
          </div>
        )}
        
        {error && (
          <div className="text-center py-12">
            <p className="text-red-600 dark:text-red-400 text-lg font-medium">{error}</p>
          </div>
        )}

        {ratings && (
          <div className="grid gap-6 max-w-4xl mx-auto">
            {Object.entries(ratings).map(([activity, hourlyRatings]) => (
              <ActivityTimelineCard key={activity} title={activity} hourlyRatings={hourlyRatings} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
