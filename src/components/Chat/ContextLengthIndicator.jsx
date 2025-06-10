import React from 'react';

const ContextLengthIndicator = ({ contextLength, maxLength }) => {
  // Calculate percentage of context used
  const percentage = Math.min((contextLength / maxLength) * 100, 100);
  
  // Determine status based on percentage
  const getStatusClass = () => {
    if (percentage >= 90) return 'context-length-danger';
    if (percentage >= 75) return 'context-length-warning';
    return '';
  };
  
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>Context length</span>
        <span>{contextLength} / {maxLength} ({Math.round(percentage)}%)</span>
      </div>
      <div className={`context-length-indicator ${getStatusClass()}`}>
        <div 
          className="context-length-bar"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default ContextLengthIndicator; 