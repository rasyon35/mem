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
      className={`w-7 h-7 rounded flex items-center justify-center transition-all duration-150 active:scale-95 ${
        active 
          ? 'bg-[var(--surface-3)] text-[var(--text-primary)] border border-[var(--border-strong)]' 
          : 'bg-transparent hover:bg-[var(--surface-2)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-transparent hover:border-[var(--border-subtle)]'
      }`}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={active ? 2.5 : 2} />
    </button>
  );
}
