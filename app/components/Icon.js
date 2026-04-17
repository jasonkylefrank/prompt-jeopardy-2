export default function Icon({ children, viewBox = "0 -960 960 960", className = '' }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      viewBox={viewBox} 
      className={`w-6 h-6 inline-block shrink-0 ${className}`} 
      fill="currentColor"
    >
      {children}
    </svg>
  );
}
