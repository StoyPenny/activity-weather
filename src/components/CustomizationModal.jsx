import { useState, useEffect } from 'react';
import { X, Settings, Save, Plus, Trash2, GripVertical } from 'lucide-react';
import { loadSettings, saveSettings, addActivityParameter, removeActivityParameter, updateActivityParameter, getParameterUnits, getActivityList, reorderActivities, validateWeatherParameter } from '../lib/settings';
import SearchableParameterDropdown from './SearchableParameterDropdown';

const CustomizationModal = ({ onClose, onSave, unitPreference = 'metric' }) => {
  const [settings, setSettings] = useState(null);
  const [activityList, setActivityList] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState('Beach Day');
  const [newParameter, setNewParameter] = useState('');
  const [newParamType, setNewParamType] = useState('normalize');
  const [newParamOptimal, setNewParamOptimal] = useState(0);
  const [newParamRange, setNewParamRange] = useState(1);
  const [newParamMax, setNewParamMax] = useState(10);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [newActivity, setNewActivity] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [dragItem, setDragItem] = useState(null);
  
  // Convert value for display based on unit preference
  const convertForDisplay = (value, parameter) => {
    const unitInfo = getParameterUnits(parameter, unitPreference);
    const convertedValue = unitInfo.convert(parseFloat(value) || 0);
    // round to 1 decimal place
    return Math.round(convertedValue * 10) / 10;
  };
  
  // Convert value for storage (always store in metric)
  const convertForStorage = (value, parameter) => {
    if (unitPreference === 'imperial') {
      const unitInfo = getParameterUnits(parameter, 'metric');
      const imperialUnitInfo = getParameterUnits(parameter, 'imperial');
      
      if (unitInfo.unit === '°C' && imperialUnitInfo.unit === '°F') {
        return (parseFloat(value) - 32) * 5/9;
      }
      if (unitInfo.unit === 'm/s' && imperialUnitInfo.unit === 'mph') {
        return parseFloat(value) / 2.23694;
      }
      if (unitInfo.unit === 'm' && imperialUnitInfo.unit === 'ft') {
        return parseFloat(value) / 3.28084;
      }
      if (unitInfo.unit === 'km' && imperialUnitInfo.unit === 'mi') {
        return parseFloat(value) / 0.621371;
      }
      if (unitInfo.unit === 'mm' && imperialUnitInfo.unit === 'in') {
        return parseFloat(value) / 0.0393701;
      }
      if (unitInfo.unit === 'hPa' && imperialUnitInfo.unit === 'inHg') {
          return parseFloat(value) * 33.863886666667;
      }
    }
    return parseFloat(value);
  };

  // Load settings on component mount
  useEffect(() => {
    try {
      const loadedSettings = loadSettings();
      setSettings(loadedSettings);
      
      // Load activity list from settings
      const loadedActivities = getActivityList();
      setActivityList(loadedActivities);
      
      // Set the first activity as selected if none is selected or if the selected activity doesn't exist
      if (loadedActivities.length > 0 && (!selectedActivity || !loadedActivities.includes(selectedActivity))) {
        setSelectedActivity(loadedActivities[0]);
      }
    } catch (err) {
      setError('Failed to load settings');
      console.error(err);
    }
  }, []);

  // Get activity parameters for the selected activity (unified)
  const getActivityParameters = (activity = selectedActivity) => {
    if (!settings) return {};
    return settings.activityParams?.[activity] || {};
  };

  // Handle adding a new parameter
  const handleAddParameter = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    
    const name = newParameter.trim();
    if (!name) {
      setError('Please enter a parameter name');
      return;
    }
    
    // Validate parameter against known weather parameters
    const validation = validateWeatherParameter(name);
    if (!validation.isValid) {
      const suggestionText = validation.suggestions && validation.suggestions.length
        ? ` Suggestions: ${validation.suggestions.slice(0,5).join(', ')}`
        : '';
      setError(`Invalid parameter name.${suggestionText}`);
      return;
    }
    
    try {
      let paramConfig;
      if (newParamType === 'normalize') {
        paramConfig = {
          type: 'normalize',
          optimal: convertForStorage(newParamOptimal, name),
          range: parseFloat(newParamRange)
        };
      } else {
        paramConfig = {
          type: 'inverse',
          max: convertForStorage(newParamMax, name)
        };
      }
      
      const updatedSettings = addActivityParameter(selectedActivity, name, paramConfig);
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
      const updatedSettings = removeActivityParameter(selectedActivity, paramName);
      setSettings(updatedSettings);
    } catch (err) {
      setError('Failed to remove parameter');
      console.error(err);
    }
  };

  // Handle parameter value change
  const handleParameterChange = (paramName, field, value) => {
    try {
      const activityParams = getActivityParameters();
      const paramConfig = { ...activityParams[paramName] };
      
      // Update the field value
      if (field === 'type') {
        paramConfig.type = value;
        // Reset to appropriate default values when changing type
        if (value === 'normalize') {
          paramConfig.optimal = paramConfig.optimal ?? 0;
          paramConfig.range = paramConfig.range ?? 1;
          delete paramConfig.max;
        } else {
          paramConfig.max = paramConfig.max ?? 10;
          delete paramConfig.optimal;
          delete paramConfig.range;
        }
      } else if (field === 'optimal') {
        paramConfig.optimal = convertForStorage(value, paramName);
      } else if (field === 'range') {
        paramConfig.range = parseFloat(value);
      } else if (field === 'max') {
        paramConfig.max = convertForStorage(value, paramName);
      }

      const updatedSettings = updateActivityParameter(selectedActivity, paramName, paramConfig);
      setSettings(updatedSettings);
    } catch (err) {
      setError('Failed to update parameter');
      console.error(err);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await saveSettings(settings);
      if (onSave) onSave(settings);
    } catch (err) {
      setError('Failed to save settings');
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset functionality removed

  const handleAddActivity = () => {
    const name = newActivity.trim();
    if (!name) {
      setError('Please enter an activity name');
      return;
    }
    if (activityList.includes(name)) {
      setError('Activity already exists');
      return;
    }
    try {
      // Use settings shape directly: ensure activityParams exists and add empty object
      const updatedSettings = { ...settings };
      updatedSettings.activityParams = { ...(updatedSettings.activityParams || {}) };
      updatedSettings.activityParams[name] = {};
      // maintain activity order
      const updatedList = [...activityList, name];
      setActivityList(updatedList);
      setSettings(updatedSettings);
      setNewActivity('');
      setSelectedActivity(name);
    } catch (err) {
      setError('Failed to add activity');
      console.error(err);
    }
  };

  const handleRemoveActivity = (name) => {
    try {
      const updatedSettings = { ...settings };
      const params = { ...(updatedSettings.activityParams || {}) };
      delete params[name];
      updatedSettings.activityParams = params;
      const updatedList = activityList.filter(a => a !== name);
      setActivityList(updatedList);
      setSettings(updatedSettings);
      if (selectedActivity === name) {
        setSelectedActivity(updatedList[0] || '');
      }
    } catch (err) {
      setError('Failed to remove activity');
      console.error(err);
    }
  };

  const handleDragStart = (index) => {
    setIsDragging(true);
    setDragItem(index);
  };

  const handleDragOver = (index) => {
    if (!isDragging || dragItem === null || dragItem === index) return;
    const updated = [...activityList];
    const [moved] = updated.splice(dragItem, 1);
    updated.splice(index, 0, moved);
    setDragItem(index);
    setActivityList(updated);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragItem(null);
    try {
      const updatedSettings = reorderActivities(settings, activityList);
      setSettings(updatedSettings);
    } catch (err) {
      console.error('Failed to reorder activities', err);
    }
  };

  if (!settings) {
    return null;
  }

  const activityParameters = getActivityParameters();
  const allParameters = activityParameters;

  return (
    <div className="customization-modal fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay: semi-transparent + blur */}
      <div className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md" aria-hidden="true" />
      <div className="relative z-10 bg-white dark:bg-gray-900 rounded shadow-lg w-11/12 max-w-4xl p-4 text-gray-900 dark:text-gray-100">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Settings className="text-blue-600 dark:text-blue-400" />
            <span>Customization</span>
          </h2>
          <div className="flex items-center gap-2">
            <button onClick={handleSave} disabled={isSaving} title="Save" className="btn bg-transparent hover:bg-gray-100 text-white dark:hover:bg-gray-700">
              <Save className="text-gray-700 dark:text-gray-200" />
            </button>
            <button onClick={() => onClose && onClose()} title="Close" className="btn bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800">
              <X className="text-gray-700 dark:text-gray-200" />
            </button>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="w-1/3 border-r pr-4 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <input className="input px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100" value={newActivity} onChange={e => setNewActivity(e.target.value)} placeholder="New activity name" />
              <button onClick={handleAddActivity} className="btn px-3 py-2 bg-white dark:bg-gray-800 border dark:border-gray-700"><Plus /></button>
            </div>

            <div className="activity-tabs overflow-auto max-h-96">
              {activityList.map((activity, idx) => (
                <div key={activity}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => { e.preventDefault(); handleDragOver(idx); }}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center justify-between p-2 rounded cursor-pointer ${selectedActivity === activity ? 'bg-gray-100 dark:bg-gray-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                  onClick={() => setSelectedActivity(activity)}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="text-gray-600 dark:text-gray-300" />
                    <span className="text-gray-800 dark:text-gray-100">{activity}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 dark:text-gray-300">{Object.keys(getActivityParameters(activity)).length}</span>
                    <button onClick={(e) => { e.stopPropagation(); handleRemoveActivity(activity); }} className="btn bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800"><Trash2 className="text-red-600 dark:text-red-400" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-2/3 pl-4">
            <h3 className="font-medium mb-2">{selectedActivity}</h3>

            <div className="parameters-list mb-4">
              {Object.keys(allParameters).length === 0 && <div className="text-sm text-gray-500 dark:text-gray-300">No parameters yet</div>}
              {Object.entries(allParameters).map(([paramName, cfg]) => (
                <div key={paramName} className="flex items-center gap-2 p-2 rounded mb-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <div className="w-1/3">
                    <strong className="text-gray-800 dark:text-gray-100">{paramName}</strong>
                  </div>
                  <div className="w-2/3 flex items-start gap-2">
                    <select value={cfg.type || 'normalize'} onChange={(e) => handleParameterChange(paramName, 'type', e.target.value)} className="select px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                      <option value="normalize">normalize</option>
                      <option value="inverse">inverse</option>
                    </select>

                    {cfg.type === 'normalize' && (
                      <>
                        <div class="input-group flex flex-col items-start justify-start">
                          <input className="input w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" type="number" value={convertForDisplay(cfg.optimal ?? 0, paramName)} onChange={e => handleParameterChange(paramName, 'optimal', e.target.value)} />
                          <label class="text-[9px] text-gray-500 text-center w-full">Optimal</label>
                        </div>

                        <div class="input-group flex flex-col items-start justify-start">
                          <input className="input w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" type="number" value={cfg.range ?? 1} onChange={e => handleParameterChange(paramName, 'range', e.target.value)} />
                          <label class="text-[9px] text-gray-500 text-center w-full">Range</label>
                        </div>
                      </>
                    )}

                    {cfg.type === 'inverse' && (
                      <div class="input-group flex flex-col items-start justify-start">
                        <input className="input w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" type="number" value={convertForDisplay(cfg.max ?? 10, paramName)} onChange={e => handleParameterChange(paramName, 'max', e.target.value)} />
                        <label class="text-[9px] text-gray-500 text-center w-full">Max</label>
                      </div>
                    )}

                    <button onClick={() => handleRemoveParameter(paramName)} className="btn bg-transparent ml-auto hover:bg-gray-100 dark:hover:bg-gray-800"><Trash2 className="text-red-600 dark:text-red-400" /></button>
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddParameter} className="add-parameter-form border-t pt-4">
              <h3 className="font-medium mb-2">Add New Parameter:</h3>
              <div className="flex items-start gap-2">
                <SearchableParameterDropdown
                  value={newParameter}
                  onChange={(val) => { setNewParameter(val); setError(null); }}
                  placeholder="Search for a weather parameter..."
                  className="flex-1"
                />
                <select value={newParamType} onChange={e => setNewParamType(e.target.value)} className="select px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="normalize">normalize</option>
                  <option value="inverse">inverse</option>
                </select>
                {newParamType === 'normalize' ? (
                  <>
                    <div class="input-group flex flex-col items-start justify-start">
                      <input className="input w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" type="number" value={newParamOptimal} onChange={e => setNewParamOptimal(e.target.value)} placeholder="optimal" />
                      <label class="text-[9px] text-gray-500 text-center w-full">Optimal</label>
                    </div>
                    <div class="input-group flex flex-col items-start justify-start">
                      <input className="input w-20 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" type="number" value={newParamRange} onChange={e => setNewParamRange(e.target.value)} placeholder="range" />
                      <label class="text-[9px] text-gray-500 text-center w-full">Range</label>
                    </div>
                  </>
                ) : (
                  <div class="input-group flex flex-col items-start justify-start">
                    <input className="input w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent" type="number" value={newParamMax} onChange={e => setNewParamMax(e.target.value)} placeholder="max" />
                    <label class="text-[9px] text-gray-500 text-center w-full">Max</label>
                  </div>
                )}
                <button type="submit" className="btn bg-blue-600 px-3 py-2 hover:bg-blue-700 text-white dark:bg-blue-500 dark:hover:bg-blue-400"><Plus /></button>
              </div>
              {error && <div className="text-red-600 dark:text-red-400 mt-2">{error}</div>}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomizationModal;