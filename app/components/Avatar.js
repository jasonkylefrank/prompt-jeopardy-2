export default function Avatar({ emoji, size = 'lg', className = '' }) {
  const sizes = {
    sm: "w-12 h-12 text-2xl",
    md: "w-20 h-20 text-4xl",
    lg: "w-32 h-32 text-7xl",
  };

  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-mystery-violet to-mystery-indigo flex items-center justify-center shadow-inner border-4 border-white/10 shrink-0 ${className}`}>
      {emoji}
    </div>
  );
}
