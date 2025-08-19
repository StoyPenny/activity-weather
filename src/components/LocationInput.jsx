import { useState } from 'react';
import { MapPin, Navigation, Search, X } from 'lucide-react';
import { geocodeLocation, getCurrentLocation } from '../lib/location';

const LocationInput = ({ onLocationChange, onClose, isInitialSetup = false, allLocations = [], onLocationRemove }) => {
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isGeolocating, setIsGeolocating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!inputValue.trim()) {
      setError('Please enter a location');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const location = await geocodeLocation(inputValue.trim());
      onLocationChange(location);
      setInputValue('');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseCurrentLocation = async () => {
    setIsGeolocating(true);
    setError(null);

    try {
      const location = await getCurrentLocation();
      onLocationChange(location);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsGeolocating(false);
    }
  };

  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    if (error) setError(null); // Clear error when user starts typing
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {isInitialSetup ? 'Set Your Location' : 'Change Location'}
            </h2>
          </div>
          {!isInitialSetup && (
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          )}
        </div>

        {/* Current Locations Display - show all saved */}
        {!isInitialSetup && allLocations && allLocations.length > 0 && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Saved locations:</p>
            <div className="space-y-2">
              {allLocations.map((loc, idx) => (
                <div key={idx} className="flex items-center justify-between group">
                  <span className="font-medium text-gray-900 dark:text-white">{loc.name}</span>
                  <button
                    onClick={() => onLocationRemove && onLocationRemove(idx)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-opacity"
                    title={`Remove ${loc.name}`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Initial Setup Message */}
        {isInitialSetup && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
            <p className="text-sm text-blue-600 dark:text-blue-400">
              <strong>Welcome!</strong> Please set your location to get personalized weather data and activity recommendations.
            </p>
          </div>
        )}

        {/* Location Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="location-input" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {isInitialSetup ? 'Enter your location' : 'Enter new location'}
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                id="location-input"
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                placeholder="City, State or Address"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading || isGeolocating}
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            {/* Search Button */}
            <button
              type="submit"
              disabled={isLoading || isGeolocating || !inputValue.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Searching...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Search Location
                </>
              )}
            </button>

            {/* Current Location Button */}
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={isLoading || isGeolocating}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
            >
              {isGeolocating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  Getting Location...
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4" />
                  Use Current Location
                </>
              )}
            </button>
          </div>
        </form>

        {/* Help Text */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <p className="text-xs text-blue-600 dark:text-blue-400">
            <strong>Tip:</strong> You can enter city names (e.g., "Miami, FL"), addresses, or use your current location for the most accurate weather data.
            {isInitialSetup && " Your location will be saved for future visits."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LocationInput;