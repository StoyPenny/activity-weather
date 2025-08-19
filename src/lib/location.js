// --- LOCATION MANAGEMENT UTILITIES ---

// No default location - users must select their location

// Local storage key for user's locations (now supports array)
const LOCATION_STORAGE_KEY = 'user_locations';

// OpenStreetMap Nominatim API configuration
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/search';

// --- GEOCODING FUNCTIONS ---

/**
 * Geocode a location string to coordinates using OpenStreetMap Nominatim API
 * @param {string} locationString - The location to geocode (e.g., "New York, NY")
 * @returns {Promise<{name: string, lat: number, lng: number}>} Location object with coordinates
 */
export const geocodeLocation = async (locationString) => {
  if (!locationString || locationString.trim() === '') {
    throw new Error('Location string cannot be empty');
  }

  const params = new URLSearchParams({
    q: locationString.trim(),
    format: 'json',
    limit: '1',
    addressdetails: '1'
  });

  try {
    const response = await fetch(`${NOMINATIM_BASE_URL}?${params}`, {
      headers: {
        'User-Agent': 'ActivityWeatherApp/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`Geocoding API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data || data.length === 0) {
      throw new Error(`Location "${locationString}" not found`);
    }

    const result = data[0];
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    if (isNaN(lat) || isNaN(lng)) {
      throw new Error('Invalid coordinates received from geocoding service');
    }

    // Create a readable location name from the result
    const name = formatLocationName(result);

    return {
      name,
      lat,
      lng
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    throw new Error(`Failed to find location: ${error.message}`);
  }
};

// US State abbreviations mapping
const US_STATE_ABBREVIATIONS = {
  'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
  'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
  'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA',
  'Kansas': 'KS', 'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
  'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO',
  'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ',
  'New Mexico': 'NM', 'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH',
  'Oklahoma': 'OK', 'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
  'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
  'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
  'District of Columbia': 'DC', 'Puerto Rico': 'PR'
};

/**
 * Format location name from Nominatim result
 * @param {Object} result - Nominatim API result
 * @returns {string} Formatted location name
 */
const formatLocationName = (result) => {
  const address = result.address || {};
  const parts = [];

  // Add city/town/village
  if (address.city) parts.push(address.city);
  else if (address.town) parts.push(address.town);
  else if (address.village) parts.push(address.village);
  else if (address.municipality) parts.push(address.municipality);

  // Add state/province with abbreviation for US states
  let stateName = address.state || address.province;
  if (stateName) {
    // For US locations, use abbreviation if available
    if (address.country === 'United States' && US_STATE_ABBREVIATIONS[stateName]) {
      stateName = US_STATE_ABBREVIATIONS[stateName];
    }
    parts.push(stateName);
  }

  // Add country if not US
  if (address.country && address.country !== 'United States') {
    parts.push(address.country);
  }

  // Fallback to display name if we can't construct a good name
  if (parts.length === 0) {
    return result.display_name.split(',').slice(0, 2).join(', ');
  }

  return parts.join(', ');
};

// --- GEOLOCATION FUNCTIONS ---

/**
 * Get user's current location using browser geolocation API
 * @returns {Promise<{name: string, lat: number, lng: number}>} Location object with coordinates
 */
export const getCurrentLocation = async () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser'));
      return;
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;

          // Reverse geocode to get location name
          const name = await reverseGeocode(lat, lng);

          resolve({
            name,
            lat,
            lng
          });
        } catch (error) {
          // If reverse geocoding fails, still return coordinates with generic name
          console.warn('Reverse geocoding failed for current location:', error);
          resolve({
            name: `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`,
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        }
      },
      (error) => {
        let message = 'Failed to get current location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            message = 'Location access denied by user';
            break;
          case error.POSITION_UNAVAILABLE:
            message = 'Location information unavailable';
            break;
          case error.TIMEOUT:
            message = 'Location request timed out';
            break;
        }

        reject(new Error(message));
      },
      options
    );
  });
};

