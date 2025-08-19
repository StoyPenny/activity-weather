import { useState, useRef, useEffect } from 'react';
import { getValidWeatherParameters } from '../lib/settings';

const SearchableParameterDropdown = ({ 
  value, 
  onChange, 
  placeholder = "Search for a weather parameter...",
  className = ""
}) => {
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Get all valid weather parameters
  const allParameters = getValidWeatherParameters();

  // Filter parameters based on search term
  const filteredParameters = allParameters.filter(param => 
    param.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Handle input change
  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setSearchTerm(newValue);
    onChange(newValue);
    
    // Open dropdown when user types
    if (newValue && !isOpen) {
      setIsOpen(true);
    }
  };

  // Handle parameter selection
  const handleParameterSelect = (param) => {
    setSearchTerm(param);
    onChange(param);
    setIsOpen(false);
    setHighlightedIndex(-1);
    
    // Focus back to input
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredParameters.length - 1 ? prev + 1 : prev
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
        
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < filteredParameters.length) {
          handleParameterSelect(filteredParameters[highlightedIndex]);
        }
        break;
        
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        break;
        
      default:
        break;
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {searchTerm && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              onChange('');
              if (inputRef.current) {
                inputRef.current.focus();
              }
            }}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {isOpen && filteredParameters.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 max-h-60 overflow-auto">
          <ul className="py-1">
            {filteredParameters.map((param, index) => (
              <li
                key={param}
                onClick={() => handleParameterSelect(param)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={`px-3 py-2 cursor-pointer ${
                  highlightedIndex === index
                    ? 'bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100'
                    : 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {param}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isOpen && searchTerm && filteredParameters.length === 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 shadow-lg rounded-md border border-gray-200 dark:border-gray-700 py-2 px-3 text-gray-500 dark:text-gray-400">
          No parameters found
        </div>
      )}
    </div>
  );
};

export default SearchableParameterDropdown;