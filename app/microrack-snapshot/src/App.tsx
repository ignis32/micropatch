import React, { useState, useEffect, useRef } from "react";
import BreadboardSVG, { type ModuleInstance } from "./components/BreadboardSVG";
import ModuleBrowser from "./components/ModuleBrowser";
import GlobalCableLayer from "./components/GlobalCableLayer";
import { v4 as uuidv4 } from "uuid";
import { DndContext, DragOverlay, useDroppable } from '@dnd-kit/core';
import {
  BREADBOARD_VERTICAL_SCALE,
  BREADBOARD_DISPLAY_SCALE,
  BREADBOARD_GRID_PADDING,
  BREADBOARD_SPACING,
  BREADBOARD_CELL_SIZE,
  BREADBOARD_MARGIN
} from './breadboardConfig';
import { loadImageDimensions, calculateModuleHeight } from './utils/imageLoader';

declare global {
  interface Window {
    _debugCableLog?: string[];
    _lastDebugLogEntry?: string;
  }
}

const BREADBOARD_TYPES = [
  { id: "bb-830", name: "830 Pin Breadboard" },
  { id: "bb-400", name: "400 Pin Breadboard" }
];

// Debug log setup
if (typeof window !== 'undefined' && !window._debugCableLog) {
  window._debugCableLog = [];
}
const logDebug = (msg: string, data?: any) => {
  const entry = `[${new Date().toISOString()}] ${msg}` + (data !== undefined ? `: ${JSON.stringify(data)}` : '');
  if (window._debugCableLog) {
    // More aggressive deduplication - only log if it's different from the last 3 entries
    const lastEntries = window._debugCableLog.slice(-3);
    if (!lastEntries.includes(entry)) {
      window._debugCableLog.push(entry);
      window._lastDebugLogEntry = entry;
    } else {
      // Only push '*' if last log is not already '*'
      if (window._debugCableLog[window._debugCableLog.length - 1] !== '*') {
        window._debugCableLog.push('*');
      }
    }
  }
  // Optionally log to console
  // console.log(entry);
};

function isPinObj(obj: any): obj is { pinId: string } {
  return typeof obj === 'object' && obj !== null && typeof obj.pinId === 'string';
}

