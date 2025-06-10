import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { useChat } from '../../contexts/ChatContext';

// Generate a random color for each user
const getColorForUser = (userId) => {
  // Use a hash function to generate a consistent color for each user ID
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Convert the hash to a hex color
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).substr(-2);
  }
  
  return color;
};

const CollaboratorIndicator = () => {
  const { activeCollaborators, userCursors } = useChat();
  const [showCollaborators, setShowCollaborators] = useState(false);
  
  // Format the time since a user was last active
  const formatTimeSince = (timestamp) => {
    const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 120) return '1 minute ago';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 7200) return '1 hour ago';
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    
    return 'a while ago';
  };
  
  const collaboratorCount = Object.keys(activeCollaborators).length;
  
  if (collaboratorCount === 0) return null;
  
  return (
    <div className="relative">
      <button
        className="flex items-center space-x-1 p-2 rounded-full bg-gray-100 hover:bg-gray-200"
        onClick={() => setShowCollaborators(!showCollaborators)}
        title="Active collaborators"
      >
        <Users size={18} />
        <span className="text-xs font-medium">{collaboratorCount}</span>
      </button>
      
      {showCollaborators && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-md shadow-lg border p-3 z-50">
          <div className="text-sm font-medium mb-2">Active collaborators</div>
          <div className="space-y-2">
            {Object.values(activeCollaborators).map(collaborator => {
              const userColor = getColorForUser(collaborator.userId);
              
              return (
                <div 
                  key={collaborator.userId} 
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: userColor }}
                    />
                    <span className="text-sm">{collaborator.userName}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatTimeSince(collaborator.lastActive)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Render cursor indicators for all active users */}
      {Object.entries(userCursors).map(([userId, position]) => {
        if (!position || !activeCollaborators[userId]) return null;
        
        const userColor = getColorForUser(userId);
        const userName = activeCollaborators[userId].userName;
        
        return (
          <div
            key={userId}
            className="fixed pointer-events-none z-50 transition-all duration-200"
            style={{
              left: `${position.x}px`,
              top: `${position.y}px`
            }}
          >
            <div className="relative">
              <div 
                className="absolute w-5 h-5 transform -translate-x-1/2 -translate-y-1/2 cursor-position"
                style={{ borderLeft: `10px solid ${userColor}`, borderTop: '10px solid transparent', borderBottom: '10px solid transparent' }}
              />
              <div 
                className="absolute top-0 left-4 bg-black text-white text-xs py-1 px-2 rounded whitespace-nowrap"
                style={{ backgroundColor: userColor }}
              >
                {userName}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CollaboratorIndicator; 