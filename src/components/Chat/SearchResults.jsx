import React from 'react';
import { ExternalLink } from 'lucide-react';

const SearchResults = ({ results }) => {
  if (!results || !results.results || results.results.length === 0) {
    return null;
  }
  
  return (
    <div className="search-results">
      <div className="mb-2 font-medium">
        Web search results for: "{results.query}"
      </div>
      {results.results.map((result, index) => (
        <div key={index} className="search-result-item">
          <div className="search-result-title">
            <a 
              href={result.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center hover:underline"
            >
              {result.title}
              <ExternalLink size={12} className="ml-1" />
            </a>
          </div>
          <div className="search-result-url">{result.url}</div>
          <div className="text-sm">
            {result.snippet || result.summary.substring(0, 150)}
            {(result.snippet?.length > 150 || (!result.snippet && result.summary.length > 150)) && '...'}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SearchResults; 