export default function App() {
  const [breadboards, setBreadboards] = useState([
    { id: uuidv4(), type: "bb-830" }
  ]);
  const [modules, setModules] = useState<ModuleInstance[]>([]);
  const [cables, setCables] = useState<{
    id: string;
    from: string; // pinId
    to: string;   // pinId
    color: string;
  }[]>([]);
  const [selectedType, setSelectedType] = useState("bb-830");
  const [layouts, setLayouts] = useState<Record<string, string[]>>({});
  const [draggedModule, setDraggedModule] = useState<any>(null);
  const [dragPreview, setDragPreview] = useState<any>(null);
  const [mouseClientX, setMouseClientX] = useState<number | undefined>(undefined);
  const [mouseClientY, setMouseClientY] = useState<number | undefined>(undefined);
  const [mouseSvgX, setMouseSvgX] = useState<number | undefined>(undefined);
  const [mouseSvgY, setMouseSvgY] = useState<number | undefined>(undefined);
  const [mouseRelX, setMouseRelX] = useState<number | undefined>(undefined);
  const [mouseRelXClamped, setMouseRelXClamped] = useState<number | undefined>(undefined);
  const [mouseCol, setMouseCol] = useState<number | undefined>(undefined);
  const [pendingCable, setPendingCable] = useState<{ from: string | null, mouse?: { x: number, y: number } | null }>({ from: null, mouse: null });
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);
  const [hoveredKnobId, setHoveredKnobId] = useState<string | null>(null);
  const [hoveredSwitchId, setHoveredSwitchId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [debugMousePos, setDebugMousePos] = useState<{x: number, y: number} | null>(null);
  const [debugBreadboardRects, setDebugBreadboardRects] = useState<Record<string, {left: number, top: number, right: number, bottom: number}>>({});
  const [debugMode, setDebugMode] = useState(false);
  const [recordedPins, setRecordedPins] = useState<Record<string, {mouse: {x: number, y: number}, calc: {x: number, y: number}, info: string}>>({});
  const [hoveredModuleCoords, setHoveredModuleCoords] = useState<{moduleId: string, x: number, y: number} | null>(null);
  // Ref to always have latest pendingCable in pointer event handlers
  const pendingCableRef = useRef(pendingCable);
  useEffect(() => { pendingCableRef.current = pendingCable; }, [pendingCable]);

  useEffect(() => {
    fetch("./breadboards/breadboards.json")
      .then(r => r.json())
      .then(setLayouts);
  }, []);

  // Mouse tracking for debug
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const mainContainer = document.querySelector('[style*="flex: 1"][style*="padding: 24"]') as HTMLElement;
      if (mainContainer) {
        const rect = mainContainer.getBoundingClientRect();
        setDebugMousePos({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top
        });
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Keyboard recording for debug
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'r' && hoveredPinId && debugMousePos) {
        // Record current pin data
        let calcCoords = { x: 0, y: 0 };
        let pinInfo = "";
        
        if ((window as any)._allPinsByBreadboard) {
          for (const boardId of Object.keys((window as any)._allPinsByBreadboard)) {
            const pins = (window as any)._allPinsByBreadboard[boardId];
            
            const svgElement = document.getElementById(`svg-breadboard-svg-${boardId}`);
            const mainContainer = document.querySelector('[style*="flex: 1"][style*="padding: 24"]') as HTMLElement;
            
            if (svgElement && mainContainer) {
              const svgRect = svgElement.getBoundingClientRect();
              const containerRect = mainContainer.getBoundingClientRect();
              const offsetX = svgRect.left - containerRect.left;
              const offsetY = svgRect.top - containerRect.top;
              
              for (const pin of pins) {
                if (pin.pinId === hoveredPinId) {
                  calcCoords = { x: pin.x * BREADBOARD_DISPLAY_SCALE + offsetX, y: pin.y * BREADBOARD_DISPLAY_SCALE + offsetY };
                  const parts = pin.pinId.split(':');
                  if (parts.length >= 4) {
                    pinInfo = `${parts[0].slice(-4)}.${parts[1].slice(0,3)}.${parts[2]}.${parts[3]}`;
                  }
                  break;
                }
              }
            }
            
            if (calcCoords.x !== 0 || calcCoords.y !== 0) break;
          }
        }
        
        setRecordedPins(prev => ({
          ...prev,
          [hoveredPinId]: {
            mouse: { x: debugMousePos.x, y: debugMousePos.y },
            calc: calcCoords,
            info: pinInfo
          }
        }));
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [hoveredPinId, debugMousePos]);

  // Update breadboard rectangles for debug
  useEffect(() => {
    const updateBreadboardRects = () => {
      const newRects: Record<string, {left: number, top: number, right: number, bottom: number}> = {};
      const mainContainer = document.querySelector('[style*="flex: 1"][style*="padding: 24"]') as HTMLElement;
      
      if (mainContainer) {
        const containerRect = mainContainer.getBoundingClientRect();
        
        breadboards.forEach(board => {
          const svgElement = document.getElementById(`svg-breadboard-svg-${board.id}`);
          if (svgElement) {
            const svgRect = svgElement.getBoundingClientRect();
            newRects[board.id] = {
              left: svgRect.left - containerRect.left,
              top: svgRect.top - containerRect.top,
              right: svgRect.right - containerRect.left,
              bottom: svgRect.bottom - containerRect.top
            };
          }
        });
      }
      
      setDebugBreadboardRects(newRects);
    };
    
    const timeoutId = setTimeout(updateBreadboardRects, 100);
    return () => clearTimeout(timeoutId);
  }, [breadboards, layouts]);

  useEffect(() => {
    let mouseMoveHandler: ((evt: MouseEvent) => void) | null = null;
    if (draggedModule) {
      mouseMoveHandler = (evt: MouseEvent) => {
        setMouseClientX(evt.clientX);
        setMouseClientY(evt.clientY);
        // Always use elementsFromPoint to find the hovered breadboard SVG
        const underMouse = Array.from(document.elementsFromPoint(evt.clientX, evt.clientY));
        const svgEl = underMouse.find(el => el instanceof SVGSVGElement && el.id.startsWith('svg-breadboard-svg-')) as SVGSVGElement | undefined;
        const overId = svgEl ? svgEl.id.replace('svg-', '') : undefined;
        if (!overId) {
          setMouseSvgX(undefined);
          setMouseSvgY(undefined);
          setMouseRelX(undefined);
          setMouseRelXClamped(undefined);
          setMouseCol(undefined);
          return;
        }
        const boardId = overId.replace('breadboard-svg-', '');
        const layout = layouts[breadboards.find(b => b.id === boardId)?.type || ''];
        if (!layout) {
          setMouseSvgX(undefined);
          setMouseSvgY(undefined);
          setMouseRelX(undefined);
          setMouseRelXClamped(undefined);
          setMouseCol(undefined);
          return;
        }
        const svg = document.getElementById('svg-' + overId) as SVGSVGElement | null;
        if (!svg || typeof svg.createSVGPoint !== 'function') {
          setMouseSvgX(undefined);
          setMouseSvgY(undefined);
          setMouseRelX(undefined);
          setMouseRelXClamped(undefined);
          setMouseCol(undefined);
          return;
        }
        // --- Fix: use only getScreenCTM for SVG mapping, no manual scaling ---
        const svgRect = svg.getBoundingClientRect();
        const pt = svg.createSVGPoint();
        pt.x = evt.clientX;
        pt.y = evt.clientY;
        const ctm = svg.getScreenCTM();
        if (!ctm) {
          setMouseSvgX(undefined);
          setMouseSvgY(undefined);
          setMouseRelX(undefined);
          setMouseRelXClamped(undefined);
          setMouseCol(undefined);
          return;
        }
        const svgP = pt.matrixTransform(ctm.inverse());
        setMouseSvgX(svgP.x);
        setMouseSvgY(svgP.y);
        const relX = svgP.x - BREADBOARD_GRID_PADDING; // use grid padding
        setMouseRelX(relX);
        const cellSize = 18, margin = 2;
        const gridWidth = layout[0].length * (cellSize + margin);
        let relXClamped = Math.max(0, Math.min(relX, gridWidth - 1));
        setMouseRelXClamped(relXClamped);
        const unitsWidth = draggedModule.unitsWidth || draggedModule.width || 5;
        const getPinOffsets = (legsPattern: string | null, unitsWidth: number) => {
          if (legsPattern) {
            return [...legsPattern].reduce((acc, ch, i) => {
              if (ch === 'p') acc.push(i);
              return acc;
            }, [] as number[]);
          }
          return [0, unitsWidth - 1];
        };
        const pinOffsets = getPinOffsets(draggedModule.legsPattern, unitsWidth);
        // Center the module under the mouse
        const modulePixelWidth = unitsWidth * (cellSize + margin);
        const relXCentered = relX - modulePixelWidth / 2;
        let x = Math.floor(relXCentered / (cellSize + margin));
        x = Math.max(0, Math.min(x, layout[0].length - unitsWidth));
        setMouseCol(x);
        let valid = true;
        // --- Overlap validation ---
        const draggedId = draggedModule.id || draggedModule.modId;
        const modulesOnBoard = modules.filter(
          m => m.breadboardId === boardId && m.id !== draggedId
        );
        for (let m of modulesOnBoard) {
          if ((x < m.x + m.width) && (x + unitsWidth > m.x)) {
            valid = false;
            break;
          }
        }
        // --- End overlap validation ---
        // Check bottom rows instead of top rows (for bottom-aligned modules)
        for (let rowOffset = 0; rowOffset < 2; rowOffset++) {
          const rowIndex = layout.length - 2 + rowOffset; // Bottom two rows
          const row = layout[rowIndex];
          if (!row) { valid = false; break; }
          for (let i of pinOffsets) {
            if (x + i >= row.length) { valid = false; break; }
            const c = row[x + i];
            if (c !== "P") { valid = false; break; }
          }
        }
        setDragPreview({ boardId, x, unitsWidth, valid, pins: pinOffsets });
      };
      window.addEventListener('mousemove', mouseMoveHandler);
    }
    return () => {
      if (mouseMoveHandler) window.removeEventListener('mousemove', mouseMoveHandler);
    };
  }, [draggedModule, layouts, breadboards, dragPreview, modules]);

  // Add breadboard
  const addBreadboard = () => {
    const newBoard = { id: uuidv4(), type: selectedType };
    setBreadboards(b => [...b, newBoard]);
  };

  // Add module to selected breadboard (at leftmost position)
  const addModule = async (meta: any) => {
    const board = breadboards[breadboards.length - 1]; // Add to the last breadboard by default
    if (!board) return;
    const layout = layouts[board.type];
    const cellSize = 18; // should match BreadboardSVG
    const margin = 2;
    
    // Load image dimensions to calculate proper aspect ratio
    const imagePath = `./modules/${meta.slug}/panel_large.png`;
    let height: number;
    
    try {
      const imageDimensions = await loadImageDimensions(imagePath);
      height = calculateModuleHeight(meta.unitsWidth || 5, cellSize, margin, imageDimensions.aspectRatio);
    } catch (error) {
      // Fallback to old calculation if image loading fails
      console.warn(`Failed to load image dimensions for ${meta.slug}:`, error);
      const numberOfRows = layout ? layout.length : 10;
      const scaledCellSize = cellSize * BREADBOARD_VERTICAL_SCALE;
      height = numberOfRows * scaledCellSize + (numberOfRows - 1) * margin;
    }
    
    setModules(mods => [
      ...mods,
      {
        id: uuidv4(),
        type: meta.slug,
        x: 0,
        y: 0,
        width: meta.unitsWidth || 5,
        height,
        pcbImage: `./modules/${meta.slug}/panel.png`,
        pcbImageLarge: `./modules/${meta.slug}/panel_large.png`,
        pins: Array.isArray(meta.pins) ? meta.pins : [],
        knobs: Array.isArray(meta.knobs) ? meta.knobs.map((k: any) => ({ ...k, value: 0.5 })) : [],
        switches: Array.isArray(meta.switches) ? meta.switches.map((s: any) => ({ ...s, value: false })) : [],
        breadboardId: board.id,
        legsPattern: meta.legsPattern || "",
        inputs: Array.isArray(meta.inputs) ? meta.inputs : [],
        outputs: Array.isArray(meta.outputs) ? meta.outputs : []
      }
    ]);
  };

  // Knob rotation
  const handleKnobChange = (moduleId: string, knobTitle: string, value: number) => {
    setModules(mods =>
      mods.map(m =>
        m.id === moduleId
          ? {
              ...m,
              knobs: m.knobs.map(k =>
                k.title === knobTitle ? { ...k, value } : k
              )
            }
          : m
      )
    );
  };

  // Switch toggle
  const handleSwitchChange = (moduleId: string, switchTitle: string, value: boolean) => {
    setModules(mods =>
      mods.map(m =>
        m.id === moduleId
          ? {
              ...m,
              switches: m.switches.map(s =>
                s.title === switchTitle ? { ...s, value } : s
              )
            }
          : m
      )
    );
  };

  // Hover handlers for knobs and switches
  const handleKnobHover = (moduleId: string, knobTitle: string) => {
    setHoveredKnobId(`${moduleId}:${knobTitle}`);
  };

  const handleSwitchHover = (moduleId: string, switchTitle: string) => {
    setHoveredSwitchId(`${moduleId}:${switchTitle}`);
  };

  const handleElementHoverEnd = () => {
    setHoveredKnobId(null);
    setHoveredSwitchId(null);
  };

  const handleDragStart = (event: any) => {
    // Support both new (from browser) and existing (from breadboard) modules
    if (event.active.data.current?.type === 'existing') {
      // Ensure legsPattern is included
      const mod = event.active.data.current.mod;
      setDraggedModule({ ...mod, legsPattern: mod.legsPattern });
    } else if (event.active.data.current?.meta) {
      setDraggedModule(event.active.data.current.meta);
    } else {
      setDraggedModule(null);
    }
  };

  const handleDragEnd = async (event: any) => {
    setDraggedModule(null);
    setDragPreview(null);
    const { over, active } = event;
    if (!over || !active) return;
    const overId = over.id;

    // Handle delete by dropping on module browser
    if (overId === 'module-browser-dropzone' && active.data.current?.type === 'existing') {
      const deletedModuleId = active.data.current.modId;
      setModules(mods => mods.filter(m => m.id !== deletedModuleId));
      // Clean up cables connected to deleted module
      setCables(cables => cables.filter(cable => {
        const fromModuleId = cable.from.split(':')[0];
        const toModuleId = cable.to.split(':')[0];
        return fromModuleId !== deletedModuleId && toModuleId !== deletedModuleId;
      }));
      return;
    }

    // Handle moving existing module between breadboards or within breadboard
    if (overId?.startsWith('breadboard-svg-') && active.data.current?.type === 'existing' && dragPreview && dragPreview.valid) {
      const boardId = overId.replace('breadboard-svg-', '');
      const board = breadboards.find(b => b.id === boardId);
      const layout = board ? layouts[board.type] : null;
      const cellSize = 18;
      const margin = 2;
      
      // For existing modules, preserve their current height (already calculated)
      const existingModule = modules.find(m => m.id === active.data.current.modId);
      const height = existingModule ? existingModule.height : (() => {
        const numberOfRows = layout ? layout.length : 10;
        const scaledCellSize = cellSize * BREADBOARD_VERTICAL_SCALE;
        return numberOfRows * scaledCellSize + (numberOfRows - 1) * margin;
      })();
      
      setModules(mods => mods.map(m =>
        m.id === active.data.current.modId
          ? { ...m, breadboardId: boardId, x: dragPreview.x, height, legsPattern: m.legsPattern || "" }
          : m
      ));
      return;
    }

    // Handle adding new module from browser
    if (overId?.startsWith('breadboard-svg-') && active.data.current?.meta && dragPreview && dragPreview.valid) {
      const boardId = overId.replace('breadboard-svg-', '');
      const board = breadboards.find(b => b.id === boardId);
      const layout = board ? layouts[board.type] : null;
      const cellSize = 18;
      const margin = 2;
      
      // Load image dimensions to calculate proper aspect ratio
      const imagePath = `./modules/${active.data.current.meta.slug}/panel_large.png`;
      let height: number;
      
      try {
        const imageDimensions = await loadImageDimensions(imagePath);
        height = calculateModuleHeight(active.data.current.meta.unitsWidth || 5, cellSize, margin, imageDimensions.aspectRatio);
      } catch (error) {
        // Fallback to old calculation if image loading fails
        console.warn(`Failed to load image dimensions for ${active.data.current.meta.slug}:`, error);
        const numberOfRows = layout ? layout.length : 10;
        const scaledCellSize = cellSize * BREADBOARD_VERTICAL_SCALE;
        height = numberOfRows * scaledCellSize + (numberOfRows - 1) * margin;
      }
      
      setModules(mods => [
        ...mods,
        {
          id: uuidv4(),
          type: active.data.current.meta.slug,
          x: dragPreview.x,
          y: 0,
          width: active.data.current.meta.unitsWidth || 5,
          height,
          pcbImage: `./modules/${active.data.current.meta.slug}/panel.png`,
          pcbImageLarge: `./modules/${active.data.current.meta.slug}/panel_large.png`,
          pins: Array.isArray(active.data.current.meta.pins) ? active.data.current.meta.pins : [],
          knobs: Array.isArray(active.data.current.meta.knobs) ? active.data.current.meta.knobs.map((k: any) => ({ ...k, value: 0.5 })) : [],
          switches: Array.isArray(active.data.current.meta.switches) ? active.data.current.meta.switches.map((s: any) => ({ ...s, value: false })) : [],
          breadboardId: boardId,
          legsPattern: active.data.current.meta.legsPattern || "",
          inputs: Array.isArray(active.data.current.meta.inputs) ? active.data.current.meta.inputs : [],
          outputs: Array.isArray(active.data.current.meta.outputs) ? active.data.current.meta.outputs : []
        }
      ]);
      return;
    }
  };

  const handleDragOver = (event: any) => {
    const { over, active } = event;
    if (!over || !active) {
      setDragPreview(null);
      return;
    }
    const overId = over.id;
    if (!overId?.startsWith('breadboard-svg-')) {
      setDragPreview(null);
      return;
    }
    const boardId = overId.replace('breadboard-svg-', '');
    // Only update boardId in dragPreview if needed
    if (!dragPreview || dragPreview.boardId !== boardId) {
      setDragPreview((prev: any) => prev ? { ...prev, boardId } : { boardId });
    }
  };

  // Remove breadboard and its modules
  const handleRemoveBreadboard = (id: string) => {
    // Get IDs of modules on this breadboard before deleting them
    const deletedModuleIds = modules.filter(m => m.breadboardId === id).map(m => m.id);
    
    setBreadboards(b => b.filter(bb => bb.id !== id));
    setModules(mods => mods.filter(m => m.breadboardId !== id));
    
    // Clean up cables connected to deleted modules
    setCables(cables => cables.filter(cable => {
      const fromModuleId = cable.from.split(':')[0];
      const toModuleId = cable.to.split(':')[0];
      return !deletedModuleIds.includes(fromModuleId) && !deletedModuleIds.includes(toModuleId);
    }));
  };

  // Move breadboard up/down
  const handleMoveBreadboard = (id: string, direction: 'up' | 'down') => {
    setBreadboards(boards => {
      const currentIndex = boards.findIndex(b => b.id === id);
      if (currentIndex === -1) return boards;
      
      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      if (newIndex < 0 || newIndex >= boards.length) return boards;
      
      const newBoards = [...boards];
      [newBoards[currentIndex], newBoards[newIndex]] = [newBoards[newIndex], newBoards[currentIndex]];
      return newBoards;
    });
  };

  // Save patch as JSON
  const handleSavePatch = () => {
    const minimalModules = modules.map(m => ({
      id: m.id,
      type: m.type,
      x: m.x,
      y: m.y,
      width: m.width,
      height: m.height,
      breadboardId: m.breadboardId,
      knobValues: m.knobs.reduce((acc, k) => {
        acc[k.title || ''] = k.value;
        return acc;
      }, {} as Record<string, number>),
      switchValues: m.switches.reduce((acc, s) => {
        acc[s.title || ''] = s.value;
        return acc;
      }, {} as Record<string, boolean>)
    }));
    const data = {
      breadboards,
      modules: minimalModules,
      cables
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'micropatch.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // Load patch from JSON
  const handleLoadPatch = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt: ProgressEvent<FileReader>) => {
      try {
        const data: any = JSON.parse(evt.target?.result as string);
        if (data.breadboards && data.modules) {
          setBreadboards(data.breadboards);
          // For each module, fetch latest meta and merge knob values
          const loadedModules = await Promise.all(data.modules.map(async (mod: any) => {
            // Fetch latest meta.json for this module type
            const meta = await fetch(`./modules/${mod.type}/meta.json`).then(r => r.json());
            
            // Calculate height using image dimensions
            const cellSize = 18;
            const margin = 2;
            const imagePath = `./modules/${mod.type}/panel_large.png`;
            let height: number;
            
            try {
              const imageDimensions = await loadImageDimensions(imagePath);
              height = calculateModuleHeight(meta.unitsWidth || mod.width || 5, cellSize, margin, imageDimensions.aspectRatio);
            } catch (error) {
              // Fallback to saved height or calculate from breadboard
              console.warn(`Failed to load image dimensions for ${mod.type}:`, error);
              height = mod.height || (() => {
                // If no saved height, fallback to old calculation
                const numberOfRows = 10; // Default fallback
                const scaledCellSize = cellSize * BREADBOARD_VERTICAL_SCALE;
                return numberOfRows * scaledCellSize + (numberOfRows - 1) * margin;
              })();
            }
            
            // Merge knob values
            const knobs = Array.isArray(meta.knobs)
              ? meta.knobs.map((k: any) => ({
                  ...k,
                  value: (mod.knobValues && k.title && mod.knobValues[k.title] !== undefined)
                    ? mod.knobValues[k.title]
                    : 0.5
                }))
              : [];
            // Merge switch values
            const switches = Array.isArray(meta.switches)
              ? meta.switches.map((s: any) => ({
                  ...s,
                  value: (mod.switchValues && s.title && mod.switchValues[s.title] !== undefined)
                    ? mod.switchValues[s.title]
                    : false
                }))
              : [];
            return {
              id: mod.id,
              type: mod.type,
              x: mod.x,
              y: mod.y,
              width: mod.width,
              height,
              pcbImage: `./modules/${mod.type}/panel.png`,
              pcbImageLarge: `./modules/${mod.type}/panel_large.png`,
              pins: Array.isArray(meta.pins) ? meta.pins : [],
              knobs,
              switches,
              breadboardId: mod.breadboardId,
              legsPattern: meta.legsPattern || "",
              inputs: Array.isArray(meta.inputs) ? meta.inputs : [],
              outputs: Array.isArray(meta.outputs) ? meta.outputs : []
            };
          }));
          setModules(loadedModules);
          setCables(Array.isArray(data.cables) ? data.cables : []);
        }
      } catch (err) {
        alert('Invalid patch file.');
      }
    };
    reader.readAsText(file);
  };

  const handlePinClick = (toPinId: string, fromPinArg?: string | { pinId?: string }) => {
    // Always resolve fromPin to a string pinId
    let from: string | null = null;
    if (fromPinArg !== undefined) {
      if (isPinObj(fromPinArg)) {
        from = fromPinArg.pinId;
      } else if (typeof fromPinArg === 'string') {
        from = fromPinArg;
      }
    } else if (isPinObj(pendingCable.from)) {
      from = pendingCable.from.pinId;
    } else if (typeof pendingCable.from === 'string') {
      from = pendingCable.from;
    }
    const to = toPinId;
    
    // Log cable creation attempt with result
    if (!from || from === to) {
      logDebug('cableCreation', { from, to, result: 'cancelled', reason: !from ? 'no from pin' : 'same pin' });
      setPendingCable({ from: null });
      return;
    }
    
    // Use functional update to ensure we get the latest cables state
    setCables(currentCables => {
      const exists = currentCables.find(c =>
        (c.from === from && c.to === to) || (c.from === to && c.to === from)
      );
      
      // Debug: Log current cables and what we're trying to create (commented out to reduce noise)
      // console.log(`[handlePinClick] Creating cable from ${from} to ${to}`);
      // console.log(`[handlePinClick] Current cables:`, currentCables.map(c => ({ id: c.id, from: c.from, to: c.to })));
      // console.log(`[handlePinClick] Cable exists?`, exists);
      
      if (exists) {
        logDebug('cableCreation', { from, to, result: 'removed', reason: 'already exists' });
        return currentCables.filter(c => c !== exists);
      } else {
        logDebug('cableCreation', { from, to, result: 'created' });
        return [
          ...currentCables,
          {
            id: uuidv4(),
            from,
            to,
            color: `hsl(${Math.floor(Math.random()*360)},80%,60%)`
          }
        ];
      }
    });
    
    setPendingCable({ from: null });
  };

  const handlePinPointerDown = (pinId: string, event: React.PointerEvent) => {
    event.stopPropagation();
    if (event.button !== 0) return; // Only left button
    
    // Search for the pin across all breadboards
    let pin = null;
    if ((window as any)._allPinsByBreadboard) {
      for (const breadboardId of Object.keys((window as any)._allPinsByBreadboard)) {
        const pins = (window as any)._allPinsByBreadboard[breadboardId];
        pin = pins.find((p: any) => p.pinId === pinId);
        if (pin) break;
      }
    }
    
    // Debug: Log pin lookup information (commented out to reduce noise)
    // console.log(`[handlePinPointerDown] Looking for pinId: ${pinId}, found:`, pin);
    
    if (!pin) {
      logDebug('dragStart', { pinId, result: 'failed', reason: 'pin not found' });
      return;
    }
    
    // Check if this pin already has a cable connected
    const existingCable = cables.find(cable => cable.from === pinId || cable.to === pinId);
    
    if (existingCable) {
      // Remove the existing cable
      // console.log(`[handlePinPointerDown] Removing existing cable:`, existingCable);
      // console.log(`[handlePinPointerDown] Cables before removal:`, cables.map(c => ({ id: c.id, from: c.from, to: c.to })));
      setCables(cables => cables.filter(cable => cable.id !== existingCable.id));
      
      // Find the opposite end of the cable
      const oppositePin = existingCable.from === pinId ? existingCable.to : existingCable.from;
      
      // Find the opposite pin data
      let oppositePinData = null;
      if ((window as any)._allPinsByBreadboard) {
        for (const breadboardId of Object.keys((window as any)._allPinsByBreadboard)) {
          const pins = (window as any)._allPinsByBreadboard[breadboardId];
          oppositePinData = pins.find((p: any) => p.pinId === oppositePin);
          if (oppositePinData) break;
        }
      }
      
      // Start a new ghost cable from the opposite end
      if (oppositePinData) {
        // console.log(`[handlePinPointerDown] Removed cable, starting new ghost cable from opposite pin: ${oppositePin}`);
        logDebug('cableRemoved', { removedCableId: existingCable.id, newFromPin: oppositePin });
        setPendingCable({ from: oppositePinData, mouse: { x: event.clientX, y: event.clientY } });
      } else {
        // console.log(`[handlePinPointerDown] Could not find opposite pin data for: ${oppositePin}`);
        logDebug('cableRemoved', { removedCableId: existingCable.id, error: 'opposite pin not found' });
      }
    } else {
      // No existing cable - start new cable from this pin
      logDebug('dragStart', { pinId, result: 'started' });
      setPendingCable({ from: pin, mouse: { x: event.clientX, y: event.clientY } });
    }
    
    window.addEventListener('pointermove', handlePinPointerMove);
    window.addEventListener('pointerup', handlePinPointerUp);
  };

  const handlePinPointerMove = (event: PointerEvent) => {
    setPendingCable(prev => prev.from ? { ...prev, mouse: { x: event.clientX, y: event.clientY } } : prev);
    // Hit test for hovered pin - check all breadboards
    if ((window as any)._allPinsByBreadboard && pendingCableRef.current.from) {
      let minDist = 18, found = null;
      let mouseSvg = { x: event.clientX, y: event.clientY };
      
      // Check each breadboard for pins
      for (const breadboardId of Object.keys((window as any)._allPinsByBreadboard)) {
        const pins = (window as any)._allPinsByBreadboard[breadboardId];
        const svg = document.getElementById('svg-breadboard-svg-' + breadboardId) as SVGSVGElement | null;
        
        if (svg && typeof svg.createSVGPoint === 'function') {
          const pt = svg.createSVGPoint();
          pt.x = event.clientX;
          pt.y = event.clientY;
          const ctm = svg.getScreenCTM();
          if (ctm) {
            const svgP = pt.matrixTransform(ctm.inverse());
            mouseSvg = { x: svgP.x, y: svgP.y };
            
            // Check pins on this breadboard
            for (const pin of pins) {
              const dx = pin.x - mouseSvg.x;
              const dy = pin.y - mouseSvg.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              if (dist < minDist) {
                minDist = dist;
                found = pin;
              }
            }
          }
        }
      }
      
      const fromPin = pendingCableRef.current.from;
      let fromPinId: string | null = null;
      if (isPinObj(fromPin)) {
        fromPinId = fromPin.pinId;
      } else if (typeof fromPin === 'string') {
        fromPinId = fromPin;
      }
      if (found && isPinObj(found)) {
        if (found.pinId !== fromPinId) {
          setHoveredPinId(found.pinId);
        } else {
          setHoveredPinId(null);
        }
      } else {
        setHoveredPinId(null);
      }
    }
  };

  const handlePinPointerUp = (event: PointerEvent) => {
    if (pendingCableRef.current.from && (window as any)._allPinsByBreadboard) {
      let minDist = 18, found = null;
      let mouseSvg = { x: event.clientX, y: event.clientY };
      
      // Check each breadboard for pins
      for (const breadboardId of Object.keys((window as any)._allPinsByBreadboard)) {
        const pins = (window as any)._allPinsByBreadboard[breadboardId];
        const svg = document.getElementById('svg-breadboard-svg-' + breadboardId) as SVGSVGElement | null;
        
        if (svg && typeof svg.createSVGPoint === 'function') {
          const pt = svg.createSVGPoint();
          pt.x = event.clientX;
          pt.y = event.clientY;
          const ctm = svg.getScreenCTM();
          if (ctm) {
            const svgP = pt.matrixTransform(ctm.inverse());
            mouseSvg = { x: svgP.x, y: svgP.y };
            
            // Check pins on this breadboard
            for (const pin of pins) {
              const dx = pin.x - mouseSvg.x;
              const dy = pin.y - mouseSvg.y;
              const dist = Math.sqrt(dx*dx + dy*dy);
              if (dist < minDist) {
                minDist = dist;
                found = pin;
              }
            }
          }
        }
      }
      
      const fromPin = pendingCableRef.current.from;
      if (isPinObj(found)) {
        let fromPinId: string | null = null;
        if (isPinObj(fromPin)) {
          fromPinId = fromPin.pinId;
        } else if (typeof fromPin === 'string') {
          fromPinId = fromPin;
        }
        if (found.pinId !== fromPinId) {
          handlePinClick(found.pinId, fromPin);
        } else {
          logDebug('dragEnd', { result: 'cancelled', reason: 'same pin' });
        }
      } else {
        logDebug('dragEnd', { result: 'cancelled', reason: 'no target pin found' });
      }
    }
    setPendingCable({ from: null, mouse: null });
    setHoveredPinId(null);
    window.removeEventListener('pointermove', handlePinPointerMove);
    window.removeEventListener('pointerup', handlePinPointerUp);
  };

  // Download debug log as a file
  const handleDownloadDebugLog = () => {
    const log = (window._debugCableLog || []).join('\n');
    const blob = new Blob([log], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'debug-cable.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd} onDragOver={handleDragOver}>
      <div style={{ display: "flex", minHeight: "100vh", background: "#181818" }}>
        {/* Sidebar: Modules Browser */}
        <div style={{ width: 240, background: "#161616", borderRight: "1px solid #333", padding: 0, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }}>
          <ModuleBrowser onAddModule={addModule} />
          {debugMode && (
            <button onClick={handleDownloadDebugLog} style={{ margin: '12px 0', padding: '6px 12px', borderRadius: 6, background: '#333', color: '#fff', border: '1px solid #555' }}>
              Download Debug Log
            </button>
          )}
        </div>
        {/* Main: Breadboard rendering area */}
        <div style={{ flex: 1, padding: 24, position: 'relative' }}>
          {/* Render all breadboards as SVG */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: BREADBOARD_SPACING, position: 'relative', zIndex: 1 }}>
            {breadboards.map((board, boardIndex) => {
              const layout = layouts[board.type];
              if (!layout) return <div key={board.id} style={{ color: '#fff' }}>Loading breadboard...</div>;
              const isHovered = dragPreview && dragPreview.boardId === board.id;
              const cellSize = 18; // should match BreadboardSVG
              return (
                <div key={board.id} style={{ background: "#222", borderRadius: 12, padding: 12, position: 'relative', marginBottom: 8 }}>
                  {/* Move up button */}
                  <button
                    onClick={() => handleMoveBreadboard(board.id, 'up')}
                    disabled={boardIndex === 0}
                    style={{
                      position: 'absolute',
                      right: cellSize * 2.2,
                      top: 0,
                      width: cellSize,
                      height: cellSize,
                      borderRadius: 4,
                      border: 'none',
                      background: boardIndex === 0 ? '#222' : '#333',
                      color: boardIndex === 0 ? '#666' : '#aaf',
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: boardIndex === 0 ? 'not-allowed' : 'pointer',
                      zIndex: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0
                    }}
                    aria-label="Move breadboard up"
                    title="Move breadboard up"
                  >▲</button>
                  
                  {/* Move down button */}
                  <button
                    onClick={() => handleMoveBreadboard(board.id, 'down')}
                    disabled={boardIndex === breadboards.length - 1}
                    style={{
                      position: 'absolute',
                      right: cellSize * 1.1,
                      top: 0,
                      width: cellSize,
                      height: cellSize,
                      borderRadius: 4,
                      border: 'none',
                      background: boardIndex === breadboards.length - 1 ? '#222' : '#333',
                      color: boardIndex === breadboards.length - 1 ? '#666' : '#aaf',
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: boardIndex === breadboards.length - 1 ? 'not-allowed' : 'pointer',
                      zIndex: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0
                    }}
                    aria-label="Move breadboard down"
                    title="Move breadboard down"
                  >▼</button>
                  
                  {/* Remove breadboard X button */}
                  <button
                    onClick={() => {
                      if (window.confirm("Are you sure you want to delete this breadboard?")) {
                        handleRemoveBreadboard(board.id);
                      }
                    }}
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      width: cellSize,
                      height: cellSize,
                      borderRadius: 4,
                      border: 'none',
                      background: '#333',
                      color: '#faa',
                      fontWeight: 700,
                      fontSize: 18,
                      cursor: 'pointer',
                      zIndex: 20,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0
                    }}
                    aria-label="Remove breadboard"
                    title="Remove breadboard"
                  >✖</button>
                  <BreadboardSVG
                    layout={layout}
                    cellSize={cellSize}
                    margin={2}
                    modules={modules.filter(m => m.breadboardId === board.id)}
                    onKnobChange={handleKnobChange}
                    onSwitchChange={handleSwitchChange}
                    onKnobHover={handleKnobHover}
                    onSwitchHover={handleSwitchHover}
                    onElementHoverEnd={handleElementHoverEnd}
                    dndId={`breadboard-svg-${board.id}`}
                    dragPreview={isHovered ? dragPreview : undefined}
                    mouseClientX={isHovered ? mouseClientX : undefined}
                    mouseClientY={isHovered ? mouseClientY : undefined}
                    mouseSvgX={isHovered ? mouseSvgX : undefined}
                    mouseSvgY={isHovered ? mouseSvgY : undefined}
                    mouseRelX={isHovered ? mouseRelX : undefined}
                    mouseRelXClamped={isHovered ? mouseRelXClamped : undefined}
                    mouseCol={isHovered ? mouseCol : undefined}
                    cables={[]} // Cables now rendered globally
                    pendingCable={pendingCable}
                    onPinClick={handlePinClick}
                    onPinPointerDown={handlePinPointerDown}
                    hoveredPinId={hoveredPinId}
                    setHoveredPinId={setHoveredPinId}
                    breadboardId={board.id}
                    onModuleHover={(moduleId: string, coords: {x: number, y: number} | null) => {
                      if (coords) {
                        setHoveredModuleCoords({ moduleId, x: coords.x, y: coords.y });
                      } else {
                        setHoveredModuleCoords(null);
                      }
                    }}
                  />
                </div>
              );
            })}
          </div>
          {/* Debug overlay - yellow squares showing calculated breadboard positions */}
          {debugMode && (
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none',
              zIndex: 15
            }}>
              {Object.entries(debugBreadboardRects).map(([boardId, rect]) => (
                <div
                  key={`debug-${boardId}`}
                  style={{
                    position: 'absolute',
                    left: rect.left,
                    top: rect.top,
                    width: rect.right - rect.left,
                    height: rect.bottom - rect.top,
                    border: '2px solid yellow',
                    background: 'rgba(255, 255, 0, 0.1)',
                    pointerEvents: 'none'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    top: -20,
                    left: 0,
                    color: 'yellow',
                    fontSize: 12,
                    fontWeight: 'bold',
                    textShadow: '1px 1px 2px black'
                  }}>
                    {boardId.slice(-8)}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Global cable layer for inter-breadboard cables - above breadboards */}
          <GlobalCableLayer
            cables={cables}
            modules={modules}
            breadboards={breadboards}
            layouts={layouts}
            pendingCable={pendingCable}
          />
        </div>
        {/* Right sidebar: Breadboard controls */}
        <div style={{ width: 280, background: "#161616", borderLeft: "1px solid #333", padding: 16, display: "flex", flexDirection: "column", gap: 12, position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <b style={{ color: "#fff", fontSize: 16 }}>Breadboard Controls</b>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ color: "#ccc", fontSize: 14 }}>Breadboard Type:</label>
              <select value={selectedType} onChange={e => setSelectedType(e.target.value)} style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #555", background: "#222", color: "#fff" }}>
                {BREADBOARD_TYPES.map(b =>
                  <option key={b.id} value={b.id}>{b.name}</option>
                )}
              </select>
            </div>
            
            <button onClick={addBreadboard} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #4fa", background: "#1a3a2a", color: "#4fa", fontWeight: 500 }}>+ Add Breadboard</button>
          </div>
          
          <hr style={{ border: "none", borderTop: "1px solid #333", margin: "8px 0" }} />
          
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <b style={{ color: "#fff", fontSize: 16 }}>Patch Management</b>
            <button onClick={handleSavePatch} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #fa4", background: "#3a2a1a", color: "#fa4", fontWeight: 500 }}>💾 Save Patch</button>
            <button onClick={() => fileInputRef.current?.click()} style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #4af", background: "#1a2a3a", color: "#4af", fontWeight: 500 }}>📁 Load Patch</button>
            <input ref={fileInputRef} type="file" accept="application/json" style={{ display: 'none' }} onChange={handleLoadPatch} />
          </div>
          
          <hr style={{ border: "none", borderTop: "1px solid #333", margin: "8px 0" }} />
          
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <b style={{ color: "#fff", fontSize: 16 }}>Debug Info</b>
              <button 
                onClick={() => setDebugMode(!debugMode)}
                style={{ 
                  padding: "4px 8px", 
                  borderRadius: 4, 
                  border: "1px solid #555", 
                  background: debugMode ? "#3a3a1a" : "#222", 
                  color: debugMode ? "#ff4" : "#ccc",
                  fontSize: 12,
                  cursor: "pointer"
                }}
              >
                {debugMode ? 'ON' : 'OFF'}
              </button>
            </div>
            
            {/* Hovered Element Details - Always visible */}
            {(() => {
              // Check if we're hovering over a pin
              if (hoveredPinId) {
                // Parse pin ID to get module and pin info
                const pinParts = hoveredPinId.split(':');
                if (pinParts.length >= 4) {
                  const moduleId = pinParts[0];
                  const pinType = pinParts[1];
                  const ioIndex = parseInt(pinParts[2], 10);
                  const pinIndex = parseInt(pinParts[3], 10);
                  
                  const module = modules.find(m => m.id === moduleId);
                  if (module) {
                    const pinGroup = pinType === 'input' ? module.inputs[ioIndex] : module.outputs[ioIndex];
                    if (pinGroup) {
                      return (
                        <div style={{ background: "#111", padding: 8, borderRadius: 4, fontSize: 12, fontFamily: "monospace" }}>
                          <div style={{ color: "#ff4", marginBottom: 4, fontSize: 13, fontWeight: "bold" }}>Hovered Pin</div>
                          <div style={{ color: pinType === 'input' ? "#f44" : "#44f", fontSize: 11 }}>
                            <div>Type: {pinType.toUpperCase()}</div>
                            <div>Title: {pinGroup.title || 'Untitled'}</div>
                            <div>Description: {pinGroup.description || 'No description'}</div>
                            <div>Group #{ioIndex}, Pin #{pinIndex}</div>
                          </div>
                        </div>
                      );
                    }
                  }
                }
              }
              
              // Check if we're hovering over a knob
              if (hoveredKnobId) {
                const [moduleId, knobTitle] = hoveredKnobId.split(':');
                const module = modules.find(m => m.id === moduleId);
                if (module) {
                  const knob = module.knobs.find(k => k.title === knobTitle);
                  if (knob) {
                    return (
                      <div style={{ background: "#111", padding: 8, borderRadius: 4, fontSize: 12, fontFamily: "monospace" }}>
                        <div style={{ color: "#ff4", marginBottom: 4, fontSize: 13, fontWeight: "bold" }}>Hovered Knob</div>
                        <div style={{ color: "#fa4", fontSize: 11 }}>
                          <div>Title: {knob.title || 'Untitled'}</div>
                          <div>Description: {knob.description || 'No description'}</div>
                          <div>Value: {(knob.value * 100).toFixed(1)}%</div>
                        </div>
                      </div>
                    );
                  }
                }
              }
              
              // Check if we're hovering over a switch
              if (hoveredSwitchId) {
                const [moduleId, switchTitle] = hoveredSwitchId.split(':');
                const module = modules.find(m => m.id === moduleId);
                if (module) {
                  const switchItem = module.switches.find(s => s.title === switchTitle);
                  if (switchItem) {
                    return (
                      <div style={{ background: "#111", padding: 8, borderRadius: 4, fontSize: 12, fontFamily: "monospace" }}>
                        <div style={{ color: "#ff4", marginBottom: 4, fontSize: 13, fontWeight: "bold" }}>Hovered Switch</div>
                        <div style={{ color: "#4f4", fontSize: 11 }}>
                          <div>Title: {switchItem.title || 'Untitled'}</div>
                          <div>Description: {switchItem.description || 'No description'}</div>
                          <div>Value: {switchItem.value ? 'ON' : 'OFF'}</div>
                        </div>
                      </div>
                    );
                  }
                }
              }
              
              // Show module summary when hovering over module but not over specific elements
              if (hoveredModuleCoords && !hoveredPinId && !hoveredKnobId && !hoveredSwitchId) {
                const hoveredModule = modules.find(m => m.id === hoveredModuleCoords.moduleId);
                if (hoveredModule) {
                  return (
                    <div style={{ background: "#111", padding: 8, borderRadius: 4, fontSize: 12, fontFamily: "monospace" }}>
                      <div style={{ color: "#ff4", marginBottom: 4, fontSize: 13, fontWeight: "bold" }}>Module: {hoveredModule.type}</div>
                      <div style={{ color: "#ccc", fontSize: 11 }}>
                        <div>Knobs: {hoveredModule.knobs.length}</div>
                        <div>Switches: {hoveredModule.switches.length}</div>
                        <div>Inputs: {hoveredModule.inputs.length}</div>
                        <div>Outputs: {hoveredModule.outputs.length}</div>
                      </div>
                    </div>
                  );
                }
              }
              
              return null;
            })()}
            
            {/* Debug-only sections */}
            {debugMode && (
              <>
                <div style={{ background: "#111", padding: 8, borderRadius: 4, fontSize: 12, fontFamily: "monospace" }}>
                  <div style={{ color: "#4af", marginBottom: 4 }}>Mouse (container-relative):</div>
                  <div style={{ color: "#ccc" }}>
                    {debugMousePos ? `x: ${debugMousePos.x.toFixed(0)}, y: ${debugMousePos.y.toFixed(0)}` : 'Move mouse in app area'}
                  </div>
                </div>
                
                <div style={{ background: "#111", padding: 8, borderRadius: 4, fontSize: 12, fontFamily: "monospace" }}>
                  <div style={{ color: "#f84", marginBottom: 4 }}>Module Hover (for meta.json):</div>
                  {hoveredModuleCoords ? (
                    <div style={{ color: "#ccc" }}>
                      <div style={{ color: "#f84", fontSize: 11 }}>{hoveredModuleCoords.moduleId.slice(-4)}:</div>
                      <div>x: {hoveredModuleCoords.x.toFixed(3)}</div>
                      <div>y: {hoveredModuleCoords.y.toFixed(3)}</div>
                    </div>
                  ) : (
                    <div style={{ color: "#666" }}>Hover over a module</div>
                  )}
                </div>
              </>
            )}
            
            {debugMode && (
              <>
                <div style={{ background: "#111", padding: 8, borderRadius: 4, fontSize: 12, fontFamily: "monospace" }}>
                  <div style={{ color: "#4f4", marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span>Hovered Pin:</span>
                <div style={{ 
                  padding: "2px 6px", 
                  borderRadius: 3, 
                  border: "1px solid #555", 
                  background: hoveredPinId ? "#2a4a2a" : "#222", 
                  color: hoveredPinId ? "#4f4" : "#666",
                  fontSize: 10
                }}>
                  Press R
                </div>
              </div>
              {hoveredPinId ? (() => {
                // Get calculated coordinates for the hovered pin
                let pinCoords = "N/A";
                let pinInfo = "";
                
                if ((window as any)._allPinsByBreadboard) {
                  for (const boardId of Object.keys((window as any)._allPinsByBreadboard)) {
                    const pins = (window as any)._allPinsByBreadboard[boardId];
                    
                    const svgElement = document.getElementById(`svg-breadboard-svg-${boardId}`);
                    const appContainer = document.querySelector('[style*="display: flex"][style*="height: 100vh"]') as HTMLElement;
                    
                    if (svgElement && appContainer) {
                      const svgRect = svgElement.getBoundingClientRect();
                      const appRect = appContainer.getBoundingClientRect();
                      const offsetX = svgRect.left - appRect.left;
                      const offsetY = svgRect.top - appRect.top;
                      
                      for (const pin of pins) {
                        if (pin.pinId === hoveredPinId) {
                          pinCoords = `(${(pin.x * BREADBOARD_DISPLAY_SCALE + offsetX).toFixed(0)}, ${(pin.y * BREADBOARD_DISPLAY_SCALE + offsetY).toFixed(0)})`;
                          const parts = pin.pinId.split(':');
                          if (parts.length >= 4) {
                            pinInfo = `${parts[0].slice(-4)}.${parts[1].slice(0,3)}.${parts[2]}.${parts[3]}`;
                          }
                          break;
                        }
                      }
                    }
                    
                    if (pinCoords !== "N/A") break;
                  }
                }
                
                return (
                  <div>
                    <div style={{ color: "#ccc" }}>Calc: {pinCoords}</div>
                    <div style={{ color: "#999", fontSize: 10 }}>{pinInfo}</div>
                  </div>
                );
              })() : (
                <div style={{ color: "#666" }}>Hover over a pin</div>
              )}
            </div>
            
            <div style={{ background: "#111", padding: 8, borderRadius: 4, fontSize: 12, fontFamily: "monospace" }}>
              <div style={{ color: "#ff4", marginBottom: 4, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span>Recorded Pins ({Object.keys(recordedPins).length}):</span>
                <div style={{ display: "flex", gap: 4 }}>
                  <button 
                    onClick={() => {
                      const data = JSON.stringify(recordedPins, null, 2);
                      navigator.clipboard.writeText(data).then(() => {
                        alert('Copied to clipboard!');
                      }).catch(() => {
                        console.log('Debug data:', data);
                        alert('Check console for data');
                      });
                    }}
                    disabled={Object.keys(recordedPins).length === 0}
                    style={{ 
                      padding: "2px 6px", 
                      borderRadius: 3, 
                      border: "1px solid #555", 
                      background: Object.keys(recordedPins).length > 0 ? "#4a4a2a" : "#222", 
                      color: Object.keys(recordedPins).length > 0 ? "#ff4" : "#666",
                      fontSize: 10,
                      cursor: Object.keys(recordedPins).length > 0 ? "pointer" : "not-allowed"
                    }}
                  >
                    Copy
                  </button>
                  <button 
                    onClick={() => setRecordedPins({})}
                    disabled={Object.keys(recordedPins).length === 0}
                    style={{ 
                      padding: "2px 6px", 
                      borderRadius: 3, 
                      border: "1px solid #555", 
                      background: Object.keys(recordedPins).length > 0 ? "#4a2a2a" : "#222", 
                      color: Object.keys(recordedPins).length > 0 ? "#f44" : "#666",
                      fontSize: 10,
                      cursor: Object.keys(recordedPins).length > 0 ? "pointer" : "not-allowed"
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
              {Object.keys(recordedPins).length === 0 ? (
                <div style={{ color: "#666", fontSize: 10 }}>Hover over pin and press R key to record</div>
              ) : (
                <div style={{ maxHeight: 150, overflowY: "auto" }}>
                  {Object.entries(recordedPins).map(([pinId, data]) => (
                    <div key={pinId} style={{ color: "#ccc", marginBottom: 2, fontSize: 10 }}>
                      <div style={{ color: "#ff4" }}>{data.info}:</div>
                      <div>Mouse: ({data.mouse.x}, {data.mouse.y})</div>
                      <div>Calc: ({data.calc.x.toFixed(0)}, {data.calc.y.toFixed(0)})</div>
                      <div style={{ color: "#f44" }}>Diff: ({(data.calc.x - data.mouse.x).toFixed(0)}, {(data.calc.y - data.mouse.y).toFixed(0)})</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div style={{ background: "#111", padding: 8, borderRadius: 4, fontSize: 12, fontFamily: "monospace" }}>
              <div style={{ color: "#fa4", marginBottom: 4 }}>Breadboard Rectangles:</div>
              {breadboards.map(board => {
                const rect = debugBreadboardRects[board.id];
                return (
                  <div key={board.id} style={{ color: "#ccc", marginBottom: 2 }}>
                    <div style={{ color: "#4fa" }}>{board.id.slice(-8)}:</div>
                    {rect ? (
                      <div>
                        TL: ({rect.left.toFixed(0)}, {rect.top.toFixed(0)})<br/>
                        BR: ({rect.right.toFixed(0)}, {rect.bottom.toFixed(0)})
                      </div>
                    ) : 'Not found'}
                  </div>
                );
              })}
            </div>
            
            <div style={{ background: "#111", padding: 8, borderRadius: 4, fontSize: 12, fontFamily: "monospace" }}>
              <div style={{ color: "#f4a", marginBottom: 4 }}>Cable Endpoints:</div>
              {cables.length === 0 ? (
                <div style={{ color: "#666" }}>No cables</div>
              ) : (
                cables.map((cable, index) => {
                  // Parse cable pinIds to get module and pin info
                  const parsePinId = (pinId: string) => {
                    const parts = pinId.split(':');
                    if (parts.length >= 4) {
                      return {
                        moduleId: parts[0],
                        pinType: parts[1] as "input" | "output",
                        ioIndex: parseInt(parts[2], 10),
                        pinIndex: parseInt(parts[3], 10),
                      };
                    }
                    return null;
                  };
                  
                  const fromEndpoint = parsePinId(cable.from);
                  const toEndpoint = parsePinId(cable.to);
                  
                  // Get calculated coordinates from GlobalCableLayer's allPinPositions
                  // We need to access the same calculation logic
                  let fromCoords = "N/A";
                  let toCoords = "N/A";
                  
                  // Try to get coordinates from the global pin positions stored by breadboards
                  if ((window as any)._allPinsByBreadboard && fromEndpoint && toEndpoint) {
                    // Find the pin in the global pins data
                    for (const boardId of Object.keys((window as any)._allPinsByBreadboard)) {
                      const pins = (window as any)._allPinsByBreadboard[boardId];
                      
                      // Transform coordinates like GlobalCableLayer does
                      const svgElement = document.getElementById(`svg-breadboard-svg-${boardId}`);
                      const mainContainer = document.querySelector('[style*="flex: 1"][style*="padding: 24"]') as HTMLElement;
                      
                      if (svgElement && mainContainer) {
                        const svgRect = svgElement.getBoundingClientRect();
                        const containerRect = mainContainer.getBoundingClientRect();
                        const offsetX = svgRect.left - containerRect.left;
                        const offsetY = svgRect.top - containerRect.top;
                        
                        for (const pin of pins) {
                          if (pin.pinId === cable.from) {
                            fromCoords = `(${(pin.x * BREADBOARD_DISPLAY_SCALE + offsetX).toFixed(0)}, ${(pin.y * BREADBOARD_DISPLAY_SCALE + offsetY).toFixed(0)})`;
                          }
                          if (pin.pinId === cable.to) {
                            toCoords = `(${(pin.x * BREADBOARD_DISPLAY_SCALE + offsetX).toFixed(0)}, ${(pin.y * BREADBOARD_DISPLAY_SCALE + offsetY).toFixed(0)})`;
                          }
                        }
                      }
                    }
                  }
                  
                  return (
                    <div key={cable.id} style={{ color: "#ccc", marginBottom: 4, borderLeft: `3px solid ${cable.color}`, paddingLeft: 6 }}>
                      <div style={{ color: "#4fa", fontSize: 11 }}>Cable {index + 1}:</div>
                      <div style={{ fontSize: 10 }}>
                        From: {fromCoords}<br/>
                        To: {toCoords}
                      </div>
                      <div style={{ fontSize: 9, color: "#666" }}>
                        {fromEndpoint?.moduleId?.slice(-4)}.{fromEndpoint?.pinType?.slice(0,3)}.{fromEndpoint?.ioIndex}.{fromEndpoint?.pinIndex} → {toEndpoint?.moduleId?.slice(-4)}.{toEndpoint?.pinType?.slice(0,3)}.{toEndpoint?.ioIndex}.{toEndpoint?.pinIndex}
                      </div>
                    </div>
                  );
                })
              )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <DragOverlay>
        {/* Optionally render a preview of the dragged module */}
      </DragOverlay>
    </DndContext>
  );
}
