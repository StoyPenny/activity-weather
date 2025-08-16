# Activity Weather

This project is a React application that displays the best time of day for various activities based on live weather conditions for any location worldwide. It uses the Stormglass API to fetch real-time marine and weather data, providing accurate hourly activity ratings.

## Features

- **Dynamic Location Support**: Enter any city, address, or use your current location
- **Live Weather Data**: Integrates with Stormglass API for real-time weather conditions
- **Smart Caching**: Location-specific caching for 1 hour to reduce API calls and improve performance
- **Geolocation Support**: Use browser's location API to automatically detect your position
- **Geocoding Integration**: OpenStreetMap Nominatim API for converting addresses to coordinates
- **Persistent Location**: Remembers your location preference in local storage
- **Data Freshness**: Shows timestamp of last update with manual refresh option
- **8 Activity Types**: Surfing, Fishing, Boating, Hiking, Camping, Beach Day, Kayaking, and Snorkeling
- **Hourly Ratings**: Color-coded timeline showing optimal times for each activity
- **Responsive Design**: Built with Tailwind CSS and shadcn/ui components
- **Fallback System**: Gracefully falls back to mock data if API is unavailable

## Setup

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with your Stormglass API key:
   ```
   VITE_STORMGLASS_API_KEY=your-api-key-here
   ```
4. Start the development server: `npm run dev`

## Technology Stack

- **Frontend**: React, Vite, Tailwind CSS, shadcn/ui
- **Weather API**: Stormglass Weather API
- **Geocoding API**: OpenStreetMap Nominatim (free, no API key required)
- **Geolocation**: Browser's native Geolocation API
- **Storage**: Local Storage for location persistence
- **Default Location**: Port Orange, Florida (29.1386, -81.0067)

## Location Features

### Location Input Options
- **Manual Entry**: Type city names, addresses, or coordinates
- **Current Location**: Use browser geolocation to auto-detect your position
- **Persistent Storage**: Your location preference is saved and remembered
- **Default Fallback**: Defaults to Port Orange, FL if no location is set

### Location Management
- **Geocoding**: Converts addresses to coordinates using OpenStreetMap Nominatim
- **Validation**: Ensures valid coordinates before fetching weather data
- **Error Handling**: Graceful fallbacks for geocoding failures or denied location access
- **Cache Management**: Location-specific weather data caching

## Weather Parameters

The app uses the following weather data for activity calculations:
- Air Temperature
- Cloud Cover
- Swell Height & Period
- Water Temperature
- Wave Height
- Wind Speed

## Usage

1. **First Visit**: App loads with Port Orange, FL as the default location
2. **Change Location**: Click the location button in the header to open location input
3. **Enter Location**: Type a city name, address, or click "Use Current Location"
4. **View Results**: Weather data and activity ratings update for your chosen location
5. **Automatic Saving**: Your location preference is saved for future visits

## API Usage

### Stormglass API
- Requires API key in `.env` file as `VITE_STORMGLASS_API_KEY`
- Fetches hourly weather data for any global coordinates
- Includes marine data (waves, swells) and meteorological data

### OpenStreetMap Nominatim
- Free geocoding service, no API key required
- Converts location names to latitude/longitude coordinates
- Includes reverse geocoding for current location detection
