import { useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Card } from './ui/card';

const DaySelector = ({
  availableDates = [],
  selectedDate,
  onDateChange,
  className = ""
}) => {
  const dateInputRef = useRef(null);

  // Find current selected date index
  const selectedIndex = availableDates.findIndex(date => 
    date.toDateString() === selectedDate?.toDateString()
  );

  // Navigation handlers
  const handlePrevious = () => {
    if (selectedIndex > 0) {
      onDateChange(availableDates[selectedIndex - 1]);
    }
  };

  const handleNext = () => {
    if (selectedIndex < availableDates.length - 1) {
      onDateChange(availableDates[selectedIndex + 1]);
    }
  };

  // Date picker handler
  const handleDatePickerChange = (event) => {
    const selectedDateStr = event.target.value;
    const selectedDateObj = new Date(selectedDateStr + 'T00:00:00');
    
    // Find the closest available date
    const availableDate = availableDates.find(date =>
      date.toDateString() === selectedDateObj.toDateString()
    );
    
    if (availableDate) {
      onDateChange(availableDate);
    }
  };

  // Handle clicking on the styled overlay to open date picker
  const handleDatePickerClick = () => {
    if (dateInputRef.current) {
      dateInputRef.current.showPicker();
    }
  };

  // Format date for display
  const formatDisplayDate = (date) => {
    if (!date) return '';
    
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString([], { 
        
        // month: 'short', 
        // day: 'numeric',
        weekday: 'short'
      });
    }
  };

  // Format date for input value (YYYY-MM-DD)
  const formatInputDate = (date) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  // Get min and max dates for date picker
  const minDate = availableDates.length > 0 ? formatInputDate(availableDates[0]) : '';
  const maxDate = availableDates.length > 0 ? formatInputDate(availableDates[availableDates.length - 1]) : '';

  if (availableDates.length === 0) {
    return (
      <Card className={`p-4 ${className}`}>
        <div className="text-center text-gray-500 dark:text-gray-400">
          No forecast data available
        </div>
      </Card>
    );
  }

  return (
    <Card className={`p-4 max-w-4xl mx-auto ${className}`}>
      <div className="flex items-center justify-between">
        {/* Previous Day Button */}
        <button
          onClick={handlePrevious}
          disabled={selectedIndex <= 0}
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Previous day"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>

        {/* Date Display and Picker */}
        <div className="flex-1 mx-4">
          <div className="relative">
            {/* Hidden native date input */}
            <input
              ref={dateInputRef}
              type="date"
              value={formatInputDate(selectedDate)}
              onChange={handleDatePickerChange}
              min={minDate}
              max={maxDate}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            {/* Styled overlay that looks like the original button */}
            <div
              onClick={handleDatePickerClick}
              className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="font-medium text-gray-900 dark:text-white">
                {formatDisplayDate(selectedDate)}
              </span>
              {selectedDate && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedDate.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Next Day Button */}
        <button
          onClick={handleNext}
          disabled={selectedIndex >= availableDates.length - 1}
          className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Next day"
        >
          <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
      </div>

      {/* Date Range Indicator */}
      {availableDates.length > 1 && (
        <div className="mt-3 flex justify-center md:hidden">
          <div className="flex items-center gap-1">
            {availableDates.map((date, index) => (
              <button
                key={index}
                onClick={() => onDateChange(date)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === selectedIndex
                    ? 'bg-blue-500'
                    : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                }`}
                title={formatDisplayDate(date)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Quick Navigation Buttons */}
      <div className="mt-4 flex gap-2 justify-center">
        {availableDates.map((date, index) => {
          const isSelected = index === selectedIndex;
          const isToday = date.toDateString() === new Date().toDateString();
          
          return (
            <button
              key={index}
              onClick={() => onDateChange(date)}
              className={`px-3 py-1 text-xs rounded-md transition-colors hidden md:flex ${
                isSelected
                  ? 'bg-blue-500 text-white'
                  : isToday
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {formatDisplayDate(date)}
            </button>
          );
        })}
        {/* {availableDates.length > 10 && (
          <span className="px-2 py-1 text-xs text-gray-400 dark:text-gray-500">
            +{availableDates.length - 10} more
          </span>
        )} */}
      </div>
    </Card>
  );
};

export default DaySelector;