import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { Edit, Trash, Copy, Check, ChevronDown, ChevronUp, ExternalLink, MessageSquare, RefreshCw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { nord } from 'react-syntax-highlighter/dist/esm/styles/prism';
import ThinkingPanel from './ThinkingPanel';
import AnnotationsContainer from './AnnotationsContainer';
import AnnotationCreator from './AnnotationCreator';

const MessageItem = ({
  message,
  onEdit,
  onDelete,
  toggleInContext,
  isInContext,
  showThinking
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  const [showDetails, setShowDetails] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectionRange, setSelectionRange] = useState(null);
  const [showAnnotationCreator, setShowAnnotationCreator] = useState(false);
  const [annotationPosition, setAnnotationPosition] = useState({ x: 0, y: 0 });
  const messageContentRef = useRef(null);
  const [showActionButtons, setShowActionButtons] = useState(false);
  
  // Format timestamp
  const formattedTime = message.createdAt
    ? format(new Date(message.createdAt), 'MMM d, h:mm a')
    : '';
  
  // Determine message type
  const isUser = message.sender === 'user';
  const isAssistant = message.sender === 'assistant';
  
  // Handle edit submission
  const handleSubmitEdit = () => {
    if (editedContent.trim() !== message.content) {
      onEdit(message.$id, editedContent);
    }
    setIsEditing(false);
  };
  
  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditedContent(message.content);
    setIsEditing(false);
  };
  
  // Handle copy message
  const handleCopyMessage = () => {
    navigator.clipboard.writeText(message.content);
  };
  
  // Handle text selection
  const handleTextSelection = () => {
    const selection = window.getSelection();
    
    if (selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const text = selection.toString().trim();
      
      // Only show annotation creator if text is selected within this message
      if (text.length > 0 && messageContentRef.current && messageContentRef.current.contains(range.commonAncestorContainer)) {
        setSelectedText(text);
        
        // Calculate selection offsets relative to the message content
        const messageContent = message.content;
        const selectionStart = Math.max(0, messageContent.indexOf(text));
        const selectionEnd = selectionStart + text.length;
        
        setSelectionRange({
          startOffset: selectionStart,
          endOffset: selectionEnd
        });
        
        // Position the annotation creator near the selection
        const rect = range.getBoundingClientRect();
        setAnnotationPosition({
          x: rect.left + (rect.width / 2),
          y: rect.bottom + 10
        });
        
        setShowAnnotationCreator(true);
      }
    }
  };
  
  // Handle saving a new annotation
  const handleSaveAnnotation = (newAnnotation) => {
    // Annotation saved via the AnnotationCreator component
    // No need to do anything here as the real-time updates will handle it
  };
  
  // Render code blocks with syntax highlighting
  const renderCodeBlock = ({ node, inline, className, children, ...props }) => {
    const match = /language-(\w+)/.exec(className || '');
    const language = match ? match[1] : '';
    
    if (!inline && language) {
      return (
        <div className="syntax-highlighter">
          <div className="flex justify-between items-center bg-gray-800 text-white px-4 py-1 rounded-t-md">
            <span className="text-xs">{language}</span>
            <button
              onClick={() => navigator.clipboard.writeText(String(children).replace(/\n$/, ''))}
              className="p-1 hover:bg-gray-700 rounded"
              title="Copy code"
            >
              <Copy size={14} />
            </button>
          </div>
          <SyntaxHighlighter
            style={nord}
            language={language}
            PreTag="div"
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        </div>
      );
    }
    
    return inline ? (
      <code className="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono" {...props}>
        {children}
      </code>
    ) : (
      <SyntaxHighlighter
        style={nord}
        language="text"
        PreTag="div"
        className="syntax-highlighter"
        {...props}
      >
        {String(children).replace(/\n$/, '')}
      </SyntaxHighlighter>
    );
  };
  
  // Render message content
  const renderContent = () => {
    if (isEditing) {
      return (
        <div className="mt-2">
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="w-full p-2 border rounded-md"
            rows={Math.max(3, editedContent.split('\n').length)}
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={handleSubmitEdit}
              className="px-3 py-1 bg-black text-white text-sm rounded-md"
            >
              Save
            </button>
            <button
              onClick={handleCancelEdit}
              className="px-3 py-1 bg-gray-200 text-gray-800 text-sm rounded-md"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }
    
    // Handle different content types
    if (message.contentType === 'image') {
      return (
        <div className="message-content">
          <div className="my-2">
            <img 
              src={message.content} 
              alt="AI generated image" 
              className="rounded-lg max-w-full max-h-96 object-contain"
            />
          </div>
          {message.imagePrompt && (
            <div className="mt-2 text-sm text-gray-500 border-t pt-2">
              <div className="font-medium">Image prompt:</div>
              <div>{message.imagePrompt}</div>
            </div>
          )}
        </div>
      );
    }
    
    if (message.contentType === 'video') {
      return (
        <div className="message-content">
          <div className="my-2">
            <video
              src={message.content}
              controls
              className="rounded-lg max-w-full max-h-96"
            >
              Your browser does not support the video tag.
            </video>
          </div>
          {message.videoPrompt && (
            <div className="mt-2 text-sm text-gray-500 border-t pt-2">
              <div className="font-medium">Video prompt:</div>
              <div>{message.videoPrompt}</div>
            </div>
          )}
        </div>
      );
    }
    
    // Default text content
    return (
      <div 
        className="message-content relative"
        ref={messageContentRef}
        onMouseEnter={() => setShowActionButtons(true)}
        onMouseLeave={() => setShowActionButtons(false)}
      >
        <ReactMarkdown
          components={{
            code: renderCodeBlock,
            a: ({ node, ...props }) => (
              <a 
                {...props} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              />
            )
          }}
        >
          {message.content}
        </ReactMarkdown>
        
        {/* AI message hover actions - only show for assistant messages */}
        {isAssistant && showActionButtons && (
          <div className="absolute bottom-[-32px] right-0 flex items-center gap-2 bg-white shadow-sm p-1 rounded-md border z-10 transition-opacity duration-150">
            <button
              onClick={handleCopyMessage}
              className="p-1 text-gray-600 hover:bg-gray-100 rounded"
              title="Copy text"
            >
              <Copy size={16} />
            </button>
          </div>
        )}
        
        {/* Show search results sources if available */}
        {message.searchMetadata && message.searchMetadata.sources && message.searchMetadata.sources.length > 0 && (
          <div className="mt-2 pt-2 border-t text-sm text-gray-500">
            <div className="font-medium mb-1">Sources:</div>
            <ul className="space-y-1">
              {message.searchMetadata.sources.map((source, index) => (
                <li key={index} className="flex items-start">
                  <span className="mr-1">[{index + 1}]</span>
                  <a 
                    href={source.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center"
                  >
                    {source.title || source.url}
                    <ExternalLink size={12} className="ml-1" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };
  
  // Render message details
  const renderDetails = () => {
    if (!showDetails) return null;
    
    return (
      <div className="mt-2 pt-2 border-t text-xs text-gray-500 space-y-1">
        <div>
          <span className="font-medium">Model:</span> {message.provider}/{message.model}
        </div>
        {message.contextLength && (
          <div>
            <span className="font-medium">Context length:</span> {message.contextLength} chars
          </div>
        )}
        {message.tokensUsed && (
          <div>
            <span className="font-medium">Tokens used:</span> {message.tokensUsed}
          </div>
        )}
        {message.isEdited && (
          <div>
            <span className="font-medium">Edited</span>
          </div>
        )}
      </div>
    );
  };
  
  // Set up text selection handlers
  useEffect(() => {
    const handleDocumentClick = (e) => {
      // Close annotation creator when clicking outside
      if (showAnnotationCreator && !e.target.closest('.annotation-creator')) {
        setShowAnnotationCreator(false);
        setSelectedText('');
      }
    };
    
    document.addEventListener('click', handleDocumentClick);
    document.addEventListener('mouseup', handleTextSelection);
    
    return () => {
      document.removeEventListener('click', handleDocumentClick);
      document.removeEventListener('mouseup', handleTextSelection);
    };
  }, [showAnnotationCreator]);
  
  return (
    <div className={`p-4 ${isUser ? 'user-message' : 'assistant-message'} rounded-lg mb-4`}>
      <div className="flex justify-between items-start">
        <div className="font-medium">
          {isUser ? 'You' : 'Assistant'}
        </div>
        <div className="flex items-center gap-1">
          {/* Time and edit indicators */}
          <span className="text-xs text-gray-500">
            {formattedTime}
            {message.isEdited && (
              <span className="ml-1">(edited)</span>
            )}
          </span>
          
          {/* Include in context toggle */}
          <button
            onClick={() => toggleInContext(message.$id)}
            className={`p-1 rounded-full ${isInContext ? 'bg-green-100 text-green-600' : 'text-gray-400 hover:text-gray-600'}`}
            title={isInContext ? 'Remove from context' : 'Add to context'}
          >
            <Check size={14} />
          </button>
          
          {/* Copy button */}
          <button
            onClick={handleCopyMessage}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="Copy message"
          >
            <Copy size={14} />
          </button>
          
          {/* Edit button - only for user messages */}
          {isUser && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Edit message"
            >
              <Edit size={14} />
            </button>
          )}
          
          {/* Delete button */}
          <button
            onClick={() => onDelete(message.$id)}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="Delete message"
          >
            <Trash size={14} />
          </button>
          
          {/* Details toggle */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-1 text-gray-400 hover:text-gray-600"
            title={showDetails ? 'Hide details' : 'Show details'}
          >
            {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>
      
      {/* Message content */}
      {renderContent()}
      
      {/* Thinking panel */}
      {showThinking && <ThinkingPanel content="Thinking..." />}
      
      {/* Message details */}
      {renderDetails()}
      
      {/* Annotations container */}
      {!isEditing && (
        <AnnotationsContainer
          messageId={message.$id}
          threadId={message.threadId}
        />
      )}
      
      {/* Annotation creator */}
      {showAnnotationCreator && selectedText && (
        <div 
          className="fixed z-50 annotation-creator"
          style={{
            left: `${annotationPosition.x}px`,
            top: `${annotationPosition.y}px`,
            transform: 'translateX(-50%)'
          }}
        >
          <AnnotationCreator
            selectedText={selectedText}
            messageId={message.$id}
            threadId={message.threadId}
            startOffset={selectionRange?.startOffset}
            endOffset={selectionRange?.endOffset}
            onClose={() => setShowAnnotationCreator(false)}
            onSave={handleSaveAnnotation}
          />
        </div>
      )}
    </div>
  );
};

export default MessageItem; 