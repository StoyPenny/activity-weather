# Activity Weather

This project is a React application that displays the best time of day for various activities based on live weather conditions for any location worldwide. It uses the Stormglass API to fetch real-time marine and weather data, providing accurate hourly activity ratings.

<img width="1792" height="2950" alt="localhost_5175_ (3)" src="https://github.com/user-attachments/assets/a2096247-6c0b-480b-8daa-212bfb37823e" />

<img width="1550" height="1129" alt="localhost_5175_ (2)" src="https://github.com/user-attachments/assets/8acb7f02-f8b9-4b42-9f5b-a6a2a40a8cdc" />

<img width="1151" height="683" alt="Screenshot 2025-08-19 082837" src="https://github.com/user-attachments/assets/891574f5-fd2b-4b0b-976a-fb9c55a32c0e" />



##### Table of Contents

- [Features](#features)
- [Setup](#setup)
   - [Local Development](#local-development)
   - [Docker Setup](#docker-setup)
- [Technology Stack](#technology-stack)
- [Location Features](#location-features)
   - [Location Input Options](#location-input-options)
   - [Location Management](#location-management)
- [Activity Scoring Customization](#activity-scoring-customization)
   - [Customizable Parameters](#customizable-parameters)
   - [Unit Conversion](#unit-conversion)
- [Weather Parameters](#weather-parameters)
- [Usage](#usage)
- [API Usage](#api-usage)
   - [Stormglass API](#stormglass-api)
   - [OpenStreetMap Nominatim](#openstreetmap-nominatim)
- [Future Updates](#future-updates)


## Features

- **Multiple Location Support**: Save and manage multiple locations with easy switching between them
- **Dynamic Location Input**: Enter any city, address, or use your current location
- **Location Management**: Add new locations and remove existing ones with a simple interface
- **Live Weather Data**: Integrates with Stormglass API for real-time weather conditions
- **Activity Scoring Customization**: Customize the settings for each activity to personalize your rating system
- **Smart Caching**: Location-specific caching that refreshes once per day at local midnight to reduce API calls and improve performance
- **Geolocation Support**: Use browser's location API to automatically detect your position
- **Geocoding Integration**: OpenStreetMap Nominatim API for converting addresses to coordinates
- **Unit Conversion**: Toggle between Metric and Imperial units for all weather data
- **Persistent Storage**: Remembers all your saved locations and preferences in local storage
- **Data Freshness**: Shows timestamp of last update with manual refresh option
- **Activity Management**: Add, remove, reorder, and even create brand new activities to customize your dashboard
- **5-Level Rating System**: Detailed activity ratings from Poor to Excellent with color-coded timeline
- **Hourly Ratings**: Color-coded timeline showing optimal times for each activity with nuanced feedback
- **Responsive Design**: Built with Tailwind CSS and shadcn/ui components

## Activity Scoring Customization

This application now includes a powerful customization feature that allows users to fine-tune the activity scoring system based on their personal preferences.

### Customizable Parameters

For each activity (including built‑in and any new ones you add), you can customize the weather parameters that contribute to the activity rating.

- **Add/Remove Parameters**: Add any weather parameter from the Stormglass API to an activity's rating or remove existing ones.
- **Flexible Rating Scales**: Two types of rating scales are supported:
   - **Normalize**: For parameters where an optimal value is preferred (e.g., temperature).
   - **Inverse**: For parameters where a lower value is better (e.g., wind speed for kayaking).
- **Save Preferences**: All customizations are saved to local storage and applied to future rating calculations.
- **Reset to Defaults**: Easily reset all customizations back to the default settings at any time.

### Unit Conversion

- **Metric & Imperial Toggles**: A dedicated button in the header allows users to instantly switch between Metric (°C, m/s) and Imperial (°F, mph) units.
- **Real-time Updates**: The customization modal updates in real-time to display values in the selected unit system.
- **Seamless Conversion**: Input values are automatically converted and stored in a consistent format, regardless of the display unit.

## Activity Management

The application now includes activity management features that allow users to customize which activities are displayed and their order.

### Managing Activities

- **Add Activities**: Add new or custom activities to your dashboard through the customization modal. These activities will appear alongside default ones and be rated using your chosen parameters.
- **Remove Activities**: Remove activities you're not interested in from your dashboard
- **Reorder Activities**: Drag and drop activities to rearrange them in your preferred order
- **Persistent Storage**: All activity preferences are saved to local storage and applied on future visits

To manage activities:
1. Click the "Customize" button in the header
2. In the customization modal, use the "Manage Activities" section to add, remove, or reorder activities
3. Your changes will be applied immediately to your dashboard

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

### Multiple Location Support
- **Save Multiple Locations**: Add and save multiple locations for easy access
- **Quick Location Switching**: Click on any saved location to instantly switch and view its weather data
- **Location Buttons**: Each saved location appears as a clickable button in the header
- **Add New Locations**: Use the "+ Add Location" button to add additional locations
- **Remove Locations**: Remove unwanted locations directly from the location input modal

### Location Input Options
- **Manual Entry**: Type city names, addresses, or coordinates
- **Current Location**: Use browser geolocation to auto-detect your position
- **Persistent Storage**: All your saved locations are remembered across sessions
- **User-Driven Setup**: No default location - users must select their location on first visit

### Location Management
- **Geocoding**: Converts addresses to coordinates using OpenStreetMap Nominatim
- **Smart Formatting**: Displays US locations with abbreviated states (e.g., "Miami, FL")
- **Validation**: Ensures valid coordinates before fetching weather data
- **Error Handling**: Graceful fallbacks for geocoding failures or denied location access
- **Cache Management**: Location-specific weather data caching that refreshes daily at local midnight
- **Active Location Indicator**: The currently selected location is highlighted in the interface
- **Saved Locations Display**: View all your saved locations in the location input modal

## Weather Parameters

The app uses the following weather data for activity calculations:
- Air Temperature
- Cloud Cover
- Swell Height & Period
- Water Temperature
- Wave Height
- Wind Speed

## Usage

### Initial Setup
1. **First Visit**: App prompts you to set your location with a welcome modal
2. **Location Setup**: Choose to use your current location or enter a city/address manually
3. **Enter Location**: Type a city name, address, or click "Use Current Location"
4. **View Results**: Weather data and activity ratings display for your chosen location

### Managing Multiple Locations
5. **Add More Locations**: Click the "+ Add Location" button in the header to add additional locations
6. **Switch Between Locations**: Click on any saved location button in the header to switch to that location's weather data
7. **Remove Locations**: Open the location modal and use the remove button (X) next to any saved location to delete it
8. **View Saved Locations**: All your saved locations are displayed in the location input modal for easy reference

### Additional Features
9. **Toggle Units**: Switch between Metric (°C, m/s, km) and Imperial (°F, mph, mi) systems using the unit toggle button in the header
10. **Automatic Saving**: All your locations and preferences are saved for future visits
11. **Cache Benefits**: Each location maintains its own weather data cache, preventing data loss when switching between locations

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


## Future Updates

- [X] ~~**Customize Activities**:Ability to add, removem, and sort activities.~~
- [ ] **Weighted Ratings**: Allow users to add weights to each of their rating parameters, or add an easy way to adjust that for the user to avoid them having to do complicated math to ensure that everything always adds up. 
- [X] ~**Multiple Location Support**: Users can now save and manage multiple locations with easy switching between them. Each location maintains its own weather data cache, and the interface provides location buttons for quick switching plus the ability to add and remove locations as needed.~~
- [ ] **Best and Worst Paremeters for the day**:Show the weather parameters that rank high for the day, and those that are ranking low. This will let users know what parameters are most strongly impacting the weather score and they can make assumptions or change their plans based on that information. Like maybe the beach day is not going to be that great today but then you find out that its mostly just the temperature parameter that is bringing the score down for the day, so you can dress differently and still go to the beach. If it were super windy you might not want to go even if it is nice out otherwise. 
- [ ] **Location Based Settings**: Each location should have its own set of customization settings to allow for major differences in climate and activities from location to location (Miami Beach would have different requirements than Denver Colorado).
- [X] ~~**Hourly Metrics**: Ability to see more details about the different metrics used in the rating score when you hover over each hourly ticker in an activity card~~
- [ ] **Customization Modal Enhancements**: Update the customization screen for entering in the API parameter names to upgrade it with a searchable drop down select menu that is prepopulated with all of the items from the [Stormglass Weather API](https://docs.stormglass.io/#/weather). Fix inputs to allow you fully clear them out without validation trying to override the user typing. 
- [ ] **Seasonal Customization**: Add ability to have seasonal customizations. 
