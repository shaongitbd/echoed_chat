import React, { useRef, useState } from 'react';
import { Paperclip, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const FileUploadButton = ({ onUpload, disabled, maxSize = 10 }) => {
  const fileInputRef = useRef(null);
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Define allowed file types
  const allowedFileTypes = {
    'image': ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
    'document': ['text/plain', 'application/pdf', 'application/json', 'text/markdown', 'text/csv'],
    'code': ['text/javascript', 'text/html', 'text/css', 'application/xml', 'text/x-python']
  };
  
  // All allowed mime types in a flat array
  const allowedMimeTypes = Object.values(allowedFileTypes).flat();
  
  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const validFiles = Array.from(files).filter(file => {
        // Check file size (in MB)
        if (file.size > maxSize * 1024 * 1024) {
          toast.error(`File ${file.name} exceeds the ${maxSize}MB limit`);
          return false;
        }
        
        // Check file type
        if (!allowedMimeTypes.includes(file.type)) {
          toast.error(`File type not supported: ${file.type}`);
          return false;
        }
        
        return true;
      });
      
      if (validFiles.length > 0) {
        onUpload(validFiles);
      }
      
      // Reset the input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  // Get file type description for accept attribute
  const getAcceptString = () => {
    return Object.entries(allowedFileTypes)
      .map(([_, types]) => types.join(','))
      .join(',');
  };
  
  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={disabled}
        className="p-2 rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Upload file"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <Paperclip size={20} />
      </button>
      
      {/* Tooltip for supported file types */}
      {showTooltip && (
        <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 w-64 p-2 bg-black text-white text-xs rounded shadow-lg z-10">
          <div className="flex items-start mb-1">
            <AlertCircle size={12} className="mr-1 mt-0.5 flex-shrink-0" />
            <span>Supported file types ({maxSize}MB max):</span>
          </div>
          <ul className="space-y-1 mt-1">
            <li className="flex items-center">
              <span className="font-semibold mr-1">Images:</span> 
              <span className="text-gray-300">JPEG, PNG, GIF, WebP, SVG</span>
            </li>
            <li className="flex items-center">
              <span className="font-semibold mr-1">Documents:</span> 
              <span className="text-gray-300">PDF, TXT, JSON, MD, CSV</span>
            </li>
            <li className="flex items-center">
              <span className="font-semibold mr-1">Code:</span> 
              <span className="text-gray-300">JS, HTML, CSS, XML, Python</span>
            </li>
          </ul>
        </div>
      )}
      
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        accept={getAcceptString()}
        className="hidden"
      />
    </div>
  );
};

export default FileUploadButton; 