# Activity Weather

This project is a React application that displays the best time of day for various activities based on live weather conditions in Port Orange, Florida. It uses the Stormglass API to fetch real-time marine and weather data, providing accurate hourly activity ratings.

## Features

- **Live Weather Data**: Integrates with Stormglass API for real-time weather conditions
- **Smart Caching**: Automatically caches data for 1 hour to reduce API calls and improve performance
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
- **API**: Stormglass Weather API
- **Location**: Port Orange, Florida (29.1386, -81.0067)

## Weather Parameters

The app uses the following weather data for activity calculations:
- Air Temperature
- Cloud Cover
- Swell Height & Period
- Water Temperature
- Wave Height
- Wind Speed
