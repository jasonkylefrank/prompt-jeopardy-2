export default function Card({ children, className = '' }) {
  return (
    <div className={`bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-xl overflow-hidden ${className}`}>
      {children}
    </div>
  );
}
