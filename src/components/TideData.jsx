import { Waves, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { formatTideTime, getTideTypeDescription, getCurrentTideStatus, getNextTideEvents } from '../lib/tides';

const TideData = ({ tideData, loading = false, error = null }) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-500 dark:border-gray-700 dark:border-t-blue-400"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading tide data...</span>
        </div>
      </div>
    );
  }

  if (error || !tideData || tideData.error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <Waves className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {error || tideData?.error || 'Unable to load tide data'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const currentStatus = getCurrentTideStatus(tideData);
  const nextTides = getNextTideEvents(tideData, 4);

  return (
    <div className="bg-white dark:bg-blue-900/10 rounded-lg shadow-sm border border-gray-200 dark:border-blue-900/50 p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <Waves className="w-5 h-5 mr-2 text-blue-500" />
          Tide Data
        </h3>
        {tideData.station && tideData.station.name && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {tideData.station.name}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Tide Status */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
            <Clock className="w-4 h-4 mr-2 text-green-500" />
            Current Status
          </h4>

          {currentStatus ? (
            <div className="space-y-3">
              {/* Current Height */}
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg">
                <div className="flex items-center">
                  <Waves className="w-5 h-5 text-blue-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Current Height</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {currentStatus.trend === 'rising' ? 'Rising' : 'Falling'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {currentStatus.currentHeight.toFixed(2)} ft
                  </p>
                  <div className="flex items-center mt-1">
                    {currentStatus.trend === 'rising' ? (
                      <TrendingUp className="w-3 h-3 text-green-500 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 text-red-500 mr-1" />
                    )}
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      {currentStatus.progress.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Last Tide */}
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 rounded-lg">
                <div className="flex items-center">
                  <div className="w-5 h-5 rounded-full bg-gray-400 mr-3 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">
                      {currentStatus.lastTide.type}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {getTideTypeDescription(currentStatus.lastTide.type)}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {formatTideTime(currentStatus.lastTide.time)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {currentStatus.lastTide.height.toFixed(2)} ft
                  </p>
                </div>
              </div>

              {/* Next Tide */}
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg">
                <div className="flex items-center">
                  <div className="w-5 h-5 rounded-full bg-green-500 mr-3 flex items-center justify-center">
                    <span className="text-xs font-bold text-white">
                      {currentStatus.nextTide.type}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {getTideTypeDescription(currentStatus.nextTide.type)}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {formatTideTime(currentStatus.nextTide.time)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {currentStatus.nextTide.height.toFixed(2)} ft
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-center">
                <Clock className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  No current tide data available
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Upcoming Tides */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
            <Waves className="w-4 h-4 mr-2 text-blue-500" />
            Upcoming Tides
          </h4>

          {nextTides.length > 0 ? (
            <div className="space-y-2">
              {nextTides.map((tide, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-800 dark:to-gray-800 rounded-lg"
                >
                  <div className="flex items-center">
                    <div className={`w-5 h-5 rounded-full mr-3 flex items-center justify-center ${
                      tide.type === 'H' || tide.type === 'h' ? 'bg-blue-500' : 'bg-gray-500'
                    }`}>
                      <span className="text-xs font-bold text-white">
                        {tide.type}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {tide.description}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {formatTideTime(tide.time)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {tide.height.toFixed(2)} ft
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center p-8 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-center">
                <Waves className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  No upcoming tide data available
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tide Range Visualization */}
      {tideData.predictions && tideData.predictions.length > 0 && (
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Tide Range Today</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {tideData.predictions.length} predictions
            </span>
          </div>

          {/* Simple tide chart visualization */}
          <div className="h-16 bg-white dark:bg-gray-800 rounded-lg p-2">
            <div className="h-full flex items-end space-x-1">
              {tideData.predictions.slice(0, 24).map((prediction, index) => {
                const height = parseFloat(prediction.v);
                const maxHeight = Math.max(...tideData.predictions.map(p => parseFloat(p.v)));
                const minHeight = Math.min(...tideData.predictions.map(p => parseFloat(p.v)));
                const range = maxHeight - minHeight;
                const normalizedHeight = range > 0 ? ((height - minHeight) / range) * 100 : 50;

                return (
                  <div
                    key={index}
                    className={`flex-1 rounded-t-sm transition-all duration-200 ${
                      prediction.type === 'H' || prediction.type === 'h'
                        ? 'bg-blue-400 dark:bg-blue-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    style={{ height: `${Math.max(normalizedHeight, 5)}%` }}
                    title={`${getTideTypeDescription(prediction.type)}: ${height.toFixed(2)} ft at ${formatTideTime(prediction.t)}`}
                  ></div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
            <span>Low Tide</span>
            <span>High Tide</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TideData;
