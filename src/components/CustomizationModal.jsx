import { useState, useEffect } from 'react';
import { X, Settings, RotateCcw, Save } from 'lucide-react';
import { loadSettings, saveSettings, resetToDefaults, addUserPreference, removeUserPreference, setUnitPreference, getParameterUnits } from '../lib/settings';

const CustomizationModal = ({ onClose, onSave }) => {
  const [settings, setSettings] = useState(null);
  const [selectedActivity, setSelectedActivity] = useState('Beach Day');
  const [newParameter, setNewParameter] = useState('');
  const [newParamType, setNewParamType] = useState('normalize');
  const [newParamOptimal, setNewParamOptimal] = useState(0);
  const [newParamRange, setNewParamRange] = useState(1);
  const [newParamMax, setNewParamMax] = useState(10);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  
  // Get unit preference from settings or default to metric
  const unitPreference = settings?.unitPreference || 'metric';
  
  // Handle changing unit preference
  const handleUnitChange = (newUnit) => {
    try {
      const updatedSettings = { ...settings, unitPreference: newUnit };
      setSettings(updatedSettings);
      setUnitPreference(newUnit);
    } catch (err) {
      setError('Failed to change unit preference');
      console.error(err);
    }
  };
  
  // Convert value for display based on unit preference
  const convertForDisplay = (value, parameter) => {
    if (!settings) return value;
    const unitInfo = getParameterUnits(parameter, unitPreference);
    return unitInfo.convert(parseFloat(value) || 0);
  };
  
  // Convert value for storage (always store in metric)
  const convertForStorage = (value, parameter) => {
    if (!settings) return value;
    // Always store in metric units
    if (unitPreference === 'imperial') {
      // Convert from imperial to metric for storage
      if (parameter.includes('Temperature')) {
        // F to C: (F - 32) * 5/9
        return ((parseFloat(value) || 0) - 32) * 5/9;
      } else if (parameter.includes('Speed') || parameter.includes('speed')) {
        // mph to m/s: mph / 2.23694
        return (parseFloat(value) || 0) / 2.23694;
      } else if (parameter.includes('Height') || parameter.includes('height')) {
        // ft to m: ft / 3.28084
        return (parseFloat(value) || 0) / 3.28084;
      }
    }
    return parseFloat(value) || 0;
  };

  // Load settings on component mount
  useEffect(() => {
    try {
      const loadedSettings = loadSettings();
      setSettings(loadedSettings);
    } catch (err) {
      setError('Failed to load settings');
      console.error(err);
    }
  }, []);

  // Get user preferences for the selected activity
  const getUserPreferences = () => {
    if (!settings) return {};
    return settings.userPreferences?.[selectedActivity] || {};
  };

  // Get default parameters for the selected activity
  const getDefaultParameters = () => {
    if (!settings) return {};
    return settings.defaults?.[selectedActivity] || {};
  };

  // Handle adding a new parameter
  const handleAddParameter = (e) => {
    e.preventDefault();
    
    if (!newParameter.trim()) {
      setError('Please enter a parameter name');
      return;
    }
    
    try {
      let paramConfig;
      if (newParamType === 'normalize') {
        paramConfig = {
          type: 'normalize',
          optimal: parseFloat(newParamOptimal),
          range: parseFloat(newParamRange)
        };
      } else {
        paramConfig = {
          type: 'inverse',
          max: parseFloat(newParamMax)
        };
      }
      
      const updatedSettings = addUserPreference(selectedActivity, newParameter, paramConfig);
      setSettings(updatedSettings);
      
      // Reset form
      setNewParameter('');
      setNewParamType('normalize');
      setNewParamOptimal(0);
      setNewParamRange(1);
      setNewParamMax(10);
      setError(null);
    } catch (err) {
      setError('Failed to add parameter');
      console.error(err);
    }
  };

  // Handle removing a parameter
  const handleRemoveParameter = (paramName) => {
    try {
      const updatedSettings = removeUserPreference(selectedActivity, paramName);
      setSettings(updatedSettings);
    } catch (err) {
      setError('Failed to remove parameter');
      console.error(err);
    }
  };

  // Handle parameter value change
  const handleParameterChange = (paramName, field, value) => {
    try {
      const userPreferences = getUserPreferences();
      const paramConfig = { ...userPreferences[paramName] };
      
      // Update the field value
      if (field === 'type') {
        paramConfig.type = value;
        // Reset to appropriate default values when changing type
        if (value === 'normalize') {
          paramConfig.optimal = 0;
          paramConfig.range = 1;
          delete paramConfig.max;
        } else {
          paramConfig.max = 10;
          delete paramConfig.optimal;
          delete paramConfig.range;
        }
      } else {
        paramConfig[field] = parseFloat(value);
      }
      
      // Update settings
      const updatedSettings = addUserPreference(selectedActivity, paramName, paramConfig);
      setSettings(updatedSettings);
    } catch (err) {
      setError('Failed to update parameter');
      console.error(err);
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!settings) return;
    
    setIsSaving(true);
    setError(null);
    
    try {
      saveSettings(settings);
      onSave?.(settings);
      onClose();
    } catch (err) {
      setError('Failed to save settings');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle reset to defaults
  const handleReset = () => {
    try {
      const resetSettings = resetToDefaults();
      setSettings(resetSettings);
      setError(null);
    } catch (err) {
      setError('Failed to reset settings');
      console.error(err);
    }
  };

  if (!settings) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-blue-500" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Activity Scoring Customization
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-md overflow-hidden border border-gray-300 dark:border-gray-600">
                <button
                  onClick={() => handleUnitChange('metric')}
                  className={`px-3 py-1 text-sm font-medium transition-colors ${
                    unitPreference === 'metric'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  °C
                </button>
                <button
                  onClick={() => handleUnitChange('imperial')}
                  className={`px-3 py-1 text-sm font-medium transition-colors ${
                    unitPreference === 'imperial'
                      ? 'bg-blue-500 text-white'
                      : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  °F
                </button>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>
          </div>
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-blue-500 dark:border-gray-700 dark:border-t-blue-400"></div>
          </div>
        </div>
      </div>
    );
  }

  const activities = Object.keys(settings.defaults);
  const userPreferences = getUserPreferences();
  const defaultParameters = getDefaultParameters();
  const allParameters = { ...defaultParameters, ...userPreferences };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Activity Scoring Customization
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Activity Tabs */}
        <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-2 overflow-x-auto pb-2">
            {activities.map((activity) => (
              <button
                key={activity}
                onClick={() => setSelectedActivity(activity)}
                className={`px-3 py-2 text-sm font-medium rounded-t-md whitespace-nowrap transition-colors ${
                  selectedActivity === activity
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500'
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {activity}
                {settings.userPreferences?.[activity] && Object.keys(settings.userPreferences[activity]).length > 0 && (
                  <span className="ml-1 text-xs bg-blue-500 text-white rounded-full px-1.5 py-0.5">
                    {Object.keys(settings.userPreferences[activity]).length}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Parameters List */}
        <div className="mb-6">
          <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
            Parameters for {selectedActivity}
          </h3>
          
          {Object.keys(allParameters).length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No parameters configured for this activity.</p>
              <p className="text-sm mt-2">Add a parameter below to get started.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(allParameters).map(([paramName, paramConfig]) => {
                const isCustom = userPreferences[paramName] !== undefined;
                const isDefault = defaultParameters[paramName] !== undefined;
                
                return (
                  <div 
                    key={paramName} 
                    className={`p-4 rounded-md border ${
                      isCustom 
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
                        : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <h4 className="font-medium text-gray-900 dark:text-white">{paramName}</h4>
                        {isCustom && (
                          <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                            Custom
                          </span>
                        )}
                        {isDefault && !isCustom && (
                          <span className="ml-2 text-xs bg-gray-100 dark:bg-gray-600 text-gray-800 dark:text-gray-200 px-2 py-1 rounded">
                            Default
                          </span>
                        )}
                      </div>
                      {isCustom && (
                        <button
                          onClick={() => handleRemoveParameter(paramName)}
                          className="text-red-500 hover:text-red-700 dark:hover:text-red-400 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Parameter Type
                        </label>
                        <select
                          value={paramConfig.type}
                          onChange={(e) => handleParameterChange(paramName, 'type', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="normalize">Normalize (optimal value)</option>
                          <option value="inverse">Inverse (lower is better)</option>
                        </select>
                      </div>
                      
                      {paramConfig.type === 'normalize' ? (
                        <>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Optimal Value
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.1"
                                value={convertForDisplay(paramConfig.optimal || 0, paramName)}
                                onChange={(e) => handleParameterChange(paramName, 'optimal', convertForStorage(e.target.value, paramName))}
                                className="w-full px-3 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500 dark:text-gray-400">
                                {getParameterUnits(paramName, unitPreference).unit}
                              </div>
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              Range
                            </label>
                            <div className="relative">
                              <input
                                type="number"
                                step="0.1"
                                min="0.1"
                                value={convertForDisplay(paramConfig.range || 1, paramName)}
                                onChange={(e) => handleParameterChange(paramName, 'range', convertForStorage(e.target.value, paramName))}
                                className="w-full px-3 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              />
                              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500 dark:text-gray-400">
                                {getParameterUnits(paramName, unitPreference).unit}
                              </div>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Maximum Value
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.1"
                              min="0.1"
                              value={convertForDisplay(paramConfig.max || 10, paramName)}
                              onChange={(e) => handleParameterChange(paramName, 'max', convertForStorage(e.target.value, paramName))}
                              className="w-full px-3 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500 dark:text-gray-400">
                              {getParameterUnits(paramName, unitPreference).unit}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add Parameter Form */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
          <h3 className="text-md font-medium text-gray-900 dark:text-white mb-4">
            Add New Parameter
          </h3>
          
          <form onSubmit={handleAddParameter} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Parameter Name
                </label>
                <input
                  type="text"
                  value={newParameter}
                  onChange={(e) => setNewParameter(e.target.value)}
                  placeholder="e.g., airTemperature, windSpeed"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Parameter Type
                </label>
                <select
                  value={newParamType}
                  onChange={(e) => setNewParamType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="normalize">Normalize (optimal value)</option>
                  <option value="inverse">Inverse (lower is better)</option>
                </select>
              </div>
            </div>
            
            {newParamType === 'normalize' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Optimal Value
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      value={convertForDisplay(newParamOptimal, newParameter || 'airTemperature')}
                      onChange={(e) => setNewParamOptimal(convertForStorage(e.target.value, newParameter || 'airTemperature'))}
                      className="w-full px-3 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500 dark:text-gray-400">
                      {getParameterUnits(newParameter || 'airTemperature', unitPreference).unit}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Range
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      value={convertForDisplay(newParamRange, newParameter || 'airTemperature')}
                      onChange={(e) => setNewParamRange(convertForStorage(e.target.value, newParameter || 'airTemperature'))}
                      className="w-full px-3 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500 dark:text-gray-400">
                      {getParameterUnits(newParameter || 'airTemperature', unitPreference).unit}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Maximum Value
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={convertForDisplay(newParamMax, newParameter || 'windSpeed')}
                    onChange={(e) => setNewParamMax(convertForStorage(e.target.value, newParameter || 'windSpeed'))}
                    className="w-full px-3 py-2 pr-12 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500 dark:text-gray-400">
                    {getParameterUnits(newParameter || 'windSpeed', unitPreference).unit}
                  </div>
                </div>
              </div>
            )}
            
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
            >
              Add Parameter
            </button>
          </form>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleReset}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium rounded-md transition-colors"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomizationModal;