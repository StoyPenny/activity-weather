import { useState, useMemo } from 'react';
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
import { getParameterUnits } from '../lib/settings';

const WeatherChart = ({ hourlyData, unitPreference }) => {
  const [visibleMetrics, setVisibleMetrics] = useState({
    temperature: true,
    humidity: true,
    precipitation: true,
    windSpeed: true,
    pressure: true,
    visibility: true,
  });

  const getUnit = useMemo(() => {
    return (param) => getParameterUnits(param, unitPreference);
  }, [unitPreference]);

  const metrics = useMemo(
    () => [
      {
        key: 'temperature',
        label: `Temperature (${getUnit('airTemperature').unit})`,
        icon: Thermometer,
        color: '#ef4444',
        yAxisId: 'integers',
      },
      {
        key: 'humidity',
        label: 'Humidity (%)',
        icon: Droplets,
        color: '#3b82f6',
        yAxisId: 'percentages',
      },
      {
        key: 'precipitation',
        label: `Precipitation (${getUnit('precipitation').unit})`,
        icon: CloudRain,
        color: '#06b6d4',
        yAxisId: 'integers',
      },
      {
        key: 'windSpeed',
        label: `Wind Speed (${getUnit('windSpeed').unit})`,
        icon: Wind,
        color: '#10b981',
        yAxisId: 'integers',
      },
      {
        key: 'pressure',
        label: `Pressure (${getUnit('pressure').unit})`,
        icon: Gauge,
        color: '#f59e0b',
        yAxisId: 'integers',
      },
      {
        key: 'visibility',
        label: `Visibility (${getUnit('visibility').unit})`,
        icon: Eye,
        color: '#8b5cf6',
        yAxisId: 'integers',
      },
    ],
    [getUnit]
  );
  
  const chartData = useMemo(() => {
    if (!hourlyData) return [];
    return hourlyData.map((hour) => {
      const time = new Date(hour.time);
      const timeLabel = time.toLocaleTimeString([], {
        hour: 'numeric',
        hour12: true,
      });

      const tempUnit = getUnit('airTemperature');
      const temperature = Math.round(
        tempUnit.convert(hour.airTemperature?.sg || 0)
      );

      const humidity = Math.round(hour.humidity?.sg || 0);

      const precipUnit = getUnit('precipitation');
      const precipitation = Math.round(
        precipUnit.convert(hour.precipitation?.sg || 0)
      );

      const windUnit = getUnit('windSpeed');
      const windSpeed = Math.round(windUnit.convert(hour.windSpeed?.sg || 0));

      const pressureUnit = getUnit('pressure');
      const pressure = parseFloat(
        pressureUnit.convert(hour.pressure?.sg || 1013).toFixed(2)
      );

      const visibilityUnit = getUnit('visibility');
      const visibility = Math.round(
        visibilityUnit.convert(hour.visibility?.sg || 10)
      );

      return {
        time: timeLabel,
        temperature,
        humidity,
        precipitation,
        windSpeed,
        pressure,
        visibility,
      };
    });
  }, [hourlyData, getUnit]);

  const toggleMetric = (metric) => {
    setVisibleMetrics((prev) => ({
      ...prev,
      [metric]: !prev[metric],
    }));
  };

  if (!hourlyData || hourlyData.length === 0) {
    return null;
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white mb-2">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm capitalize">
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="p-4 mb-8 md:p-6 bg-white dark:bg-blue-950/20 dark:border-blue-900/50 rounded-lg shadow-lg">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          24-hour Weather Trends
        </h2>
        <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
          Toggle metrics below to customize the chart view
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