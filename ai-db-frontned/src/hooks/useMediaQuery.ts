// src/hooks/useMediaQuery.ts
import { useState, useEffect } from 'react';

/**
 * Hook for detecting if the window matches a media query
 * @param query CSS media query string (e.g. '(max-width: 768px)')
 * @returns boolean indicating if the media query matches
 */
export function useMediaQuery(query: string): boolean {
  // Initialize with the match status (false on SSR)
  const [matches, setMatches] = useState<boolean>(false);

  useEffect(() => {
    // Make sure we're in a browser environment
    if (typeof window === 'undefined') {
      return undefined;
    }

    // Create MediaQueryList object
    const media = window.matchMedia(query);
    
    // Initial check
    setMatches(media.matches);
    
    // Define a callback for when the media query state changes
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };
    
    // Add the callback as a listener
    if (media.addEventListener) {
      media.addEventListener('change', listener);
    } else {
      // Fallback for older browsers
      media.addListener(listener);
    }
    
    // Clean up function
    return () => {
      if (media.removeEventListener) {
        media.removeEventListener('change', listener);
      } else {
        // Fallback for older browsers
        media.removeListener(listener);
      }
    };
  }, [query]); // Only re-run if the query changes
  
  return matches;
}