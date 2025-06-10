import React, { useState } from 'react';
import { Edit, Trash, Save, X, MessageSquare } from 'lucide-react';
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

const Annotation = ({ annotation, onDelete, onUpdate }) => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(annotation.text);
  const [editedColor, setEditedColor] = useState(annotation.color);
  const isOwner = user && user.$id === annotation.userId;
  
  const handleSave = async () => {
    if (!editedText.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }
    
    try {
      const updatedAnnotation = await appwriteService.updateAnnotation(annotation.$id, {
        text: editedText.trim(),
        color: editedColor
      });
      
      setIsEditing(false);
      onUpdate(updatedAnnotation);
      toast.success('Comment updated');
    } catch (error) {
      console.error('Error updating annotation:', error);
      toast.error('Failed to update comment');
    }
  };
  
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }
    
    try {
      await appwriteService.deleteAnnotation(annotation.$id);
      onDelete(annotation.$id);
      toast.success('Comment deleted');
    } catch (error) {
      console.error('Error deleting annotation:', error);
      toast.error('Failed to delete comment');
    }
  };
  
  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric'
    }).format(date);
  };
  
  if (isEditing) {
    return (
      <div className="bg-gray-50 border rounded-md p-3 mb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div className="font-medium text-sm">{annotation.userName}</div>
            <div className="text-xs text-gray-500 ml-2">
              {formatTimestamp(annotation.createdAt)}
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsEditing(false)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Cancel"
            >
              <X size={14} />
            </button>
            <button
              onClick={handleSave}
              className="p-1 text-gray-400 hover:text-green-600"
              title="Save"
            >
              <Save size={14} />
            </button>
          </div>
        </div>
        
        <textarea
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          className="w-full p-2 border rounded-md text-sm mb-2"
          rows={3}
          placeholder="Add your comment..."
        />
        
        <div className="flex items-center">
          <div className="text-xs font-medium mr-2">Highlight color:</div>
          <div className="flex space-x-1">
            {COLORS.map(color => (
              <button
                key={color.value}
                onClick={() => setEditedColor(color.value)}
                className={`w-5 h-5 rounded-full ${editedColor === color.value ? 'ring-2 ring-black' : ''}`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div 
      className="border-l-4 rounded-md p-3 mb-2"
      style={{ borderLeftColor: annotation.color, backgroundColor: `${annotation.color}20` }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center">
          <div className="font-medium text-sm">{annotation.userName}</div>
          <div className="text-xs text-gray-500 ml-2">
            {formatTimestamp(annotation.createdAt)}
          </div>
        </div>
        {isOwner && (
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Edit"
            >
              <Edit size={14} />
            </button>
            <button
              onClick={handleDelete}
              className="p-1 text-gray-400 hover:text-red-600"
              title="Delete"
            >
              <Trash size={14} />
            </button>
          </div>
        )}
      </div>
      
      <div className="text-sm whitespace-pre-wrap">{annotation.text}</div>
      
      <div className="text-xs text-gray-500 mt-1">
        <span className="inline-flex items-center">
          <MessageSquare size={10} className="mr-1" />
          On: "{annotation.content.length > 50 
            ? annotation.content.substring(0, 50) + '...' 
            : annotation.content}"
        </span>
      </div>
    </div>
  );
};

export default Annotation; 