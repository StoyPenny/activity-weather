import { useEffect, useState } from 'react';
import { fetchWeatherData, calculateAllHourlyRatings, getCacheTimestamp, clearCache } from "./lib/weather";
import { getCurrentLocationOrDefault, saveLocation } from "./lib/location";
import ActivityTimelineCard from "./components/ActivityTimelineCard";
import LocationInput from "./components/LocationInput";
import WeatherSummary from "./components/WeatherSummary";
import WeatherChart from "./components/WeatherChart";
import { RefreshCw, MapPin } from 'lucide-react';

function App() {
  const [ratings, setRatings] = useState(null);
  const [hourlyData, setHourlyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [showLocationInput, setShowLocationInput] = useState(false);

  const loadWeatherData = async (location = null, forceRefresh = false) => {
    try {
      setLoading(!forceRefresh); // Don't show main loading if it's just a refresh
      setRefreshing(forceRefresh);
      setError(null);
      
      // Use provided location or current location
      const targetLocation = location || currentLocation;
      if (!targetLocation) {
        throw new Error('No location available');
      }
      
      const fetchedHourlyData = await fetchWeatherData(targetLocation.lat, targetLocation.lng, forceRefresh);
      const calculatedRatings = calculateAllHourlyRatings(fetchedHourlyData);
      setHourlyData(fetchedHourlyData);
      setRatings(calculatedRatings);
      
      // Update timestamp
      const timestamp = getCacheTimestamp(targetLocation.lat, targetLocation.lng);
      setLastUpdated(timestamp || Date.now());
    } catch (err) {
      setError("Failed to load weather data.");
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    if (currentLocation) {
      clearCache(currentLocation.lat, currentLocation.lng);
      await loadWeatherData(null, true);
    }
  };

  const handleLocationChange = async (newLocation) => {
    try {
      // Save the new location
      saveLocation(newLocation);
      setCurrentLocation(newLocation);
      
      // Load weather data for the new location
      await loadWeatherData(newLocation, true); // Force refresh for new location
    } catch (err) {
      setError("Failed to update location.");
      console.error(err);
    }
  };

  const handleShowLocationInput = () => {
    setShowLocationInput(true);
  };

  const handleCloseLocationInput = () => {
    setShowLocationInput(false);
  };

  // Initialize location and load weather data on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Get current location (from storage or default)
        const location = getCurrentLocationOrDefault();
        setCurrentLocation(location);
        
        // Load weather data for the location
        await loadWeatherData(location);
      } catch (err) {
        setError("Failed to initialize app.");
        console.error(err);
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleString([], {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <main className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <header className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900 dark:text-white mb-4">
            Hourly Activity Planner
          </h1>
          <div className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-4">
            <p className="mb-2">Full-day activity ratings for</p>
            <button
              onClick={handleShowLocationInput}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors font-medium"
            >
              <MapPin className="w-4 h-4" />
              {currentLocation ? currentLocation.name : 'Loading location...'}
            </button>
          </div>
          
          {/* Data freshness and refresh controls */}
          <div className="flex items-center justify-center gap-4 text-sm text-gray-500 dark:text-gray-400">
            {lastUpdated && (
              <span>
                Last updated: {formatTimestamp(lastUpdated)}
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex items-center gap-1 px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh weather data"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
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

        {/* Weather Summary */}
        {hourlyData && !loading && (
          <WeatherSummary hourlyData={hourlyData} />
        )}

        {/* Weather Chart */}
        {hourlyData && !loading && (
          <WeatherChart hourlyData={hourlyData} />
        )}

        {ratings && (
          <div className="grid gap-6 max-w-4xl mx-auto">
            {Object.entries(ratings).map(([activity, hourlyRatings]) => (
              <ActivityTimelineCard key={activity} title={activity} hourlyRatings={hourlyRatings} />
            ))}
          </div>
        )}

        {/* Location Input Modal */}
        {showLocationInput && currentLocation && (
          <LocationInput
            currentLocation={currentLocation}
            onLocationChange={handleLocationChange}
            onClose={handleCloseLocationInput}
          />
        )}
      </main>
    </div>
  );
}

export default App;
