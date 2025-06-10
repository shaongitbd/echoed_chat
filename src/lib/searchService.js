/**
 * Search Service
 * 
 * Handles web search functionality using the backend Flask API.
 */

/**
 * Performs a web search using the backend API
 * 
 * @param {string} query - Search query
 * @param {number} limit - Maximum number of results to return
 * @returns {Promise<Object>} - Promise with search results
 */
export const performWebSearch = async (query, limit = 5) => {
  try {
    const searchApiEndpoint = process.env.REACT_APP_SEARCH_API_ENDPOINT || 'http://localhost:5000';
    
    const response = await fetch(`${searchApiEndpoint}/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Search API error: ${response.status} ${JSON.stringify(errorData)}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error performing web search:', error);
    throw error;
  }
};

/**
 * Formats search results for inclusion in the prompt
 * 
 * @param {Object} searchResults - Results from performWebSearch
 * @returns {string} - Formatted search results text
 */
export const formatSearchResultsForPrompt = (searchResults) => {
  if (!searchResults || !searchResults.results || !searchResults.results.length) {
    return 'No search results found.';
  }

  let formattedResults = `Web search results for query: "${searchResults.query}"\n\n`;

  searchResults.results.forEach((result, index) => {
    formattedResults += `[${index + 1}] ${result.title}\n`;
    formattedResults += `URL: ${result.url}\n`;
    formattedResults += `Summary: ${result.summary}\n\n`;
  });

  formattedResults += 'Please use these search results to help answer the user\'s question. Cite sources using [1], [2], etc.';

  return formattedResults;
};

/**
 * Creates a system message with search results for the model
 * 
 * @param {Object} searchResults - Results from performWebSearch
 * @returns {Object} - System message object with search results
 */
export const createSearchResultsSystemMessage = (searchResults) => {
  return {
    role: 'system',
    content: formatSearchResultsForPrompt(searchResults)
  };
};

/**
 * Checks if a message should trigger a web search
 * 
 * @param {string} message - User message
 * @returns {boolean} - True if the message should trigger a search
 */
export const shouldPerformWebSearch = (message) => {
  // Check for explicit search indicators
  const searchIndicators = [
    'search for',
    'look up',
    'find information',
    'search the web',
    'google',
    'recent',
    'latest',
    'news',
    'current',
    'update',
    'information about',
    'what is',
    'who is',
    'where is',
    'when did',
    'how to'
  ];

  // Check for question patterns
  const isQuestion = message.includes('?') || 
                     message.toLowerCase().startsWith('what') ||
                     message.toLowerCase().startsWith('who') ||
                     message.toLowerCase().startsWith('where') ||
                     message.toLowerCase().startsWith('when') ||
                     message.toLowerCase().startsWith('why') ||
                     message.toLowerCase().startsWith('how');

  // Check if message contains any search indicators
  const containsSearchIndicator = searchIndicators.some(indicator => 
    message.toLowerCase().includes(indicator.toLowerCase())
  );

  // Message should be a certain length to trigger search
  const isLongEnough = message.length > 10;

  return isLongEnough && (isQuestion || containsSearchIndicator);
};

/**
 * Extracts a search query from a user message
 * 
 * @param {string} message - User message
 * @returns {string} - Extracted search query
 */
export const extractSearchQuery = (message) => {
  // Remove common prefixes that might appear in messages
  const prefixesToRemove = [
    'search for',
    'look up',
    'find information about',
    'search the web for',
    'google',
    'can you tell me about',
    'i want to know about',
    'please find'
  ];

  let query = message;

  prefixesToRemove.forEach(prefix => {
    if (query.toLowerCase().startsWith(prefix.toLowerCase())) {
      query = query.substring(prefix.length).trim();
    }
  });

  // Remove trailing punctuation
  query = query.replace(/[.?!]+$/, '').trim();

  return query;
};

/**
 * Formats search results for display in the UI
 * 
 * @param {Object} searchResults - Results from performWebSearch
 * @returns {Object} - Formatted results for UI display
 */
export const formatSearchResultsForDisplay = (searchResults) => {
  if (!searchResults || !searchResults.results || !searchResults.results.length) {
    return {
      query: searchResults?.query || '',
      results: []
    };
  }

  return {
    query: searchResults.query,
    results: searchResults.results.map(result => ({
      title: result.title,
      url: result.url,
      snippet: result.snippet || '',
      summary: result.summary
    }))
  };
};

export default {
  performWebSearch,
  formatSearchResultsForPrompt,
  createSearchResultsSystemMessage,
  shouldPerformWebSearch,
  extractSearchQuery,
  formatSearchResultsForDisplay
}; 