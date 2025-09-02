import { Sun, Moon, Sunrise, Sunset, MoonIcon } from 'lucide-react';
import { formatAstronomyTime, getMoonPhaseDescription } from '../lib/astronomy';

const AstronomicalData = ({ astronomyData, loading = false, error = null }) => {
  if (loading) {
    return (
      <div className="bg-white dark:bg-blue-950/20 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-500 dark:border-gray-700 dark:border-t-blue-400"></div>
          <span className="ml-2 text-gray-600 dark:text-gray-400">Loading astronomical data...</span>
        </div>
      </div>
    );
  }

  if (error || !astronomyData || astronomyData.error) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <Sun className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              {error || astronomyData?.error || 'Unable to load astronomical data'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { sun, moon } = astronomyData;
  
  // Debug info for development
  const dataSource = astronomyData.apiSource || (astronomyData.isMockData ? 'MOCK' : 'UNKNOWN');

  return (
    <div className="bg-white dark:bg-blue-900/10 rounded-lg shadow-sm border border-gray-200 dark:border-blue-900/50 p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
          <Sun className="w-5 h-5 mr-2 text-yellow-500" />
          Astronomical Data
        </h3>
        {/* Data source indicator */}
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${
          dataSource === 'USNO' 
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
            : dataSource === 'ERROR'
            ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
            : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
        }`}>
          {dataSource === 'USNO' ? '🌐 Live Data' : dataSource === 'ERROR' ? '❌ API Error' : '❓ Unknown'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sun Data */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
            <Sun className="w-4 h-4 mr-2 text-yellow-500" />
            Sun
          </h4>

          <div className="space-y-3">
            {/* Sunrise */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-yellow-50 dark:from-orange-900/20 dark:to-yellow-900/20 rounded-lg">
              <div className="flex items-center">
                <Sunrise className="w-5 h-5 text-orange-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Sunrise</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Dawn</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatAstronomyTime(sun.rise)}
                </p>
              </div>
            </div>

            {/* Sunset */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
              <div className="flex items-center">
                <Sunset className="w-5 h-5 text-purple-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Sunset</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Dusk</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatAstronomyTime(sun.set)}
                </p>
              </div>
            </div>

            {/* Solar Noon */}
            {sun.transit && (
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg">
                <div className="flex items-center">
                  <Sun className="w-5 h-5 text-yellow-600 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Solar Noon</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Highest point</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">
                    {formatAstronomyTime(sun.transit)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Moon Data */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
            <Moon className="w-4 h-4 mr-2 text-blue-500" />
            Moon
          </h4>

          <div className="space-y-3">
            {/* Moon Phase */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg">
              <div className="flex items-center">
                <MoonIcon className="w-5 h-5 text-blue-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Phase</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {moon.fraction !== null ? `${(moon.fraction * 100).toFixed(0)}% illuminated` : 'Unknown'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {getMoonPhaseDescription(moon.fraction)}
                </p>
              </div>
            </div>

            {/* Moonrise */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg">
              <div className="flex items-center">
                <Moon className="w-5 h-5 text-indigo-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Moonrise</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Rise time</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatAstronomyTime(moon.rise)}
                </p>
              </div>
            </div>

            {/* Moonset */}
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg">
              <div className="flex items-center">
                <Moon className="w-5 h-5 text-purple-500 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Moonset</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Set time</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatAstronomyTime(moon.set)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Moon Phase Visual Indicator */}
      {moon.fraction !== null && (
        <div className="mt-6 p-4 bg-gradient-to-r from-slate-50 to-gray-50 dark:from-slate-800 dark:to-gray-800 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Moon Phase</span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {getMoonPhaseDescription(moon.fraction)}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-blue-400 to-purple-500 h-3 rounded-full transition-all duration-300"
              style={{ width: `${moon.fraction * 100}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>New Moon</span>
            <span>Full Moon</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AstronomicalData;
