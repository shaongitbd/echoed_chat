import React from 'react';

const ThinkingPanel = ({ content }) => {
  return (
    <div className="thinking-panel">
      <span className="typing-animation">{content}</span>
    </div>
  );
};

export default ThinkingPanel; 