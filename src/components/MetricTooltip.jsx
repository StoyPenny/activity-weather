import { getParameterUnits, getUnitPreference } from '../lib/settings';

const MetricTooltip = ({ time, rating, metrics, activityName }) => {
  const formatTime = (isoString) => {
    return new Date(isoString).toLocaleTimeString([], { hour: 'numeric', hour12: true });
  };

  const getScoreColor = (score) => {
    // 5-level rating system: Poor, Fair, Good, Very Good, Excellent
    if (score >= 8) {
      return 'text-blue-600'; // Excellent (8-10)
    } else if (score >= 6) {
      return 'text-green-600'; // Very Good (6-8)
    } else if (score >= 4) {
      return 'text-yellow-600'; // Good (4-6)
    } else if (score >= 2) {
      return 'text-orange-600'; // Fair (2-4)
    } else {
      return 'text-red-600'; // Poor (0-2)
    }
  };

  const getScoreBarColor = (score) => {
    // Same color scheme but for background colors
    if (score >= 8) {
      return 'bg-blue-500'; // Excellent (8-10)
    } else if (score >= 6) {
      return 'bg-green-500'; // Very Good (6-8)
    } else if (score >= 4) {
      return 'bg-yellow-500'; // Good (4-6)
    } else if (score >= 2) {
      return 'bg-orange-500'; // Fair (2-4)
    } else {
      return 'bg-red-500'; // Poor (0-2)
    }
  };

  const formatParameterName = (paramName) => {
    // Convert camelCase to readable format
    const formatted = paramName
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase());
    
    // Handle special cases
    const specialCases = {
      'Air Temperature': 'Air Temp',
      'Water Temperature': 'Water Temp',
      'Dew Point Temperature': 'Dew Point',
      'Wind Speed': 'Wind Speed',
      'Wave Height': 'Wave Height',
      'Wave Period': 'Wave Period',
      'Swell Height': 'Swell Height',
      'Swell Period': 'Swell Period',
      'Wind Wave Height' : 'Wind Wave Height',
      'Wind Wave Period': 'Wind Wave Period',
      'Wind Direction': 'Wind Dir',
      'Cloud Cover': 'Clouds'
    };
    
    return specialCases[formatted] || formatted;
  };

  const formatValue = (paramName, value) => {
    const unitPreference = getUnitPreference();
    const paramUnits = getParameterUnits(paramName, unitPreference);
    const convertedValue = paramUnits.convert(value);
    
    // Format based on parameter type
    let formattedValue;
    if (paramName.includes('Temperature')) {
      formattedValue = Math.round(convertedValue);
    } else if (paramName === 'cloudCover' || paramName === 'humidity') {
      formattedValue = Math.round(value); // These are already percentages
    } else if (paramName === 'windDirection') {
      formattedValue = Math.round(value); // Degrees
    } else if (paramName.includes('Height') || paramName.includes('Speed') || paramName === 'visibility') {
      formattedValue = convertedValue.toFixed(1);
    } else if (paramName === 'precipitation') {
      formattedValue = convertedValue.toFixed(2);
    } else if (paramName === 'pressure') {
      formattedValue = Math.round(convertedValue);
    } else {
      formattedValue = convertedValue.toFixed(1);
    }
    
    return `${formattedValue}${paramUnits.unit}`;
  };

  const getParameterDescription = (paramName, config) => {
    const unitPreference = getUnitPreference();
    const paramUnits = getParameterUnits(paramName, unitPreference);

    const formatConfigValue = (value) => {
      if (typeof value !== 'number') return value;
      const convertedValue = paramUnits.convert(value);
      // Round to 2 decimal places and remove trailing zeros if not needed.
      return Number(convertedValue.toFixed(2));
    };

    if (config.type === 'normalize') {
      return `Optimal: ${formatConfigValue(config.optimal)}${paramUnits.unit}`;
    } else if (config.type === 'inverse') {
      return `Lower is better (max: ${formatConfigValue(config.max)}${paramUnits.unit}`;
    }
    return '';
  };

  if (!metrics || Object.keys(metrics).length === 0) {
    // Fallback to simple tooltip if no metrics available
    return (
      <div className="bg-gray-800 text-white text-xs rounded py-2 px-3 shadow-lg">
        <div className="font-semibold">{formatTime(time)}</div>
        <div className="text-gray-300">Rating: {rating.toFixed(1)}/10</div>
      </div>
    );
  }

  return (
    <div
      className="bg-gray-800 text-white text-xs rounded-lg py-3 px-4 shadow-xl w-[16rem] max-w-xs sm:max-w-sm"
      role="tooltip"
      aria-label={`Detailed metrics for ${activityName} at ${formatTime(time)}`}
    >
      {/* Header */}
      <div className="border-b border-gray-600 pb-2 mb-3">
        <div className="font-semibold text-sm">{formatTime(time)}</div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-gray-300">{activityName}</span>
          <span className={`font-bold ${getScoreColor(rating)}`}>
            {rating.toFixed(1)}/10
          </span>
        </div>
      </div>

      {/* Metrics Breakdown */}
      <div className="space-y-2">
        <div className="text-gray-400 text-xs font-medium mb-2">Metric Breakdown:</div>
        {Object.entries(metrics).map(([paramName, metric]) => (
          <div key={paramName} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-xs">
                {formatParameterName(paramName)}
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-gray-400 text-xs">
                  {formatValue(paramName, metric.value)}
                </span>
                <span className={`font-medium ${getScoreColor(metric.score)}`}>
                  {metric.score.toFixed(1)}
                </span>
              </div>
            </div>
            
            {/* Score bar */}
            <div className="w-full bg-gray-700 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${getScoreBarColor(metric.score)}`}
                style={{ width: `${Math.max(0, Math.min(100, (metric.score / 10) * 100))}%` }}
              ></div>
            </div>
            
            {/* Parameter description */}
            {metric.config && (
              <div className="text-gray-500 text-xs">
                {getParameterDescription(paramName, metric.config)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="border-t border-gray-600 pt-2 mt-3">
        <div className="text-gray-500 text-xs">
          Overall rating is the average of all metrics
        </div>
      </div>
    </div>
  );
};

export default MetricTooltip;