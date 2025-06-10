import React, { useState, useEffect } from 'react';
import { MessageSquare, ChevronDown, ChevronUp, MessageCircle } from 'lucide-react';
import { appwriteService } from '../../lib/appwrite';
import Annotation from './Annotation';

const AnnotationsContainer = ({ messageId, threadId }) => {
  const [annotations, setAnnotations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Load annotations for the message
  useEffect(() => {
    loadAnnotations();
    
    // Subscribe to real-time updates
    const unsubscribe = appwriteService.subscribeToAnnotations(threadId, (response) => {
      // Handle real-time updates
      if (response.event === 'databases.*.collections.*.documents.*.create') {
        // New annotation created
        const newAnnotation = response.payload;
        if (newAnnotation.messageId === messageId) {
          setAnnotations(prev => [...prev, newAnnotation]);
        }
      } else if (response.event === 'databases.*.collections.*.documents.*.update') {
        // Annotation updated
        const updatedAnnotation = response.payload;
        if (updatedAnnotation.messageId === messageId) {
          setAnnotations(prev => 
            prev.map(annotation => 
              annotation.$id === updatedAnnotation.$id ? updatedAnnotation : annotation
            )
          );
        }
      } else if (response.event === 'databases.*.collections.*.documents.*.delete') {
        // Annotation deleted
        const deletedAnnotationId = response.payload.$id;
        setAnnotations(prev => 
          prev.filter(annotation => annotation.$id !== deletedAnnotationId)
        );
      }
    });
    
    return () => {
      // Clean up subscription
      unsubscribe();
    };
  }, [messageId, threadId]);
  
  const loadAnnotations = async () => {
    try {
      setIsLoading(true);
      const response = await appwriteService.getAnnotationsForMessage(messageId);
      setAnnotations(response.documents);
    } catch (error) {
      console.error('Error loading annotations:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteAnnotation = (annotationId) => {
    setAnnotations(prev => prev.filter(annotation => annotation.$id !== annotationId));
  };
  
  const handleUpdateAnnotation = (updatedAnnotation) => {
    setAnnotations(prev => 
      prev.map(annotation => 
        annotation.$id === updatedAnnotation.$id ? updatedAnnotation : annotation
      )
    );
  };
  
  if (isLoading) {
    return (
      <div className="border-t pt-2 mt-2">
        <div className="text-xs text-gray-500 animate-pulse">Loading comments...</div>
      </div>
    );
  }
  
  if (annotations.length === 0) {
    return null;
  }
  
  return (
    <div className="border-t pt-2 mt-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center text-xs text-gray-500 hover:text-gray-700 mb-2"
      >
        <MessageCircle size={12} className="mr-1" />
        {annotations.length} {annotations.length === 1 ? 'comment' : 'comments'}
        {isExpanded ? (
          <ChevronUp size={12} className="ml-1" />
        ) : (
          <ChevronDown size={12} className="ml-1" />
        )}
      </button>
      
      {isExpanded && (
        <div className="space-y-2">
          {annotations.map(annotation => (
            <Annotation
              key={annotation.$id}
              annotation={annotation}
              onDelete={handleDeleteAnnotation}
              onUpdate={handleUpdateAnnotation}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AnnotationsContainer; 