export default function Tooltip({ text, children, position = 'top' }) {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative group inline-flex">
      {children}
      <div
        className={`pointer-events-none absolute ${positionClasses[position]} z-50
          whitespace-nowrap rounded-md px-2.5 py-1.5
          bg-white border border-slate-200 text-slate-800 text-xs font-medium
          shadow-[0_2px_8px_rgba(0,0,0,0.25)]
          opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100
          transition-all duration-100 ease-out`}
      >
        {text}
      </div>
    </div>
  );
}
