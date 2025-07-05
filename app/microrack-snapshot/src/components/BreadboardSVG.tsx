import React, { useState } from "react";
import ModuleSVG, { type PinDef, type KnobDef, type SwitchDef } from "./ModuleSVG";
import { useDroppable, useDraggable } from '@dnd-kit/core';
import {
  BREADBOARD_VERTICAL_SCALE,
  BREADBOARD_DISPLAY_SCALE,
  BREADBOARD_GRID_PADDING,
  BREADBOARD_CELL_SIZE,
  BREADBOARD_MARGIN
} from '../breadboardConfig';
import { calculateModulePinPositions, type AllPin } from "../utils/pinPositioning";

export interface ModuleInstance {
  id: string;
  type: string;
  x: number; // pin column
  y: number; // row (if needed)
  width: number; // in pins
  height: number; // in px
  pcbImage: string;
  pcbImageLarge: string;
  pins: PinDef[];
  knobs: KnobDef[];
  switches: SwitchDef[];
  breadboardId?: string;
  legsPattern: string;
  inputs: PinDef[];
  outputs: PinDef[];
}

export interface BreadboardSVGProps {
  layout: string[];
  cellSize: number;
  margin: number;
  modules: ModuleInstance[];
  onKnobChange?: (moduleId: string, knobId: string, value: number) => void;
  onSwitchChange?: (moduleId: string, switchId: string, value: boolean) => void;
  onKnobHover?: (moduleId: string, knobTitle: string) => void;
  onSwitchHover?: (moduleId: string, switchTitle: string) => void;
  onElementHoverEnd?: () => void;
  dndId: string;
  dragPreview?: {
    x: number | null;
    unitsWidth: number | null;
    valid: boolean | null;
    pins: number[] | null;
  };
  mouseClientX?: number;
  mouseClientY?: number;
  mouseSvgX?: number;
  mouseSvgY?: number;
  mouseRelX?: number;
  mouseRelXClamped?: number;
  mouseCol?: number;
  pendingCable?: any;
  onPinClick?: any;
  onPinPointerDown?: any;
  hoveredPinId?: string | null;
  setHoveredPinId?: (id: string | null) => void;
  breadboardId?: string;
  onModuleHover?: (moduleId: string, coords: {x: number, y: number} | null) => void;
}

const COLORS: Record<string, string> = {
  P: "#61dafb",  // power-bus pin
  M: "#2a2a2a",  // main area
  _: "#181818"   // gap
};

function DraggableModule({ mod, cellSize, margin, gridPadding = 20, onKnobChange, onSwitchChange, onKnobHover, onSwitchHover, onElementHoverEnd, onPinClick, pendingCable, onDebugCoordsChange, onPinPointerDown, hoveredPinId, setHoveredPinId, layout }: { mod: ModuleInstance, cellSize: number, margin: number, gridPadding?: number, onKnobChange?: (moduleId: string, knobId: string, value: number) => void, onSwitchChange?: (moduleId: string, switchId: string, value: boolean) => void, onKnobHover?: (moduleId: string, knobTitle: string) => void, onSwitchHover?: (moduleId: string, switchTitle: string) => void, onElementHoverEnd?: () => void, onPinClick?: any, pendingCable?: any, onDebugCoordsChange?: (coords: {x: number, y: number} | null) => void, onPinPointerDown?: any, hoveredPinId?: string | null, setHoveredPinId?: (id: string | null) => void, layout: string[] }) {
  const {attributes, listeners, setNodeRef, isDragging} = useDraggable({
    id: `module-${mod.id}`,
    data: {
      type: 'existing',
      modId: mod.id,
      breadboardId: mod.breadboardId,
      x: mod.x,
      y: mod.y,
      width: mod.width,
      height: mod.height,
      legsPattern: mod.legsPattern,
      mod: mod
    }
  });
    // Calculate bottom-aligned position
    const scaledCellSize = cellSize * BREADBOARD_VERTICAL_SCALE;
    const breadboardHeight = layout.length * scaledCellSize + (layout.length - 1) * margin;
    const modY = gridPadding + breadboardHeight - mod.height;
    
    return (
    <foreignObject
      x={gridPadding + mod.x * (cellSize + margin)}
      y={modY}
      width={mod.width * cellSize + (mod.width - 1) * margin}
      height={mod.height}
      style={{ overflow: 'visible' }}
    >
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        style={{ cursor: 'grab', opacity: isDragging ? 0.5 : 1, width: '100%', height: '100%' }}
      >
        <svg
          width={mod.width * cellSize + (mod.width - 1) * margin}
          height={mod.height}
          style={{ pointerEvents: 'auto' }}
          onMouseMove={onDebugCoordsChange ? (e => {
            const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
            const x = (e.clientX - rect.left) / rect.width;
            const y = (e.clientY - rect.top) / rect.height;
            onDebugCoordsChange({ x, y });
          }) : undefined}
          onMouseLeave={onDebugCoordsChange ? (() => onDebugCoordsChange(null)) : undefined}
        >
          <ModuleSVG
            moduleId={mod.id}
            width={mod.width * cellSize + (mod.width - 1) * margin}
            height={mod.height}
            pcbImage={mod.pcbImage}
            pcbImageLarge={mod.pcbImageLarge}
            pins={mod.pins}
            knobs={mod.knobs}
            switches={mod.switches}
            inputs={mod.inputs}
            outputs={mod.outputs}
            onKnobChange={onKnobChange}
            onSwitchChange={onSwitchChange}
            onKnobHover={onKnobHover}
            onSwitchHover={onSwitchHover}
            onElementHoverEnd={onElementHoverEnd}
            onPinClick={onPinClick}
            pendingCable={pendingCable}
            onPinPointerDown={onPinPointerDown}
            hoveredPinId={hoveredPinId}
            setHoveredPinId={setHoveredPinId}
          />
        </svg>
      </div>
    </foreignObject>
  );
}

