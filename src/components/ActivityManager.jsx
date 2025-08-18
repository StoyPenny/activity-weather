import { useState, useEffect } from 'react';
import { X, Plus, Trash2, GripVertical } from 'lucide-react';
import { getActivityList, reorderActivities } from '../lib/settings';

const ActivityManager = ({ onClose, onSave }) => {
  const [activities, setActivities] = useState([]);
  const [newActivity, setNewActivity] = useState('');
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragItem, setDragItem] = useState(null);

  useEffect(() => {
    try {
      const activityList = getActivityList();
      setActivities(activityList);
    } catch (err) {
      setError('Failed to load activities');
      console.error(err);
    }
  }, []);

  const handleAddActivity = (e) => {
    e.preventDefault();
    
    if (!newActivity.trim()) {
      setError('Please enter an activity name');
      return;
    }
    
    // Check if activity already exists
    if (activities.includes(newActivity.trim())) {
      setError('Activity already exists');
      return;
    }
    
    try {
      const updatedActivities = [...activities, newActivity.trim()];
      setActivities(updatedActivities);
      setNewActivity('');
      setError(null);
    } catch (err) {
      setError('Failed to add activity');
      console.error(err);
    }
  };

  const handleRemoveActivity = (activityName) => {
    try {
      const updatedActivities = activities.filter(activity => activity !== activityName);
      setActivities(updatedActivities);
      setError(null);
    } catch (err) {
      setError('Failed to remove activity');
      console.error(err);
    }
  };

  const handleDragStart = (e, index) => {
    setIsDragging(true);
    setDragItem(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (dragItem === null) return;
    
    const newActivities = [...activities];
    const draggedItem = newActivities[dragItem];
    
    // Remove the dragged item
    newActivities.splice(dragItem, 1);
    
    // Insert the dragged item at the new position
    newActivities.splice(dropIndex, 0, draggedItem);
    
    setActivities(newActivities);
    setIsDragging(false);
    setDragItem(null);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragItem(null);
  };

  const handleSave = () => {
    try {
      reorderActivities(activities);
      onSave?.(activities);
      onClose();
    } catch (err) {
      setError('Failed to save activities');
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Manage Activities
          </h2>
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

        {/* Add Activity Form */}
        <form onSubmit={handleAddActivity} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={newActivity}
              onChange={(e) => setNewActivity(e.target.value)}
              placeholder="Enter new activity name"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </form>

        {/* Activities List */}
        <div className="mb-6">
          <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">
            Current Activities
          </h3>
          
          {activities.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <p>No activities configured.</p>
              <p className="text-sm mt-2">Add an activity above to get started.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {activities.map((activity, index) => (
                <div
                  key={activity}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-700 rounded-md border border-gray-200 dark:border-gray-600 ${
                    isDragging && dragItem === index ? 'opacity-50' : ''
                  }`}
                >
                  <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                  <span className="flex-1 text-gray-900 dark:text-white">{activity}</span>
                  <button
                    onClick={() => handleRemoveActivity(activity)}
                    className="p-1 text-red-500 hover:text-red-700 dark:hover:text-red-400 rounded-md transition-colors"
                    aria-label={`Remove ${activity}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-200 font-medium rounded-md transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActivityManager;