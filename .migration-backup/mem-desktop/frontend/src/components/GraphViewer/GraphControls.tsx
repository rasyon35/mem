import React from 'react';
import { GraphLayoutMode } from './GraphTypes';

interface GraphControlsProps {
  layoutMode: GraphLayoutMode;
  onLayoutChange: (mode: GraphLayoutMode) => void;
  minimapVisible: boolean;
  onToggleMinimap: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  heatMapMode: boolean;
  onToggleHeatMap: () => void;
  onFindPath: () => void;
}

export default function GraphControls({
  layoutMode,
  onLayoutChange,
  minimapVisible,
  onToggleMinimap,
  onZoomIn,
  onZoomOut,
  onResetView,
  onExpandAll,
  onCollapseAll,
  heatMapMode,
  onToggleHeatMap,
  onFindPath,
}: GraphControlsProps) {
  const layouts: { mode: GraphLayoutMode; label: string }[] = [
    { mode: 'radial', label: 'Radial' },
    { mode: 'force', label: 'Force' },
    { mode: 'cluster', label: 'Cluster' },
    { mode: 'hierarchy', label: 'Hierarchy' },
  ];

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-surface-2 rounded-md px-3 py-1.5 border border-border-subtle shadow-sm">
      {/* Layout Switcher */}
      <div className="flex items-center gap-1 mr-2">
        {layouts.map(({ mode, label }) => (
          <button
            key={mode}
            onClick={() => onLayoutChange(mode)}
            className={`text-[10px] px-2 py-1 rounded transition-colors ${
              layoutMode === mode
                ? 'bg-accent text-white'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="w-px h-4" style={{ background: 'var(--border)' }} />

      {/* Zoom */}
      <button
        onClick={onZoomOut}
        className="text-text-muted hover:text-text-primary text-xs px-1"
        title="Zoom Out (-)"
      >
        −
      </button>
      <button
        onClick={onZoomIn}
        className="text-text-muted hover:text-text-primary text-xs px-1"
        title="Zoom In (+)"
      >
        +
      </button>

      <div className="w-px h-4" style={{ background: 'var(--border)' }} />

      {/* Actions */}
      <button
        onClick={onResetView}
        className="text-[10px] px-2 py-1 rounded text-text-muted hover:text-text-primary transition-colors"
        title="Reset View (ESC)"
      >
        Reset
      </button>
      <button
        onClick={onExpandAll}
        className="text-[10px] px-2 py-1 rounded text-text-muted hover:text-text-primary transition-colors"
      >
        Expand All
      </button>
      <button
        onClick={onCollapseAll}
        className="text-[10px] px-2 py-1 rounded text-text-muted hover:text-text-primary transition-colors"
      >
        Collapse All
      </button>

      <div className="w-px h-4" style={{ background: 'var(--border)' }} />

      {/* Toggles */}
      <button
        onClick={onToggleHeatMap}
        className={`text-[10px] px-2 py-1 rounded transition-colors ${
          heatMapMode ? 'bg-orange-500/20 text-orange-400' : 'text-text-muted hover:text-text-primary'
        }`}
        title="Toggle Heat Map"
      >
        Heat
      </button>
      <button
        onClick={onToggleMinimap}
        className={`text-[10px] px-2 py-1 rounded transition-colors ${
          minimapVisible ? 'bg-accent/20 text-accent' : 'text-text-muted hover:text-text-primary'
        }`}
        title="Toggle Minimap (M)"
      >
        Map
      </button>
      <button
        onClick={onFindPath}
        className="text-[10px] px-2 py-1 rounded text-text-muted hover:text-text-primary transition-colors"
        title="Find Path Between Nodes"
      >
        Path
      </button>
    </div>
  );
}
