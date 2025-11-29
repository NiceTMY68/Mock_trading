/**
 * Linkify Utility
 * 
 * Auto-detect URLs in text and render as clickable links
 */

import React from 'react';

// URL regex pattern
const URL_REGEX = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;

/**
 * Convert text with URLs to React elements with clickable links
 */
export function linkifyText(text: string): React.ReactNode[] {
  if (!text) return [];
  
  const parts = text.split(URL_REGEX);
  
  return parts.map((part, index) => {
    // Check if this part is a URL
    if (URL_REGEX.test(part)) {
      // Reset regex lastIndex
      URL_REGEX.lastIndex = 0;
      
      return (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 underline hover:text-emerald-300 transition-colors break-all"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    
    return <span key={index}>{part}</span>;
  });
}

/**
 * Component wrapper for linkified text
 */
interface LinkifyProps {
  children: string;
  className?: string;
}

export const Linkify: React.FC<LinkifyProps> = ({ children, className }) => {
  return (
    <span className={className}>
      {linkifyText(children)}
    </span>
  );
};

export default Linkify;

