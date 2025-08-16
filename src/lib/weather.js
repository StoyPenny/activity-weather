// --- MOCK DATA SERVICE ---
// This now includes data for multiple hours to simulate a daily forecast.
const mockWeatherData = {
  hours: [
    // Morning (Cooler, calmer)
    { time: '2025-08-16T08:00:00+00:00', airTemperature: { sg: 22 }, cloudCover: { sg: 10 }, swellHeight: { sg: 1.2 }, swellPeriod: { sg: 8 }, waterTemperature: { sg: 23 }, waveHeight: { sg: 0.8 }, windSpeed: { sg: 2 } },
    { time: '2025-08-16T09:00:00+00:00', airTemperature: { sg: 23 }, cloudCover: { sg: 15 }, swellHeight: { sg: 1.3 }, swellPeriod: { sg: 8 }, waterTemperature: { sg: 23 }, waveHeight: { sg: 0.9 }, windSpeed: { sg: 3 } },
    { time: '2025-08-16T10:00:00+00:00', airTemperature: { sg: 25 }, cloudCover: { sg: 20 }, swellHeight: { sg: 1.5 }, swellPeriod: { sg: 7.5 }, waterTemperature: { sg: 24 }, waveHeight: { sg: 1.1 }, windSpeed: { sg: 4 } },
    { time: '2025-08-16T11:00:00+00:00', airTemperature: { sg: 26 }, cloudCover: { sg: 25 }, swellHeight: { sg: 1.8 }, swellPeriod: { sg: 7 }, waterTemperature: { sg: 24 }, waveHeight: { sg: 1.2 }, windSpeed: { sg: 5 } },
    // Midday (Hottest, wind picks up)
    { time: '2025-08-16T12:00:00+00:00', airTemperature: { sg: 28 }, cloudCover: { sg: 30 }, swellHeight: { sg: 2.0 }, swellPeriod: { sg: 6.5 }, waterTemperature: { sg: 25 }, waveHeight: { sg: 1.5 }, windSpeed: { sg: 6 } },
    { time: '2025-08-16T13:00:00+00:00', airTemperature: { sg: 29 }, cloudCover: { sg: 40 }, swellHeight: { sg: 2.1 }, swellPeriod: { sg: 6 }, waterTemperature: { sg: 25 }, waveHeight: { sg: 1.6 }, windSpeed: { sg: 7 } },
    { time: '2025-08-16T14:00:00+00:00', airTemperature: { sg: 29 }, cloudCover: { sg: 50 }, swellHeight: { sg: 2.0 }, swellPeriod: { sg: 6 }, waterTemperature: { sg: 25 }, waveHeight: { sg: 1.5 }, windSpeed: { sg: 7 } },
    // Afternoon (Clouds increase, wind may drop)
    { time: '2025-08-16T15:00:00+00:00', airTemperature: { sg: 28 }, cloudCover: { sg: 60 }, swellHeight: { sg: 1.9 }, swellPeriod: { sg: 6.5 }, waterTemperature: { sg: 25 }, waveHeight: { sg: 1.4 }, windSpeed: { sg: 6 } },
    { time: '2025-08-16T16:00:00+00:00', airTemperature: { sg: 27 }, cloudCover: { sg: 55 }, swellHeight: { sg: 1.8 }, swellPeriod: { sg: 7 }, waterTemperature: { sg: 24 }, waveHeight: { sg: 1.3 }, windSpeed: { sg: 5 } },
    { time: '2025-08-16T17:00:00+00:00', airTemperature: { sg: 26 }, cloudCover: { sg: 45 }, swellHeight: { sg: 1.6 }, swellPeriod: { sg: 7.5 }, waterTemperature: { sg: 24 }, waveHeight: { sg: 1.1 }, windSpeed: { sg: 4 } },
  ],
};

export const fetchWeatherData = async () => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return mockWeatherData.hours;
};

// --- RATING LOGIC ---
const normalize = (value, optimal, range) => Math.max(0, 10 - (Math.abs(value - optimal) / range) * 10);
const inverseNormalize = (value, max) => Math.max(0, 10 - (value / max) * 10);

const rateSurfing = (d) => (normalize(d.swellHeight.sg, 1.5, 1.5) + normalize(d.swellPeriod.sg, 8, 4) + normalize(d.windSpeed.sg, 3, 5)) / 3;
const rateFishing = (d) => (inverseNormalize(d.windSpeed.sg, 10) + normalize(d.cloudCover.sg, 40, 30)) / 2;
const rateBoating = (d) => (inverseNormalize(d.windSpeed.sg, 12) + inverseNormalize(d.waveHeight.sg, 1)) / 2;
const rateHiking = (d) => (normalize(d.airTemperature.sg, 22, 10) + inverseNormalize(d.windSpeed.sg, 10) + inverseNormalize(d.cloudCover.sg, 80)) / 3;
const rateCamping = (d) => (normalize(d.airTemperature.sg, 20, 10) + inverseNormalize(d.windSpeed.sg, 8) + inverseNormalize(d.cloudCover.sg, 90)) / 3;
const rateBeachDay = (d) => (normalize(d.airTemperature.sg, 28, 8) + normalize(d.windSpeed.sg, 4, 6) + normalize(d.cloudCover.sg, 15, 20)) / 3;
const rateKayaking = (d) => (inverseNormalize(d.windSpeed.sg, 6) + inverseNormalize(d.waveHeight.sg, 0.5)) / 2;
const rateSnorkeling = (d) => (normalize(d.waterTemperature.sg, 26, 6) + inverseNormalize(d.waveHeight.sg, 0.3)) / 2;

// --- Main Calculation Function - MODIFIED ---
// This now processes an array of hourly data and returns ratings for each hour.
export const calculateAllHourlyRatings = (hourlyData) => {
  const activities = {
    Surfing: rateSurfing, Fishing: rateFishing, Boating: rateBoating,
    Hiking: rateHiking, Camping: rateCamping, 'Beach Day': rateBeachDay,
    Kayaking: rateKayaking, Snorkeling: rateSnorkeling,
  };

  const masterRatings = {};
  for (const activityName in activities) {
    masterRatings[activityName] = hourlyData.map(hourData => ({
        time: hourData.time,
        rating: activities[activityName](hourData)
    }));
  }
  return masterRatings;
};