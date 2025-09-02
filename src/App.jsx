import { useEffect, useState, useCallback } from 'react';
import {
  fetchWeatherData,
  fetchForecastData,
  calculateAllHourlyRatingsWithDetails,
  getCacheTimestamp,
  clearCache,
  filterForecastDataByDate,
  getAvailableForecastDates
} from "./lib/weather";
import { getCurrentLocationOrDefault, saveLocation, removeLocationByIndex } from "./lib/location";
import { getUnitPreference, setUnitPreference, getThemePreference, setThemePreference } from "./lib/settings";
import ActivityTimelineCard from "./components/ActivityTimelineCard";
import LocationInput from "./components/LocationInput";
import CustomizationModal from "./components/CustomizationModal";
import WeatherSummary from "./components/WeatherSummary";
import WeatherChart from "./components/WeatherChart";

import { RefreshCw, MapPin, Settings, MapPinPen, X, ChevronLeft, ChevronRight, Calendar, Sun, Moon } from 'lucide-react';

function App() {
  // Current weather data (always today's current conditions)
  const [currentWeatherData, setCurrentWeatherData] = useState(null);
  
  // Forecast data and selected day
  const [forecastData, setForecastData] = useState(null);
  const [selectedForecastDate, setSelectedForecastDate] = useState(new Date());
  const [selectedDayData, setSelectedDayData] = useState(null);
  const [selectedDayRatings, setSelectedDayRatings] = useState(null);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [forecastLoading, setForecastLoading] = useState(false);
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
  const [themePreference, setThemePreferenceState] = useState('light');
  const [showRemoveConfirmation, setShowRemoveConfirmation] = useState(false);
  const [locationToRemove, setLocationToRemove] = useState(null);

  const loadWeatherData = useCallback(async (location = null, forceRefresh = false) => {
    try {
      setLoading(!forceRefresh); // Don't show main loading if it's just a refresh
      setRefreshing(forceRefresh);
      setError(null);
      setQuotaExceeded(false);
      
      const targetLocation = location || locations[activeLocationIndex];
      if (!targetLocation) {
        throw new Error('No location available');
      }
      
      // Fetch current weather data (today only)
      const currentData = await fetchWeatherData(targetLocation.lat, targetLocation.lng, forceRefresh);
      setCurrentWeatherData(currentData.hours);
      
      // Store API quota information if available
      if (currentData.meta) {
        setApiQuota(currentData.meta);
      }
      
      // Update timestamp
      const timestamp = getCacheTimestamp(targetLocation.lat, targetLocation.lng);
      setLastUpdated(timestamp || Date.now());
      
      // Load forecast data (7-10 days)
      await loadForecastData(targetLocation, forceRefresh);
      
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
  }, [locations, activeLocationIndex]);

  const loadForecastData = useCallback(async (location, forceRefresh = false) => {
    try {
      setForecastLoading(true);
      
      // Fetch 10-day forecast data
      const forecast = await fetchForecastData(location.lat, location.lng, 10, forceRefresh);
      setForecastData(forecast);
      
      // Get available dates and set initial selected date to today
      const availableDates = getAvailableForecastDates(forecast);
      if (availableDates.length > 0) {
        const today = new Date();
        const todayDate = availableDates.find(date =>
          date.toDateString() === today.toDateString()
        ) || availableDates[0];
        
        setSelectedForecastDate(todayDate);
        updateSelectedDayData(forecast, todayDate);
      }
      
    } catch (err) {
      console.warn('Failed to load forecast data:', err);
      // Don't set error for forecast failure, just log it
    } finally {
      setForecastLoading(false);
    }
  }, []);

  const updateSelectedDayData = useCallback((forecast, date) => {
    if (!forecast || !date) return;
    
    const dayData = filterForecastDataByDate(forecast, date);
    setSelectedDayData(dayData.hours);
    
    if (dayData.hours.length > 0) {
      const dayRatings = calculateAllHourlyRatingsWithDetails(dayData.hours);
      setSelectedDayRatings(dayRatings);
    } else {
      setSelectedDayRatings(null);
    }
  }, []);

  const handleDateChange = (newDate) => {
    setSelectedForecastDate(newDate);
    if (forecastData) {
      // Check if the selected date has available data
      const availableDates = getAvailableForecastDates(forecastData);
      const isDateAvailable = availableDates.some(date =>
        date.toDateString() === newDate.toDateString()
      );
      
      if (isDateAvailable) {
        updateSelectedDayData(forecastData, newDate);
        setError(null); // Clear any previous errors
      } else {
        // Handle unavailable date
        console.warn(`No forecast data available for ${newDate.toDateString()}`);
        setSelectedDayData(null);
        setSelectedDayRatings(null);
        setError(`No forecast data available for ${newDate.toLocaleDateString()}. Please select a different date.`);
      }
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

  // Toggle theme preference between light and dark
  const toggleThemePreference = () => {
    try {
      const newTheme = themePreference === 'light' ? 'dark' : 'light';
      setThemePreferenceState(newTheme);
      setThemePreference(newTheme);

      // Apply theme to document
      if (newTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (err) {
      console.warn('Failed to toggle theme preference:', err);
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
        setCurrentWeatherData(null);
        setSelectedDayRatings(null);
        setSelectedDayData(null);
        setForecastData(null);
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

  // Initialize theme preference
  useEffect(() => {
    try {
      const theme = getThemePreference();
      setThemePreferenceState(theme);

      // Apply theme to document
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (err) {
      console.warn('Failed to load theme preference, using default:', err);
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
  }, [activeLocationIndex, locations, loadWeatherData]);

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

  const formatDisplayDate = (date) => {
    if (!date) return '';
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString([], { 
        weekday: 'short'
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 overflow-x-hidden">
      
      <nav className='container mx-auto flex justify-between gap-2 py-3'>
        
        <div className='flex gap-6 items-start'>

          {forecastData && !loading && (
            <div className="flex justify-center items-start">
              <button
                onClick={() => {
                  const availableDates = getAvailableForecastDates(forecastData);
                  const selectedIndex = availableDates.findIndex(date =>
                    date.toDateString() === selectedForecastDate?.toDateString()
                  );
                  if (selectedIndex > 0) {
                    handleDateChange(availableDates[selectedIndex - 1]);
                  }
                }}
                disabled={(() => {
                  const availableDates = getAvailableForecastDates(forecastData);
                  const selectedIndex = availableDates.findIndex(date =>
                    date.toDateString() === selectedForecastDate?.toDateString()
                  );
                  return selectedIndex <= 0;
                })()}
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-200 dark:bg-blue-950/30 hover:bg-blue-300 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Previous day"
              >
                <ChevronLeft className="w-4 h-5 text-blue-600 dark:text-blue-300" />
              </button>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-600 dark:text-blue-400 pointer-events-none z-10" />
                <select
                  value={(() => {
                    const availableDates = getAvailableForecastDates(forecastData);
                    return availableDates.findIndex(date =>
                      date.toDateString() === selectedForecastDate?.toDateString()
                    );
                  })()}
                  onChange={(e) => {
                    const availableDates = getAvailableForecastDates(forecastData);
                    const idx = parseInt(e.target.value);
                    handleDateChange(availableDates[idx]);
                  }}
                  className="inline-flex items-center gap-1 pl-10 pr-2 py-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors font-medium appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                >
                  {(() => {
                    const availableDates = getAvailableForecastDates(forecastData);
                    return availableDates.map((date, idx) => (
                      <option key={idx} value={idx}>
                        {formatDisplayDate(date)}
                      </option>
                    ));
                  })()}
                </select>
              </div>
              <button
                onClick={() => {
                  const availableDates = getAvailableForecastDates(forecastData);
                  const selectedIndex = availableDates.findIndex(date =>
                    date.toDateString() === selectedForecastDate?.toDateString()
                  );
                  if (selectedIndex < availableDates.length - 1) {
                    handleDateChange(availableDates[selectedIndex + 1]);
                  }
                }}
                disabled={(() => {
                  const availableDates = getAvailableForecastDates(forecastData);
                  const selectedIndex = availableDates.findIndex(date =>
                    date.toDateString() === selectedForecastDate?.toDateString()
                  );
                  return selectedIndex >= availableDates.length - 1;
                })()}
                className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-200 dark:bg-blue-950/30 hover:bg-blue-300 dark:hover:bg-blue-900/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Next day"
              >
                <ChevronRight className="w-5 h-5 text-blue-600 dark:text-blue-300" />
              </button>
            </div>
          )}

          {locations.length > 0 && (
            <div className="flex justify-center items-start">
              <button
                onClick={handleShowLocationInput}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs bg-blue-200 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors font-medium"
              >
                <MapPinPen className="w-4 h-4" />
              </button>
              <div className="relative">
                {/* <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-600 dark:text-blue-400 pointer-events-none z-10" /> */}
                <select
                  value={activeLocationIndex}
                  onChange={(e) => setActiveLocationIndex(parseInt(e.target.value))}
                  className="inline-flex items-center gap-1 pl-4 pr-2 py-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors font-medium appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
                >
                  {locations.map((loc, idx) => (
                    <option key={idx} value={idx}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
              
            </div>
          )}

        </div>

        <div className='flex gap-2 justify-end items-start'>
          
          <div className="flex flex-col flex-wrap items-center">
            
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
                className="flex items-center gap-1 text-xs px-3 py-1 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

            {lastUpdated && (
              <div className='text-[0.55rem] mt-1 text-gray-500 dark:text-gray-400'>
                Updated: {formatTimestamp(lastUpdated)}
              </div>
            )}
          </div>
          <div className="flex items-center gap-3 justify-between">
            <button
              onClick={toggleThemePreference}
              className="flex items-center gap-1 px-3 py-1 text-xs rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Toggle theme"
            >
              {themePreference === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleUnitPreference}
              className="flex items-center gap-1 px-3 py-1 text-xs rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Toggle unit preference"
            >
              {unitPreference === 'metric' ? '°C' : '°F'}
            </button>
            <button
              onClick={handleShowCustomization}
              className="flex items-center gap-1 px-3 py-1 text-xs rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              title="Customize activity scoring"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
        
      </nav>


      <main className="container mx-auto pb-6">

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

        

        {/* Weather Summary - Always shows current conditions */}
        {currentWeatherData && !loading && (
          <WeatherSummary
            hourlyData={currentWeatherData}
            unitPreference={unitPreference}
          />
        )}

        

        {/* Weather Chart - Shows selected day data */}
        {selectedDayData && !loading && (
          <WeatherChart
            hourlyData={selectedDayData}
            unitPreference={unitPreference}
          />
        )}



        {/* Activity Timeline Cards - Shows selected day ratings */}
        {selectedDayRatings && (
          <div className="flex flex-wrap ml-[-0.75rem] mr-[-0.75rem]">
            {Object.entries(selectedDayRatings).map(([activity, hourlyRatings]) => (
              <ActivityTimelineCard
                key={activity}
                title={activity}
                hourlyRatings={hourlyRatings}
              />
            ))}
          </div>
        )}

        

        {/* No data message for selected day */}
        {forecastData && selectedForecastDate && !selectedDayData && !loading && !forecastLoading && (
          <div className="text-center py-12">
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 max-w-md mx-auto">
              <h3 className="text-lg font-medium text-yellow-800 dark:text-yellow-200 mb-2">
                No Data Available
              </h3>
              <p className="text-yellow-700 dark:text-yellow-300 text-sm">
                No forecast data available for {selectedForecastDate.toLocaleDateString()}.
                Please select a different date from the available options.
              </p>
            </div>
          </div>
        )}

        {/* Loading indicator for forecast data */}
        {forecastLoading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-500 dark:border-gray-700 dark:border-t-blue-400"></div>
            <span className="ml-2 text-gray-600 dark:text-gray-400">Loading forecast...</span>
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