/**
 * Reverse geocode coordinates to get location name
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<string>} Location name
 */
const reverseGeocode = async (lat, lng) => {
  const params = new URLSearchParams({
    lat: lat.toString(),
    lon: lng.toString(),
    format: 'json',
    addressdetails: '1'
  });

  try {
    const response = await fetch(`https://nominatim.openstreetmap.org/reverse?${params}`, {
      headers: {
        'User-Agent': 'ActivityWeatherApp/1.0'
      }
    });

    if (!response.ok) {
      throw new Error('Reverse geocoding failed');
    }

    const data = await response.json();
    return formatLocationName(data);
  } catch (error) {
    console.warn('Reverse geocoding failed:', error);
    // Return coordinates as fallback
    return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }
};

// --- LOCAL STORAGE FUNCTIONS ---

/**
 * Save location to local storage
 * @param {Object} location - Location object {name, lat, lng}
 */
export const saveLocation = (locations) => {
  try {
    if (!Array.isArray(locations)) {
      throw new Error('Locations must be an array');
    }
    for (const loc of locations) {
      if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') {
        throw new Error('Invalid location object in array');
      }
    }
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(locations));
    console.log('Locations saved to storage:', locations.map(l => l.name).join(', '));
  } catch (error) {
    console.warn('Failed to save locations to storage:', error);
  }
};

/**
 * Load location from local storage
 * @returns {Object|null} Location object or null if not found
 */
export const loadLocation = () => {
  try {
    const stored = localStorage.getItem(LOCATION_STORAGE_KEY);
    if (!stored) {
      return [];
    }
    const locations = JSON.parse(stored);
    if (!Array.isArray(locations)) {
      console.warn('Invalid locations data in storage, removing');
      localStorage.removeItem(LOCATION_STORAGE_KEY);
      return [];
    }
    return locations;
  } catch (error) {
    console.warn('Failed to load locations from storage:', error);
    localStorage.removeItem(LOCATION_STORAGE_KEY);
    return [];
  }
};

/**
 * Get current location from storage
 * @returns {Object|null} Location object or null if not found
 */
export const getCurrentLocationOrDefault = () => {
  return loadLocation(); // now returns array of saved locations
};

/**
 * Clear stored location
 */
export const clearStoredLocation = () => {
  try {
    localStorage.removeItem(LOCATION_STORAGE_KEY);
    console.log('All stored locations cleared');
  } catch (error) {
    console.warn('Failed to clear stored locations:', error);
  }
};

/**
 * Remove location by index from locations array
 * @param {Array} locations - Current locations array
 * @param {number} indexToRemove - Index of location to remove
 * @returns {Array} Updated locations array
 */
export const removeLocationByIndex = (locations, indexToRemove) => {
  if (!Array.isArray(locations)) {
    throw new Error('Locations must be an array');
  }
  
  if (indexToRemove < 0 || indexToRemove >= locations.length) {
    throw new Error('Invalid location index');
  }
  
  const updatedLocations = locations.filter((_, index) => index !== indexToRemove);
  saveLocation(updatedLocations); // Save to localStorage
  console.log(`Removed location at index ${indexToRemove}. Remaining locations:`, updatedLocations.map(l => l.name).join(', '));
  return updatedLocations;
};

// --- VALIDATION FUNCTIONS ---

/**
 * Validate coordinates
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {boolean} True if coordinates are valid
 */
export const validateCoordinates = (lat, lng) => {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !isNaN(lat) &&
    !isNaN(lng)
  );
};

/**
 * Generate a cache key for location-specific data
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {string} Cache key
 */
export const generateLocationCacheKey = (lat, lng) => {
  // Round to 3 decimal places for cache key (roughly 100m precision)
  const roundedLat = Math.round(lat * 1000) / 1000;
  const roundedLng = Math.round(lng * 1000) / 1000;
  return `weather_${roundedLat}_${roundedLng}`;
};
