'use client';

interface ToolbarButtonProps {
  icon: any;
  onClick: () => void;
  tooltip: string;
  active?: boolean;
}

export function ToolbarButton({ icon: Icon, onClick, tooltip, active }: ToolbarButtonProps) {
  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      title={tooltip}
      className={`w-9 h-9 rounded-xl transition-all flex items-center justify-center group relative border ${
        active 
          ? 'bg-[var(--accent)] text-white border-[var(--accent)] shadow-[0_0_15px_-3px_var(--accent)]' 
          : 'bg-transparent border-transparent hover:bg-white/5 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:border-white/10'
      }`}
    >
      <Icon className={`w-4 h-4 transition-transform group-active:scale-90 ${active ? 'stroke-[2.5px]' : 'stroke-[1.5px]'}`} />
    </button>
  );
}
