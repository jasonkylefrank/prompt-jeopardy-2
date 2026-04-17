export default function Button({ children, onClick, disabled, variant = 'primary', className = '', type = 'button', ...props }) {
  const baseStyles = "px-6 py-3 rounded-lg font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer";
  
  const variants = {
    primary: "bg-mystery-cyan text-slate-900 hover:bg-cyan-300 focus:ring-mystery-cyan hover:shadow-[0_0_15px_rgba(34,211,238,0.5)]",
    secondary: "bg-mystery-violet text-white hover:bg-purple-800 focus:ring-mystery-violet",
    danger: "bg-mystery-pink text-white hover:bg-pink-500 focus:ring-mystery-pink hover:shadow-[0_0_15px_rgba(244,114,182,0.5)]",
    outline: "border-2 border-mystery-cyan text-mystery-cyan hover:bg-mystery-cyan/10 focus:ring-mystery-cyan",
  };

  return (
    <button 
      type={type}
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
