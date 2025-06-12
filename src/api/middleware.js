
/**
 * Middleware to intercept fetch requests to /api routes
 * and forward them to the backend server
 */
export function setupApiMiddleware() {
  // Store the original fetch function
  const originalFetch = window.fetch;
  
  // Backend server URL
  const BACKEND_URL = 'http://localhost:3001';
  
  // Override the fetch function
  window.fetch = async function(url, options = {}) {
    // Check if this is an API request
    if (typeof url === 'string' && url.startsWith('/api/')) {
      try {
        // Forward the request to the backend server
        const backendUrl = `${BACKEND_URL}${url}`;
        console.log(`[API Middleware] Forwarding request to: ${backendUrl}`);
        
        // Use the original fetch to make the request to the backend
        const response = await originalFetch(backendUrl, options);
        
        // Check if the response is ok
        if (!response.ok) {
          // Try to get error details from the response
          const errorData = await response.json().catch(() => ({}));
          const error = new Error(errorData.error?.message || 'Request failed');
          error.status = response.status;
          error.response = response;
          throw error;
        }
        
        return response;
      } catch (error) {
        console.error('Error in API middleware:', error);
        
        // Create a proper error response with detailed information
        let errorMessage = error.message || 'An unknown error occurred';
        let statusCode = error.status || 500;
        let errorName = error.name || 'UnknownError';
        let errorDetails = {};
        
        // Check for HTTP error status codes in the error object
        if (error.status) {
          statusCode = error.status;
        } else if (error.statusCode) {
          statusCode = error.statusCode;
        } else if (error.code && !isNaN(parseInt(error.code))) {
          statusCode = parseInt(error.code);
        }
        
        // Handle common HTTP status codes
        if (statusCode === 429) {
          errorMessage = 'Too many requests. Please wait a moment before trying again.';
          errorName = 'RateLimitExceeded';
        } else if (statusCode === 401 || statusCode === 403) {
          errorMessage = 'Authentication failed. Please check your API key.';
          errorName = 'AuthenticationError';
        }
        
        // Preserve provider-specific error details
        if (error.code) errorDetails.code = error.code;
        if (error.type) errorDetails.type = error.type;
        if (error.param) errorDetails.param = error.param;
        if (error.reason) errorDetails.reason = error.reason;
        
        return new Response(
          JSON.stringify({ 
            error: {
              name: errorName,
              message: errorMessage,
              statusCode: statusCode,
              details: Object.keys(errorDetails).length > 0 ? errorDetails : undefined
            }
          }),
          { status: statusCode, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // For non-API requests, use the original fetch
    return originalFetch.apply(window, arguments);
  };
  
  // Store the original fetch for later restoration
  window.originalFetch = originalFetch;
}

/**
 * Remove the API middleware
 */
export function removeApiMiddleware() {
  // Restore the original fetch function
  if (window.originalFetch) {
    window.fetch = window.originalFetch;
    delete window.originalFetch;
  }
} 