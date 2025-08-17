import { useEffect, useState } from 'react';
import { fetchWeatherData, calculateAllHourlyRatings, getCacheTimestamp, clearCache } from "./lib/weather";
import { getCurrentLocationOrDefault, saveLocation } from "./lib/location";
import { getUnitPreference, setUnitPreference } from "./lib/settings";
import ActivityTimelineCard from "./components/ActivityTimelineCard";
import LocationInput from "./components/LocationInput";
import CustomizationModal from "./components/CustomizationModal";
import WeatherSummary from "./components/WeatherSummary";
import WeatherChart from "./components/WeatherChart";
import { RefreshCw, MapPin, Settings } from 'lucide-react';

function App() {
  const [ratings, setRatings] = useState(null);
  const [hourlyData, setHourlyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const [needsInitialLocation, setNeedsInitialLocation] = useState(false);
  const [apiQuota, setApiQuota] = useState(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [unitPreference, setUnitPreferenceState] = useState('metric');

  const loadWeatherData = async (location = null, forceRefresh = false) => {
    try {
      setLoading(!forceRefresh); // Don't show main loading if it's just a refresh
      setRefreshing(forceRefresh);
      setError(null);
      setQuotaExceeded(false);
      
      // Use provided location or current location
      const targetLocation = location || currentLocation;
      if (!targetLocation) {
        throw new Error('No location available');
      }
      
      const fetchedData = await fetchWeatherData(targetLocation.lat, targetLocation.lng, forceRefresh);
      const calculatedRatings = calculateAllHourlyRatings(fetchedData.hours);
      setHourlyData(fetchedData.hours);
      setRatings(calculatedRatings);
      
      // Store API quota information if available
      if (fetchedData.meta) {
        setApiQuota(fetchedData.meta);
      }
      
      // Update timestamp
      const timestamp = getCacheTimestamp(targetLocation.lat, targetLocation.lng);
      setLastUpdated(timestamp || Date.now());
    } catch (err) {
      // Handle quota exceeded error specially
      if (err.message === 'API quota exceeded' && err.quotaMeta) {
        setQuotaExceeded(true);
        setApiQuota(err.quotaMeta);
        setError("API quota exceeded. Showing cached data.");
      } else {
        setError("Failed to load weather data.");
      }
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    if (currentLocation && !quotaExceeded) {
      clearCache(currentLocation.lat, currentLocation.lng);
      await loadWeatherData(null, true);
    }
  };

  const handleLocationChange = async (newLocation) => {
    try {
      // Save the new location
      saveLocation(newLocation);
      setCurrentLocation(newLocation);
      
      // If this was initial setup, clear the flag
      if (needsInitialLocation) {
        setNeedsInitialLocation(false);
      }
      
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
    // Don't allow closing if we need initial location
    if (!needsInitialLocation) {
      setShowLocationInput(false);
    }
  };

  const handleShowCustomization = () => {
    setShowCustomizationModal(true);
  };

  const handleCloseCustomization = () => {
    setShowCustomizationModal(false);
  };

  const handleSaveCustomization = () => {
    // Reload weather data to apply new settings
    if (currentLocation) {
      loadWeatherData(currentLocation);
    }
    setShowCustomizationModal(false);
  };

  // Toggle unit preference between metric and imperial
  const toggleUnitPreference = () => {
    try {
      const newPreference = unitPreference === 'metric' ? 'imperial' : 'metric';
      setUnitPreferenceState(newPreference);
      setUnitPreference(newPreference);
      // Reload weather data to apply new unit preference
      if (currentLocation) {
        loadWeatherData(currentLocation);
      }
    } catch (err) {
      console.warn('Failed to toggle unit preference:', err);
    }
  };

  // Initialize location and load weather data on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Get current location from storage (no default fallback)
        const location = getCurrentLocationOrDefault();
        
        if (location) {
          // We have a stored location, proceed normally
          setCurrentLocation(location);
          await loadWeatherData(location);
        } else {
          // No stored location, show location selection
          setNeedsInitialLocation(true);
          setShowLocationInput(true);
          setLoading(false);
        }
      } catch (err) {
        setError("Failed to initialize app.");
        console.error(err);
        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Initialize unit preference
  useEffect(() => {
    try {
      const preference = getUnitPreference();
      setUnitPreferenceState(preference);
    } catch (err) {
      console.warn('Failed to load unit preference, using default:', err);
    }
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
            {currentLocation && (
              <button
                onClick={handleShowLocationInput}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors font-medium"
              >
                <MapPin className="w-4 h-4" />
                {currentLocation.name}
              </button>
            )}
          </div>

          

          {/* App Customization */}
          <div className="flex items-center justify-center gap-4 mb-6 text-sm text-gray-500 dark:text-gray-400">
            <button
              onClick={toggleUnitPreference}
              className="flex items-center gap-1 px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Toggle unit preference"
            >
              {unitPreference === 'metric' ? '°C' : '°F'}
            </button>
            <button
              onClick={handleShowCustomization}
              className="flex items-center gap-1 px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Customize activity scoring"
            >
              <Settings className="w-4 h-4" /> Customize
            </button>
          </div>

          {/* Data freshness and refresh controls */}          
          <div className="flex items-center justify-center flex-col gap-2 text-sm text-gray-500 dark:text-gray-400">
            {lastUpdated && (
              <span>
                Last updated: {formatTimestamp(lastUpdated)}
              </span>
            )}
            {quotaExceeded ? (
              <div className="flex items-center gap-1 px-3 py-1 rounded-md bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                <span className="text-sm font-medium">Calls Exhausted</span>
                {apiQuota && apiQuota.dailyQuota && apiQuota.requestCount !== undefined && (
                  <span className="text-red-500 dark:text-red-400 font-normal text-sm">
                    ({apiQuota.requestCount}/{apiQuota.dailyQuota})
                  </span>
                )}
              </div>
            ) : (
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-1 px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Refresh weather data"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
                {apiQuota && apiQuota.dailyQuota && apiQuota.requestCount !== undefined && !quotaExceeded && (
                  <span className="text-gray-400 dark:text-gray-500 font-normal">
                    ({apiQuota.dailyQuota - apiQuota.requestCount})
                  </span>
                )}
              </button>
            )}
          </div>

        </header>

        {loading && !needsInitialLocation && (
          <div className="flex flex-col justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-blue-500 dark:border-gray-700 dark:border-t-blue-400"></div>
            <p className="mt-6 text-xl text-gray-600 dark:text-gray-400">Calculating Daily Ratings...</p>
          </div>
        )}

        {/* Initial Location Setup Message */}
        {needsInitialLocation && !loading && (
          <div className="flex flex-col justify-center items-center h-64">
            <MapPin className="w-16 h-16 text-blue-500 mb-4" />
            <p className="text-xl text-gray-600 dark:text-gray-400 text-center">
              Welcome! Please set your location to get started.
            </p>
          </div>
        )}
        
        {error && (
          <div className="text-center py-12">
            <p className="text-red-600 dark:text-red-400 text-lg font-medium">{error}</p>
          </div>
        )}

        {/* Weather Summary */}
        {hourlyData && !loading && (
          <WeatherSummary hourlyData={hourlyData} unitPreference={unitPreference} />
        )}

        {/* Weather Chart */}
        {hourlyData && !loading && (
          <WeatherChart hourlyData={hourlyData} unitPreference={unitPreference} />
        )}

        {ratings && (
          <div className="grid gap-6 max-w-4xl mx-auto">
            {Object.entries(ratings).map(([activity, hourlyRatings]) => (
              <ActivityTimelineCard key={activity} title={activity} hourlyRatings={hourlyRatings} />
            ))}
          </div>
        )}

        {/* Location Input Modal */}
        {showLocationInput && (
          <LocationInput
            currentLocation={currentLocation}
            onLocationChange={handleLocationChange}
            onClose={handleCloseLocationInput}
            isInitialSetup={needsInitialLocation}
          />
        )}
        
        {/* Customization Modal */}
        {showCustomizationModal && (
          <CustomizationModal
            onClose={handleCloseCustomization}
            onSave={handleSaveCustomization}
            unitPreference={unitPreference}
          />
        )}
      </main>
    </div>
  );
}

export default App;
