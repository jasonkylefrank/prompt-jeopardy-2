export default function Input({ label, type = "text", className = '', ...props }) {
  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      {label && <label className="text-sm font-medium text-slate-300 ml-1">{label}</label>}
      {type === 'textarea' ? (
        <textarea 
          className="bg-slate-900/50 border border-white/20 rounded-lg p-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-mystery-cyan focus:border-transparent transition-all min-h-[100px]"
          {...props}
        />
      ) : (
        <input
          type={type}
          className="bg-slate-900/50 border border-white/20 rounded-lg p-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-mystery-cyan focus:border-transparent transition-all"
          {...props}
        />
      )}
    </div>
  );
}
