import { handleApiRequest } from './index';

/**
 * Middleware to intercept fetch requests to /api routes
 * In a real app, this would be handled by your backend framework
 * For this demo, we're simulating API routes in the frontend
 */
export function setupApiMiddleware() {
  // Store the original fetch function
  const originalFetch = window.fetch;
  
  // Override the fetch function
  window.fetch = async function(url, options = {}) {
    // Check if this is an API request
    if (typeof url === 'string' && url.startsWith('/api/')) {
      // Extract the path from the URL
      const path = url.substring(4); // Remove '/api'
      
      // Get the request method and body
      const method = options.method || 'GET';
      let body = options.body;
      
      // Parse the body if it's a JSON string
      if (typeof body === 'string') {
        try {
          body = JSON.parse(body);
        } catch (error) {
          // If parsing fails, keep the body as is
          console.warn('Failed to parse request body as JSON');
        }
      }
      
      try {
        // Handle the API request
        const response = await handleApiRequest(path, method, body);
        
        // Ensure we're returning a proper Response object
        if (response instanceof Response) {
          return response;
        } else {
          // If handleApiRequest didn't return a Response object, create one
          console.error('API handler did not return a Response object');
          return new Response(
            JSON.stringify({ error: 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }
      } catch (error) {
        console.error('Error in API middleware:', error);
        
        // Create a proper error response with detailed information
        let errorMessage = error.message || 'An unknown error occurred';
        let statusCode = error.statusCode || 500;
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
        
        // Handle specific AI provider error formats
        if (error.response) {
          try {
            // Some AI providers include detailed error info in the response
            const responseData = await error.response.json();
            
            // Update status code if available in the response
            if (error.response.status) {
              statusCode = error.response.status;
              
              // Set specific messages for common status codes
              if (statusCode === 429) {
                errorMessage = 'Too many requests. Please wait a moment before trying again.';
                errorName = 'RateLimitExceeded';
              } else if (statusCode === 401 || statusCode === 403) {
                errorMessage = 'Authentication failed. Please check your API key.';
                errorName = 'AuthenticationError';
              }
            }
            
            if (responseData.error) {
              // Use the provider's error message if available
              errorMessage = responseData.error.message || errorMessage;
              errorName = responseData.error.type || errorName;
              if (responseData.error.code) errorDetails.code = responseData.error.code;
              if (responseData.error.param) errorDetails.param = responseData.error.param;
            }
          } catch (e) {
            // If we can't parse the response, use what we have
            console.warn('Could not parse error response:', e);
            
            // Still try to get the status code from the response
            if (error.response.status) {
              statusCode = error.response.status;
            }
          }
        }
        
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