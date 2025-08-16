import { useState } from 'react';
import { 
  ComposedChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Card } from './ui/card';
import { Thermometer, Droplets, Eye, Wind, Gauge, CloudRain } from 'lucide-react';

const WeatherChart = ({ hourlyData }) => {
  // Default visibility - all except visibility
  const [visibleMetrics, setVisibleMetrics] = useState({
    temperature: true,
    humidity: true,
    precipitation: true,
    windSpeed: true,
    pressure: true,
    visibility: false
  });

  if (!hourlyData || hourlyData.length === 0) {
    return null;
  }

  // Process hourly data and convert to Imperial units
  const chartData = hourlyData.map(hour => {
    const time = new Date(hour.time);
    const timeLabel = time.toLocaleTimeString([], { hour: 'numeric', hour12: true });
    
    // Convert to Imperial units
    const tempC = hour.airTemperature?.sg || 0;
    const temperature = Math.round((tempC * 9/5) + 32); // °F
    
    const humidity = Math.round(hour.humidity?.sg || 0); // %
    
    const precipitationMm = hour.precipitation?.sg || 0;
    const cloudCover = hour.cloudCover?.sg || 0;
    const precipitation = Math.round(((precipitationMm > 0.5) ? Math.min(90, 60 + cloudCover * 0.3) : 
                                    (precipitationMm > 0.1) ? Math.min(70, 30 + cloudCover * 0.4) : 
                                    (cloudCover > 70) ? Math.min(40, cloudCover * 0.4) : 
                                    (cloudCover > 40) ? Math.min(20, cloudCover * 0.2) : 
                                    Math.max(0, cloudCover * 0.1))); // %
    
    const windSpeedMs = hour.windSpeed?.sg || 0;
    const windSpeed = Math.round(windSpeedMs * 2.237); // mph
    
    const pressureHpa = hour.pressure?.sg || 1013;
    const pressure = Math.round(pressureHpa * 0.02953 * 100) / 100; // inHg
    
    const visibilityKm = hour.visibility?.sg || 10;
    const visibility = Math.round(visibilityKm * 0.621371); // miles

    return {
      time: timeLabel,
      temperature,
      humidity,
      precipitation,
      windSpeed,
      pressure, // Keep actual pressure values without scaling
      visibility
    };
  });

  const toggleMetric = (metric) => {
    setVisibleMetrics(prev => ({
      ...prev,
      [metric]: !prev[metric]
    }));
  };

  // Define metrics with their properties
  const metrics = [
    {
      key: 'temperature',
      label: 'Temperature (°F)',
      icon: Thermometer,
      color: '#ef4444',
      yAxisId: 'integers',
      type: 'integer'
    },
    {
      key: 'humidity',
      label: 'Humidity (%)',
      icon: Droplets,
      color: '#3b82f6',
      yAxisId: 'percentages',
      type: 'percentage'
    },
    {
      key: 'precipitation',
      label: 'Precipitation Chance (%)',
      icon: CloudRain,
      color: '#06b6d4',
      yAxisId: 'percentages',
      type: 'percentage'
    },
    {
      key: 'windSpeed',
      label: 'Wind Speed (mph)',
      icon: Wind,
      color: '#10b981',
      yAxisId: 'integers',
      type: 'integer'
    },
    {
      key: 'pressure',
      label: 'Pressure (inHg)',
      icon: Gauge,
      color: '#f59e0b',
      yAxisId: 'integers',
      type: 'integer'
    },
    {
      key: 'visibility',
      label: 'Visibility (mi)',
      icon: Eye,
      color: '#8b5cf6',
      yAxisId: 'integers',
      type: 'integer'
    }
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white mb-2">{label}</p>
          {payload.map((entry, index) => {
            let value = entry.value;
            let unit = '';
            
            // Handle special formatting
            if (entry.dataKey === 'temperature') {
              unit = '°F';
            } else if (entry.dataKey === 'humidity' || entry.dataKey === 'precipitation') {
              unit = '%';
            } else if (entry.dataKey === 'windSpeed') {
              unit = ' mph';
            } else if (entry.dataKey === 'pressure') {
              value = value.toFixed(2); // Show pressure with 2 decimal places
              unit = ' inHg';
            } else if (entry.dataKey === 'visibility') {
              unit = ' mi';
            }
            
            return (
              <p key={index} style={{ color: entry.color }} className="text-sm">
                {entry.name}: {value}{unit}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-6 mb-8 bg-white dark:bg-gray-800 shadow-lg">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          Weather Trends Throughout the Day
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Hourly weather data visualization with toggleable metrics
        </p>
        
        {/* Toggle Controls */}
        <div className="flex flex-wrap gap-2 mb-4">
          {metrics.map((metric) => {
            const IconComponent = metric.icon;
            const isVisible = visibleMetrics[metric.key];
            
            return (
              <button
                key={metric.key}
                onClick={() => toggleMetric(metric.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isVisible
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600'
                }`}
              >
                <IconComponent className="w-4 h-4" />
                {metric.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="time" 
              tick={{ fontSize: 12 }}
              className="text-gray-600 dark:text-gray-400"
            />
            
            {/* Left Y-axis for integers (temperature, wind, pressure, visibility) */}
            <YAxis 
              yAxisId="integers"
              orientation="left"
              tick={{ fontSize: 12 }}
              className="text-gray-600 dark:text-gray-400"
              label={{ value: 'Values', angle: -90, position: 'insideLeft' }}
            />
            
            {/* Right Y-axis for percentages (humidity, precipitation) */}
            <YAxis 
              yAxisId="percentages"
              orientation="right"
              domain={[0, 100]}
              tick={{ fontSize: 12 }}
              className="text-gray-600 dark:text-gray-400"
              label={{ value: 'Percentage (%)', angle: 90, position: 'insideRight' }}
            />
            
            <Tooltip content={<CustomTooltip />} />
            <Legend />

            {/* Render lines for visible metrics */}
            {metrics.map((metric) => (
              visibleMetrics[metric.key] && (
                <Line
                  key={metric.key}
                  yAxisId={metric.yAxisId}
                  type="monotone"
                  dataKey={metric.key}
                  stroke={metric.color}
                  strokeWidth={2}
                  dot={{ fill: metric.color, strokeWidth: 2, r: 4 }}
                  name={metric.label}
                  connectNulls={false}
                />
              )
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default WeatherChart;