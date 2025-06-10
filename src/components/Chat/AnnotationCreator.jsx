import React, { useState } from 'react';
import { X, MessageSquare, Save } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { appwriteService } from '../../lib/appwrite';
import { toast } from 'sonner';

const COLORS = [
  { value: '#FFEB3B', name: 'Yellow' },
  { value: '#4CAF50', name: 'Green' },
  { value: '#2196F3', name: 'Blue' },
  { value: '#F44336', name: 'Red' },
  { value: '#9C27B0', name: 'Purple' }
];

const AnnotationCreator = ({ 
  selectedText, 
  messageId, 
  threadId, 
  startOffset, 
  endOffset, 
  onClose,
  onSave 
}) => {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [color, setColor] = useState(COLORS[0].value);
  const [isLoading, setIsLoading] = useState(false);
  
  const handleSave = async () => {
    if (!text.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const newAnnotation = await appwriteService.createAnnotation({
        messageId,
        threadId,
        userId: user.$id,
        userName: user.name || 'User',
        text: text.trim(),
        content: selectedText,
        startOffset,
        endOffset,
        color
      });
      
      setText('');
      setColor(COLORS[0].value);
      onSave(newAnnotation);
      onClose();
      
      toast.success('Comment added');
    } catch (error) {
      console.error('Error creating annotation:', error);
      toast.error('Failed to add comment');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="bg-white border shadow-md rounded-md p-3 max-w-md">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-medium flex items-center">
          <MessageSquare size={14} className="mr-1" />
          Add Comment
        </h3>
        <button
          onClick={onClose}
          className="p-1 text-gray-400 hover:text-gray-600"
          title="Close"
        >
          <X size={14} />
        </button>
      </div>
      
      {selectedText && (
        <div className="bg-gray-50 p-2 rounded-md text-xs text-gray-700 mb-2 border-l-4 border-gray-300">
          "{selectedText}"
        </div>
      )}
      
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full p-2 border rounded-md text-sm mb-2"
        rows={3}
        placeholder="Add your comment..."
        disabled={isLoading}
        autoFocus
      />
      
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="text-xs font-medium mr-2">Highlight color:</div>
          <div className="flex space-x-1">
            {COLORS.map(colorOption => (
              <button
                key={colorOption.value}
                onClick={() => setColor(colorOption.value)}
                className={`w-5 h-5 rounded-full ${color === colorOption.value ? 'ring-2 ring-black' : ''}`}
                style={{ backgroundColor: colorOption.value }}
                title={colorOption.name}
                disabled={isLoading}
              />
            ))}
          </div>
        </div>
        
        <button
          onClick={handleSave}
          className="px-3 py-1 bg-black text-white rounded-md text-xs flex items-center"
          disabled={isLoading || !text.trim()}
        >
          <Save size={12} className="mr-1" />
          {isLoading ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
};

export default AnnotationCreator; 