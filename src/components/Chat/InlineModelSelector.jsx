import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const InlineModelSelector = ({ currentProvider, currentModel, onSelect, models = [] }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Get current model display name
  const getCurrentModelDisplay = () => {
    const current = models.find(
      m => m.provider.toLowerCase() === currentProvider.toLowerCase() && m.id === currentModel
    );
    
    if (current) {
      return `${current.name}`;
    }
    
    return 'Select Model';
  };
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-full text-sm font-medium transition-colors border border-gray-200"
      >
        <span className="max-w-[100px] truncate">{getCurrentModelDisplay()}</span>
        <ChevronDown size={14} />
      </button>
      
      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 bg-white rounded-lg shadow-xl border w-64 max-h-80 overflow-y-auto z-50">
          <div className="p-2">
            <div className="mb-2 px-2 py-1 text-xs font-medium text-gray-500 uppercase">
              Select Model
            </div>
            {models.length === 0 ? (
              <div className="text-sm text-gray-500 p-2">No available models</div>
            ) : (
              models.map((item, index) => (
                <button
                  type="button"
                  key={index}
                  onClick={() => {
                    onSelect(item.provider, item.id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md flex items-center justify-between transition-colors ${
                    currentProvider.toLowerCase() === item.provider.toLowerCase() && currentModel === item.id
                      ? 'bg-blue-500 text-white'
                      : 'hover:bg-gray-100'
                  }`}
                >
                  <div>
                    <div className="text-sm font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.provider}</div>
                  </div>
                  {currentProvider === item.provider && currentModel === item.id && (
                    <Check size={16} />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default InlineModelSelector; 