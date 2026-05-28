import React from 'react';

export default function Logo({ className = "w-8 h-8 text-emerald-500" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className={className}>
      <path 
        d="M 80,20 L 20,20 L 20,50 L 80,50 L 80,80 L 20,80" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="12" 
        strokeLinecap="square" 
        strokeLinejoin="miter"
      />
    </svg>
  );
}
