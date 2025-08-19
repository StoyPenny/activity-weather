import { useEffect, useState } from 'react';
import { fetchWeatherData, calculateAllHourlyRatings, getCacheTimestamp, clearCache } from "./lib/weather";
import { getCurrentLocationOrDefault, saveLocation, removeLocationByIndex } from "./lib/location";
import { getUnitPreference, setUnitPreference } from "./lib/settings";
import ActivityTimelineCard from "./components/ActivityTimelineCard";
import LocationInput from "./components/LocationInput";
import CustomizationModal from "./components/CustomizationModal";
import WeatherSummary from "./components/WeatherSummary";
import WeatherChart from "./components/WeatherChart";
import { RefreshCw, MapPin, Settings, X } from 'lucide-react';

function App() {
  const [ratings, setRatings] = useState(null);
  const [hourlyData, setHourlyData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [locations, setLocations] = useState([]); // multiple locations
  const [activeLocationIndex, setActiveLocationIndex] = useState(0);
  const [showLocationInput, setShowLocationInput] = useState(false);
  const [showCustomizationModal, setShowCustomizationModal] = useState(false);
  const [needsInitialLocation, setNeedsInitialLocation] = useState(false);
  const [apiQuota, setApiQuota] = useState(null);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [unitPreference, setUnitPreferenceState] = useState('metric');
  const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);
  const [locationToRemove, setLocationToRemove] = useState(null);

  const loadWeatherData = async (location = null, forceRefresh = false) => {
    try {
      setLoading(!forceRefresh); // Don't show main loading if it's just a refresh
      setRefreshing(forceRefresh);
      setError(null);
      setQuotaExceeded(false);
      
      const targetLocation = location || locations[activeLocationIndex];
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
    const currentLocation = locations[activeLocationIndex];
    if (currentLocation && !quotaExceeded) {
      clearCache(currentLocation.lat, currentLocation.lng);
      await loadWeatherData(null, true);
    }
  };

  const handleLocationChange = async (newLocation) => {
    try {
      const updatedLocations = [...locations, newLocation];
      setLocations(updatedLocations);
      setActiveLocationIndex(updatedLocations.length - 1);
      saveLocation(updatedLocations); // Save whole array now
      if (needsInitialLocation) {
        setNeedsInitialLocation(false);
      }
      await loadWeatherData(newLocation, true);
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
    const activeLoc = locations[activeLocationIndex];
    if (activeLoc) {
      loadWeatherData(activeLoc);
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
      const activeLoc = locations[activeLocationIndex];
      if (activeLoc) {
        loadWeatherData(activeLoc);
      }
    } catch (err) {
      console.warn('Failed to toggle unit preference:', err);
    }
  };

  // Handle location removal
  const handleRemoveLocation = (indexToRemove) => {
    setLocationToRemove({ index: indexToRemove, name: locations[indexToRemove].name });
    setShowRemoveConfirmation(true);
  };

  // Confirm location removal
  const confirmRemoveLocation = () => {
    try {
      const updatedLocations = removeLocationByIndex(locations, locationToRemove.index);
      setLocations(updatedLocations);
      
      if (updatedLocations.length === 0) {
        // No locations left - return to initial setup
        setNeedsInitialLocation(true);
        setShowLocationInput(true);
        setActiveLocationIndex(0);
        setRatings(null);
        setHourlyData(null);
        setLastUpdated(null);
      } else {
        // Adjust active location index
        let newActiveIndex = activeLocationIndex;
        if (locationToRemove.index === activeLocationIndex) {
          newActiveIndex = 0; // Switch to first location
        } else if (locationToRemove.index < activeLocationIndex) {
          newActiveIndex = activeLocationIndex - 1; // Adjust for removed location
        }
        setActiveLocationIndex(newActiveIndex);
        
        // Load weather data for new active location
        loadWeatherData(updatedLocations[newActiveIndex], true);
      }
    } catch (err) {
      setError('Failed to remove location');
      console.error(err);
    } finally {
      setShowRemoveConfirmation(false);
      setLocationToRemove(null);
    }
  };

  // Initialize location and load weather data on app start
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Get current location from storage (no default fallback)
        const stored = getCurrentLocationOrDefault();
        
        if (stored && Array.isArray(stored) && stored.length > 0) {
          setLocations(stored);
          await loadWeatherData(stored[0]);
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

  // Watch for active location changes and reload weather data
  useEffect(() => {
    if (locations.length > 0 && activeLocationIndex >= 0 && activeLocationIndex < locations.length) {
      const activeLocation = locations[activeLocationIndex];
      if (activeLocation) {
        loadWeatherData(activeLocation);
      }
    }
  }, [activeLocationIndex, locations]);

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
            {locations.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-center">
                {locations.map((loc, idx) => (
                  <div key={idx} className="relative group">
                    <button
                      onClick={() => setActiveLocationIndex(idx)}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
                        idx === activeLocationIndex
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                      }`}
                    >
                      <MapPin className="w-4 h-4" />
                      {loc.name}
                    </button>
                    {/* Remove button - only show on hover */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveLocation(idx);
                      }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                      title={`Remove ${loc.name}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={handleShowLocationInput}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors font-medium"
                >
                  + Add Location
                </button>
              </div>
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
          <WeatherSummary hourlyData={hourlyData} unitPreference={unitPreference} activeLocation={locations[activeLocationIndex]} />
        )}

        {/* Weather Chart */}
        {hourlyData && !loading && (
          <WeatherChart hourlyData={hourlyData} unitPreference={unitPreference} activeLocation={locations[activeLocationIndex]} />
        )}

        {ratings && (
          <div className="grid gap-6 max-w-4xl mx-auto">
            {Object.entries(ratings).map(([activity, hourlyRatings]) => (
              <ActivityTimelineCard key={activity} title={activity} hourlyRatings={hourlyRatings} activeLocation={locations[activeLocationIndex]} />
            ))}
          </div>
        )}

        {/* Location Input Modal */}
        {showLocationInput && (
          <LocationInput
            onLocationChange={handleLocationChange}
            onClose={handleCloseLocationInput}
            isInitialSetup={needsInitialLocation}
            allLocations={locations}
            onLocationRemove={handleRemoveLocation}
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

        {/* Location Removal Confirmation Dialog */}
        {showRemoveConfirmation && locationToRemove && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-sm w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Remove Location</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6">
                Remove <strong>{locationToRemove.name}</strong> from your saved locations?
                {locations.length === 1 && (
                  <span className="block mt-2 text-sm text-amber-600 dark:text-amber-400">
                    This will remove your last location and return you to the setup screen.
                  </span>
                )}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowRemoveConfirmation(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmRemoveLocation}
                  className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