export default function BreadboardSVG({
  layout,
  cellSize,
  margin,
  modules,
  onKnobChange,
  onSwitchChange,
  onKnobHover,
  onSwitchHover,
  onElementHoverEnd,
  dndId,
  dragPreview,
  mouseClientX,
  mouseClientY,
  mouseSvgX,
  mouseSvgY,
  mouseRelX,
  mouseRelXClamped,
  mouseCol,
  cables = [],
  pendingCable,
  onPinClick,
  onPinPointerDown,
  hoveredPinId,
  setHoveredPinId,
  breadboardId,
  onModuleHover,
}: BreadboardSVGProps & { cables?: any[]; pendingCable?: any; onPinClick?: any; onPinPointerDown?: any }) {
  const rows = layout.length;
  const cols = layout[0]?.length || 0;
  const width = cols * cellSize + (cols - 1) * margin;
  const scaledCellSize = cellSize * BREADBOARD_VERTICAL_SCALE;
  const height = rows * scaledCellSize + (rows - 1) * margin;

  const { setNodeRef, isOver } = useDroppable({ id: dndId });
  const [debugCoords, setDebugCoords] = useState<{x: number, y: number} | null>(null);

  // Collect pin positions for all modules
  const pinPositions: Record<string, { input: { x: number, y: number, pinId: string }[][]; output: { x: number, y: number, pinId: string }[][] }> = {};
  // For hit-testing
  const allPins: Record<string, AllPin> = {};
  modules.forEach(mod => {
    const modX = BREADBOARD_GRID_PADDING + mod.x * (cellSize + margin);
    // Position module to align bottom edge with bottom of breadboard
    const breadboardHeight = rows * scaledCellSize + (rows - 1) * margin;
    const modY = BREADBOARD_GRID_PADDING + breadboardHeight - mod.height;
    const width = mod.width * cellSize + (mod.width - 1) * margin;
    const height = mod.height;
    // Use shared pin positioning utility
    const { pinPositions: modulePinPositions, allPins: moduleAllPins } = calculateModulePinPositions(
      mod.id,
      mod.inputs,
      mod.outputs,
      modX,
      modY,
      width,
      height
    );
    
    pinPositions[mod.id] = modulePinPositions;
    Object.assign(allPins, moduleAllPins);
  });

  // Expose allPins for hit-testing in App - support multiple breadboards
  if (!(window as any)._allPinsByBreadboard) {
    (window as any)._allPinsByBreadboard = {};
  }
  
  // Debug: Log pin information to help diagnose conflicts (commented out to reduce noise)
  const pinValues = Object.values(allPins);
  // console.log(`[BreadboardSVG] Storing ${pinValues.length} pins for breadboard ${breadboardId}:`, 
  //   pinValues.map(p => ({ pinId: p.pinId, label: p.label, moduleId: p.moduleId }))
  // );
  
  (window as any)._allPinsByBreadboard[breadboardId || 'default'] = pinValues;
  
  // Also maintain the old global for backward compatibility with the current breadboard
  (window as any)._allPins = Object.values(allPins);
  (window as any)._allPinsBreadboardId = breadboardId;

  return (
    <div ref={setNodeRef} id={dndId} style={{ display: 'inline-block' }}>
      <svg
        id={`svg-${dndId}`}
        width={(width + 2 * BREADBOARD_GRID_PADDING) * BREADBOARD_DISPLAY_SCALE}
        height={(height + 2 * BREADBOARD_GRID_PADDING) * BREADBOARD_DISPLAY_SCALE}
        viewBox={`0 0 ${width + 2 * BREADBOARD_GRID_PADDING} ${height + 2 * BREADBOARD_GRID_PADDING}`}
        style={{ background: isOver ? '#2a2a2a' : '#222', outline: isOver ? '2px solid #4fa' : 'none' }}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Mouse debug label */}
        {(typeof mouseClientX === 'number' || typeof mouseSvgX === 'number' || typeof mouseCol === 'number') && (
          <text x={BREADBOARD_GRID_PADDING + 10} y={BREADBOARD_GRID_PADDING - 2} fill="#fff" fontSize={14}>
            client: ({mouseClientX?.toFixed(1)}, {mouseClientY?.toFixed(1)})  svg: ({mouseSvgX?.toFixed(1)}, {mouseSvgY?.toFixed(1)})  relX: {mouseRelX?.toFixed(1)}  relXc: {mouseRelXClamped?.toFixed(1)}  Col: {mouseCol}
          </text>
        )}
        {/* Breadboard grid */}
        <g>
          {layout.map((row, y) =>
            [...row].map((ch, x) => {
              let bg = COLORS[ch] || "#333";
              if (
                dragPreview &&
                Number.isInteger(dragPreview.x ?? undefined) &&
                Number.isInteger(dragPreview.unitsWidth ?? undefined)
              ) {
                const numRows = layout.length;
                const x0 = dragPreview.x ?? 0;
                const w = dragPreview.unitsWidth ?? 1;
                const isUpperPinRow = y === 0 || y === 1;
                const isLowerPinRow = y === numRows - 2 || y === numRows - 1;
                const isPinRow = isUpperPinRow || isLowerPinRow;
                const pinIndex = x - x0;
                const isPinCell = isPinRow && dragPreview.pins?.includes(pinIndex);
                const inHighlight = isPinRow && x >= x0 && x < x0 + w;
                const isGap = ch === "_";
                
                if (isPinCell) {
                  // Bright highlight for actual pin positions, but darker if on gap
                  if (isGap) {
                    // Invalid leg on gap - medium brightness
                    bg = dragPreview.valid ? "#3a9a3a" : "#aa2050";
                  } else {
                    // Valid leg on proper pin area - brightest
                    bg = dragPreview.valid ? "#53e453" : "#ff3030";
                  }
                } else if (inHighlight) {
                  // Different highlight intensity based on cell type
                  if (isGap) {
                    // Even darker for gaps
                    bg = dragPreview.valid
                      ? "rgba(83,228,83,0.08)"
                      : "rgba(255,48,48,0.08)";
                  } else {
                    // Medium highlight for between-pin areas
                    bg = dragPreview.valid
                      ? "rgba(83,228,83,0.15)"
                      : "rgba(255,48,48,0.15)";
                  }
                }
              }
              return (
                <rect
                  key={`${x},${y}`}
                  x={BREADBOARD_GRID_PADDING + x * (cellSize + margin)}
                  y={BREADBOARD_GRID_PADDING + y * (scaledCellSize + margin)}
                  width={cellSize}
                  height={scaledCellSize}
                  fill={bg}
                  stroke="#444"
                  rx={2}
                />
              );
            })
          )}
        </g>
        {/* Modules */}
        {modules.map((mod, i) => (
          <DraggableModule
            key={mod.id}
            mod={mod}
            cellSize={cellSize}
            margin={margin}
            gridPadding={BREADBOARD_GRID_PADDING}
            layout={layout}
            onKnobChange={onKnobChange}
            onSwitchChange={onSwitchChange}
            onKnobHover={onKnobHover}
            onSwitchHover={onSwitchHover}
            onElementHoverEnd={onElementHoverEnd}
            onPinClick={onPinClick}
            onPinPointerDown={onPinPointerDown}
            pendingCable={pendingCable}
            hoveredPinId={hoveredPinId}
            setHoveredPinId={setHoveredPinId}
            onDebugCoordsChange={(coords) => {
              setDebugCoords(coords);
              if (onModuleHover) {
                onModuleHover(mod.id, coords);
              }
            }}
          />
        ))}
        {/* Cables are now rendered globally at app level */}
        {/* Ghost cable is now rendered globally at app level */}
      </svg>
      {/* Debug coordinates moved to right panel */}
    </div>
  );
}