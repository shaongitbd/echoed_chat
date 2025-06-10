import React, { useState, useEffect } from 'react';
import { Book, Search, Plus, Tag, Save, Trash, Edit, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { appwriteService } from '../../lib/appwrite';

const MemoryManager = ({ onClose, onMemorySelect, threadId }) => {
  const { user } = useAuth();
  const [memories, setMemories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [availableTags, setAvailableTags] = useState([]);
  const [newMemoryName, setNewMemoryName] = useState('');
  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [newMemoryTags, setNewMemoryTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [showNewMemoryForm, setShowNewMemoryForm] = useState(false);
  const [editingMemory, setEditingMemory] = useState(null);
  
  // Load memories on component mount
  useEffect(() => {
    loadMemories();
  }, [user]);
  
  // Load memories from Appwrite
  const loadMemories = async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Get memories from Appwrite
      const response = await appwriteService.getUserMemories(user.$id);
      setMemories(response.documents);
      
      // Extract all unique tags
      const tags = new Set();
      response.documents.forEach(memory => {
        if (memory.tags && Array.isArray(memory.tags)) {
          memory.tags.forEach(tag => tags.add(tag));
        }
      });
      
      setAvailableTags(Array.from(tags));
    } catch (error) {
      console.error('Error loading memories:', error);
      toast.error('Failed to load memories');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Create a new memory
  const createMemory = async () => {
    if (!newMemoryName.trim() || !newMemoryContent.trim()) {
      toast.error('Please enter a name and content');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const newMemory = {
        userId: user.$id,
        name: newMemoryName.trim(),
        content: newMemoryContent.trim(),
        tags: newMemoryTags,
        threadId: threadId || null,
        createdAt: new Date().toISOString()
      };
      
      // Create memory in Appwrite
      await appwriteService.createMemory(newMemory);
      
      // Reset form
      setNewMemoryName('');
      setNewMemoryContent('');
      setNewMemoryTags([]);
      setShowNewMemoryForm(false);
      
      // Reload memories
      await loadMemories();
      
      toast.success('Memory created successfully');
    } catch (error) {
      console.error('Error creating memory:', error);
      toast.error('Failed to create memory');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Update an existing memory
  const updateMemory = async () => {
    if (!editingMemory || !editingMemory.name.trim() || !editingMemory.content.trim()) {
      toast.error('Please enter a name and content');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Update memory in Appwrite
      await appwriteService.updateMemory(editingMemory.$id, {
        name: editingMemory.name.trim(),
        content: editingMemory.content.trim(),
        tags: editingMemory.tags
      });
      
      // Reset editing state
      setEditingMemory(null);
      
      // Reload memories
      await loadMemories();
      
      toast.success('Memory updated successfully');
    } catch (error) {
      console.error('Error updating memory:', error);
      toast.error('Failed to update memory');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Delete a memory
  const deleteMemory = async (memoryId) => {
    if (!window.confirm('Are you sure you want to delete this memory?')) return;
    
    try {
      setIsLoading(true);
      
      // Delete memory from Appwrite
      await appwriteService.deleteMemory(memoryId);
      
      // Reload memories
      await loadMemories();
      
      toast.success('Memory deleted successfully');
    } catch (error) {
      console.error('Error deleting memory:', error);
      toast.error('Failed to delete memory');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add a tag to a new memory
  const addTagToNewMemory = () => {
    if (!newTag.trim()) return;
    
    const tag = newTag.trim().toLowerCase();
    if (!newMemoryTags.includes(tag)) {
      setNewMemoryTags([...newMemoryTags, tag]);
    }
    
    setNewTag('');
  };
  
  // Remove a tag from a new memory
  const removeTagFromNewMemory = (tag) => {
    setNewMemoryTags(newMemoryTags.filter(t => t !== tag));
  };
  
  // Add a tag to an existing memory
  const addTagToExistingMemory = () => {
    if (!editingMemory || !newTag.trim()) return;
    
    const tag = newTag.trim().toLowerCase();
    if (!editingMemory.tags.includes(tag)) {
      setEditingMemory({
        ...editingMemory,
        tags: [...editingMemory.tags, tag]
      });
    }
    
    setNewTag('');
  };
  
  // Remove a tag from an existing memory
  const removeTagFromExistingMemory = (tag) => {
    if (!editingMemory) return;
    
    setEditingMemory({
      ...editingMemory,
      tags: editingMemory.tags.filter(t => t !== tag)
    });
  };
  
  // Toggle a tag filter
  const toggleTagFilter = (tag) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };
  
  // Filter memories based on search query and selected tags
  const filteredMemories = memories.filter(memory => {
    // Search by name and content
    const matchesSearch = 
      searchQuery === '' || 
      memory.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      memory.content.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter by selected tags
    const matchesTags = 
      selectedTags.length === 0 || 
      selectedTags.every(tag => memory.tags && memory.tags.includes(tag));
    
    return matchesSearch && matchesTags;
  });
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold flex items-center">
            <Book size={20} className="mr-2" />
            Memory Manager
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="grid grid-cols-12 gap-4 h-[calc(90vh-130px)]">
          {/* Sidebar with search and tags */}
          <div className="col-span-4 p-4 border-r overflow-y-auto">
            {/* Search */}
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search memories..."
                className="w-full pl-10 pr-4 py-2 border rounded-md"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            {/* Tags */}
            <div className="mb-4">
              <h4 className="text-sm font-medium text-gray-500 mb-2">Tags</h4>
              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTagFilter(tag)}
                    className={`px-2 py-1 rounded-md text-xs ${
                      selectedTags.includes(tag)
                        ? 'bg-black text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Tag size={10} className="inline mr-1" />
                    {tag}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Create new memory button */}
            <button
              onClick={() => setShowNewMemoryForm(true)}
              className="w-full flex items-center justify-center px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 mb-4"
              disabled={isLoading}
            >
              <Plus size={16} className="mr-2" />
              Create New Memory
            </button>
            
            {/* Memory list */}
            <div className="space-y-2">
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">Loading...</div>
              ) : filteredMemories.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No memories found
                </div>
              ) : (
                filteredMemories.map(memory => (
                  <div
                    key={memory.$id}
                    className={`
                      p-3 rounded-md cursor-pointer
                      ${editingMemory && editingMemory.$id === memory.$id
                        ? 'bg-gray-100 border border-gray-300'
                        : 'hover:bg-gray-50 border border-gray-200'
                      }
                    `}
                    onClick={() => editingMemory ? null : onMemorySelect(memory)}
                  >
                    <div className="font-medium text-sm">{memory.name}</div>
                    <div className="text-xs text-gray-500 mt-1 truncate">
                      {memory.content.substring(0, 60)}
                      {memory.content.length > 60 ? '...' : ''}
                    </div>
                    {memory.tags && memory.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {memory.tags.map(tag => (
                          <span
                            key={tag}
                            className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    
                    {/* Action buttons */}
                    <div className="flex justify-end mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingMemory(memory);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Edit"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMemory(memory.$id);
                        }}
                        className="p-1 text-gray-400 hover:text-red-600 ml-1"
                        title="Delete"
                      >
                        <Trash size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Main content area */}
          <div className="col-span-8 p-4 overflow-y-auto">
            {showNewMemoryForm ? (
              // New memory form
              <div className="bg-gray-50 border rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-medium">Create New Memory</h4>
                  <button
                    onClick={() => setShowNewMemoryForm(false)}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <X size={16} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Memory Name
                    </label>
                    <input
                      type="text"
                      value={newMemoryName}
                      onChange={(e) => setNewMemoryName(e.target.value)}
                      className="w-full p-2 border rounded-md"
                      placeholder="E.g., Project Requirements, Company Information, etc."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Content
                    </label>
                    <textarea
                      value={newMemoryContent}
                      onChange={(e) => setNewMemoryContent(e.target.value)}
                      className="w-full p-2 border rounded-md"
                      rows={8}
                      placeholder="Enter the knowledge or information you want to save..."
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tags
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addTagToNewMemory()}
                        className="flex-1 p-2 border rounded-l-md"
                        placeholder="Add tags..."
                      />
                      <button
                        onClick={addTagToNewMemory}
                        className="px-3 py-2 bg-gray-200 rounded-r-md"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    
                    {newMemoryTags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {newMemoryTags.map(tag => (
                          <div
                            key={tag}
                            className="px-2 py-1 bg-gray-100 rounded-md text-sm flex items-center"
                          >
                            {tag}
                            <button
                              onClick={() => removeTagFromNewMemory(tag)}
                              className="ml-1 text-gray-500 hover:text-gray-700"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowNewMemoryForm(false)}
                      className="px-4 py-2 border rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={createMemory}
                      className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 flex items-center"
                      disabled={isLoading}
                    >
                      <Save size={16} className="mr-2" />
                      Save Memory
                    </button>
                  </div>
                </div>
              </div>
            ) : editingMemory ? (
              // Edit memory form
              <div className="bg-gray-50 border rounded-lg p-4">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="text-lg font-medium">Edit Memory</h4>
                  <button
                    onClick={() => setEditingMemory(null)}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <X size={16} />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Memory Name
                    </label>
                    <input
                      type="text"
                      value={editingMemory.name}
                      onChange={(e) => setEditingMemory({...editingMemory, name: e.target.value})}
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Content
                    </label>
                    <textarea
                      value={editingMemory.content}
                      onChange={(e) => setEditingMemory({...editingMemory, content: e.target.value})}
                      className="w-full p-2 border rounded-md"
                      rows={8}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tags
                    </label>
                    <div className="flex">
                      <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addTagToExistingMemory()}
                        className="flex-1 p-2 border rounded-l-md"
                        placeholder="Add tags..."
                      />
                      <button
                        onClick={addTagToExistingMemory}
                        className="px-3 py-2 bg-gray-200 rounded-r-md"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                    
                    {editingMemory.tags && editingMemory.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {editingMemory.tags.map(tag => (
                          <div
                            key={tag}
                            className="px-2 py-1 bg-gray-100 rounded-md text-sm flex items-center"
                          >
                            {tag}
                            <button
                              onClick={() => removeTagFromExistingMemory(tag)}
                              className="ml-1 text-gray-500 hover:text-gray-700"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingMemory(null)}
                      className="px-4 py-2 border rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={updateMemory}
                      className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 flex items-center"
                      disabled={isLoading}
                    >
                      <Save size={16} className="mr-2" />
                      Update Memory
                    </button>
                  </div>
                </div>
              </div>
            ) : filteredMemories.length > 0 ? (
              // Memory details view
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Book size={48} className="mx-auto text-gray-300 mb-4" />
                  <p>Select a memory from the list</p>
                  <p className="text-sm mt-2">or create a new one</p>
                </div>
              </div>
            ) : (
              // Empty state
              <div className="h-full flex items-center justify-center text-gray-500">
                <div className="text-center">
                  <Book size={48} className="mx-auto text-gray-300 mb-4" />
                  <p>No memories found</p>
                  <p className="text-sm mt-2">Create your first memory to get started</p>
                  <button
                    onClick={() => setShowNewMemoryForm(true)}
                    className="mt-4 px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800 inline-flex items-center"
                  >
                    <Plus size={16} className="mr-2" />
                    Create Memory
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemoryManager; 