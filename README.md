# Activity Weather

This project is a React application that displays the best time of day for various activities based on live weather conditions for any location worldwide. It uses the Stormglass API to fetch real-time marine and weather data, providing accurate hourly activity ratings.

<img width="1800" height="2586" alt="localhost_5175_" src="https://github.com/user-attachments/assets/d5ce9cd6-ed46-43da-8184-3ad7a6e3fc9e" />

## Features

- **Dynamic Location Support**: Enter any city, address, or use your current location
- **Live Weather Data**: Integrates with Stormglass API for real-time weather conditions
- **Smart Caching**: Location-specific caching that refreshes once per day at local midnight to reduce API calls and improve performance
- **Geolocation Support**: Use browser's location API to automatically detect your position
- **Geocoding Integration**: OpenStreetMap Nominatim API for converting addresses to coordinates
- **Persistent Location**: Remembers your location preference in local storage
- **Data Freshness**: Shows timestamp of last update with manual refresh option
- **8 Activity Types**: Surfing, Fishing, Boating, Hiking, Camping, Beach Day, Kayaking, and Snorkeling
- **5-Level Rating System**: Detailed activity ratings from Poor to Excellent with color-coded timeline
- **Hourly Ratings**: Color-coded timeline showing optimal times for each activity with nuanced feedback
- **Responsive Design**: Built with Tailwind CSS and shadcn/ui components
- **Fallback System**: Gracefully falls back to mock data if API is unavailable

## Setup

### Local Development

1. Clone the repository
2. Install dependencies: `npm install`
3. Create a `.env` file with your Stormglass API key:
   ```
   VITE_STORMGLASS_API_KEY=your-api-key-here
   ```
4. Start the development server: `npm run dev`

### Docker Setup

For easy deployment and running on different machines, this project includes Docker support.

#### Prerequisites
- Docker and Docker Compose installed on your system

#### Quick Start with Docker

1. Clone the repository
2. Create a `.env` file with your Stormglass API key:
   ```
   VITE_STORMGLASS_API_KEY=your-api-key-here
   ```
3. Run the application:
   ```bash
   docker-compose up --build
   ```
4. Open your browser to `http://localhost:4173`

#### Docker Commands

**Production Build:**
```bash
# Build and run the production version
docker-compose up --build

# Run in detached mode
docker-compose up -d

# Stop the application
docker-compose down
```

**Development Mode:**
```bash
# Run development version with hot reloading
docker-compose --profile dev up --build

# This will start the dev server on http://localhost:5173
```

**Individual Docker Commands:**
```bash
# Build the image manually
docker build -t activity-weather .

# Run the container manually
docker run -p 4173:4173 --env-file .env activity-weather
```

#### Docker Services

- **activity-weather**: Production build served on port 4173
- **activity-weather-dev**: Development build with hot reloading on port 5173 (requires `--profile dev`)

## Technology Stack

- **Frontend**: React, Vite, Tailwind CSS, shadcn/ui
- **Weather API**: Stormglass Weather API
- **Geocoding API**: OpenStreetMap Nominatim (free, no API key required)
- **Geolocation**: Browser's native Geolocation API
- **Storage**: Local Storage for location persistence

## Location Features

### Location Input Options
- **Manual Entry**: Type city names, addresses, or coordinates
- **Current Location**: Use browser geolocation to auto-detect your position
- **Persistent Storage**: Your location preference is saved and remembered
- **User-Driven Setup**: No default location - users must select their location on first visit

### Location Management
- **Geocoding**: Converts addresses to coordinates using OpenStreetMap Nominatim
- **Smart Formatting**: Displays US locations with abbreviated states (e.g., "Miami, FL")
- **Validation**: Ensures valid coordinates before fetching weather data
- **Error Handling**: Graceful fallbacks for geocoding failures or denied location access
- **Cache Management**: Location-specific weather data caching that refreshes daily at local midnight

## Weather Parameters

The app uses the following weather data for activity calculations:
- Air Temperature
- Cloud Cover
- Swell Height & Period
- Water Temperature
- Wave Height
- Wind Speed

## Usage

1. **First Visit**: App prompts you to set your location with a welcome modal
2. **Location Setup**: Choose to use your current location or enter a city/address manually
3. **Enter Location**: Type a city name, address, or click "Use Current Location"
4. **View Results**: Weather data and activity ratings display for your chosen location
5. **Change Location**: Click the location button in the header to update your location
6. **Automatic Saving**: Your location preference is saved for future visits

## API Usage

### Stormglass API
- Requires API key in `.env` file as `VITE_STORMGLASS_API_KEY`
- Fetches hourly weather data for any global coordinates
- Includes marine data (waves, swells) and meteorological data
- [Register](https://dashboard.stormglass.io/register) or [Sign In](https://dashboard.stormglass.io/login)
- Copy your API key from the dashboard
   - The free key will give you up to 10 calls per day. Paid options available for more if needed.
- [Documentation]([https://dashboard.stormglass.io/login](https://docs.stormglass.io/#/weather))

### OpenStreetMap Nominatim
- Free geocoding service, no API key required
- Converts location names to latitude/longitude coordinates
- Includes reverse geocoding for current location detection
