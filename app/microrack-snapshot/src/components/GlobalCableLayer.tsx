import React, { useEffect, useState } from 'react';
import { calculateModulePinPositions } from '../utils/pinPositioning';
import { BREADBOARD_GRID_PADDING, BREADBOARD_SPACING, BREADBOARD_DISPLAY_SCALE } from '../breadboardConfig';
import type { ModuleInstance } from './BreadboardSVG';

interface GlobalCableLayerProps {
  cables: Array<{
    id: string;
    from: string;
    to: string;
    color: string;
  }>;
  modules: ModuleInstance[];
  breadboards: Array<{ id: string; type: string }>;
  layouts: Record<string, string[]>;
  pendingCable?: any;
}

export default function GlobalCableLayer({ 
  cables, 
  modules, 
  breadboards, 
  layouts, 
  pendingCable 
}: GlobalCableLayerProps) {
  const [allPinPositions, setAllPinPositions] = useState<Record<string, any>>({});
  
  // Use the existing pin data from breadboards and transform coordinates
  useEffect(() => {
    const updatePinPositions = () => {
      const newPinPositions: Record<string, any> = {};
      
      // Get pin data from existing breadboard calculations
      breadboards.forEach((board) => {
        const svgElement = document.getElementById(`svg-breadboard-svg-${board.id}`);
        const mainContainer = document.querySelector('[style*="flex: 1"][style*="padding: 24"]') as HTMLElement;
        
        if (svgElement && mainContainer && (window as any)._allPinsByBreadboard?.[board.id]) {
          const svgRect = svgElement.getBoundingClientRect();
          const containerRect = mainContainer.getBoundingClientRect();
          
          // Calculate position relative to main container (accounts for scroll)
          const offsetX = svgRect.left - containerRect.left;
          const offsetY = svgRect.top - containerRect.top;
          
          // Transform pin positions from breadboard-local to global coordinates
          const boardPins = (window as any)._allPinsByBreadboard[board.id];
          
          boardPins.forEach((pin: any) => {
            const moduleId = pin.moduleId;
            if (!newPinPositions[moduleId]) {
              newPinPositions[moduleId] = { input: [], output: [] };
            }
            
            // Ensure arrays exist for the pin's ioIndex
            while (newPinPositions[moduleId][pin.pinType].length <= pin.ioIndex) {
              newPinPositions[moduleId][pin.pinType].push([]);
            }
            
            // Add the pin with global coordinates, scaled to match SVG display scale
            newPinPositions[moduleId][pin.pinType][pin.ioIndex][pin.pinIndex] = {
              x: pin.x * BREADBOARD_DISPLAY_SCALE + offsetX,
              y: pin.y * BREADBOARD_DISPLAY_SCALE + offsetY,
              pinId: pin.pinId
            };
          });
        }
      });
      
      setAllPinPositions(newPinPositions);
    };
    
    // Update pin positions with a delay to ensure DOM is ready
    const timeoutId = setTimeout(updatePinPositions, 100);
    
    return () => clearTimeout(timeoutId);
  }, [breadboards, modules, layouts]);
  
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

  const createParabolicPath = (fromPos: any, toPos: any) => {
    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Calculate 45-degree approach distance for both ends
    const approachDistance = Math.min(distance * 0.3, 80); // 30% of total distance, max 80px
    
    // For 45-degree angles: horizontal and vertical offsets should be equal
    const angle45Offset = approachDistance * 0.707; // cos(45°) = sin(45°) ≈ 0.707
    
    // Detect connection type
    const isHorizontal = Math.abs(dy) < Math.abs(dx) * 0.3;
    
    let c1, c2;
    
    if (isHorizontal && Math.abs(dx) > 80) {
      // Horizontal connections: 45-degree approach from both ends with parabolic droop
      const parabolicOffset = Math.max(Math.abs(dx) * 0.3, 80);
      
      // 45-degree approach from start pin
      c1 = { 
        x: fromPos.x + Math.sign(dx) * angle45Offset, 
        y: fromPos.y + angle45Offset + parabolicOffset * 0.3
      };
      
      // 45-degree approach to end pin
      c2 = { 
        x: toPos.x - Math.sign(dx) * angle45Offset, 
        y: toPos.y + angle45Offset + parabolicOffset * 0.3
      };
    } else {
      // Vertical or short connections: ensure 45-degree approaches with curve
      const bendFactor = Math.max(distance * 0.4, 60);
      
      // 45-degree approach from start pin
      const fromDirection = dx >= 0 ? 1 : -1;
      c1 = { 
        x: fromPos.x + fromDirection * angle45Offset, 
        y: fromPos.y + angle45Offset + bendFactor * 0.4
      };
      
      // 45-degree approach to end pin  
      const toDirection = dx >= 0 ? -1 : 1;
      c2 = { 
        x: toPos.x + toDirection * angle45Offset, 
        y: toPos.y + angle45Offset + bendFactor * 0.4
      };
    }
    
    return `M ${fromPos.x} ${fromPos.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${toPos.x} ${toPos.y}`;
  };

  const renderCable = (from: any, to: any, color: string, id: string) => {
    const fromPos = allPinPositions[from.moduleId]?.[from.pinType]?.[from.ioIndex]?.[from.pinIndex];
    const toPos = allPinPositions[to.moduleId]?.[to.pinType]?.[to.ioIndex]?.[to.pinIndex];
    
    if (!fromPos || !toPos) {
      return null;
    }
    
    const path = createParabolicPath(fromPos, toPos);
    
    return (
      <g key={id}>
        {/* Semi-transparent black outline */}
        <path
          d={path}
          stroke="rgba(0, 0, 0, 0.4)"
          strokeWidth={8.4}
          fill="none"
          style={{ pointerEvents: 'none' }}
        />
        {/* Transparent main cable */}
        <path
          d={path}
          stroke={color}
          strokeWidth={5}
          strokeOpacity={0.6}
          fill="none"
          style={{ pointerEvents: 'none' }}
        />
      </g>
    );
  };

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 10,
      overflow: 'visible'
    }}>
      <svg
        width="100%"
        height="100%"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'none'
        }}
      >
        {/* Render all cables */}
        {cables.map(cable => {
          const fromEndpoint = parsePinId(cable.from);
          const toEndpoint = parsePinId(cable.to);
          
          if (!fromEndpoint || !toEndpoint) {
            return null;
          }
          
          return renderCable(fromEndpoint, toEndpoint, cable.color, cable.id);
        })}
        
        {/* Render ghost cable during dragging */}
        {pendingCable?.from && pendingCable?.mouse && (() => {
          const from = pendingCable.from;
          const fromPos = allPinPositions[from.moduleId]?.[from.pinType]?.[from.ioIndex]?.[from.pinIndex];
          
          if (!fromPos) return null;
          
          // Convert mouse coordinates to container-relative coordinates
          const mainContainer = document.querySelector('[style*="flex: 1"][style*="padding: 24"]') as HTMLElement;
          let mouseSvg = { x: pendingCable.mouse.x, y: pendingCable.mouse.y };
          
          if (mainContainer) {
            const containerRect = mainContainer.getBoundingClientRect();
            mouseSvg = {
              x: pendingCable.mouse.x - containerRect.left,
              y: pendingCable.mouse.y - containerRect.top
            };
          }
          
          // Create parabolic curve for ghost cable
          const path = createParabolicPath(fromPos, mouseSvg);
          
          return (
            <g>
              {/* Ghost cable semi-transparent outline */}
              <path
                d={path}
                stroke="rgba(0, 0, 0, 0.3)"
                strokeWidth={9.6}
                fill="none"
                style={{ 
                  strokeDasharray: '10 8', 
                  pointerEvents: 'none' 
                }}
              />
              {/* Ghost cable transparent main */}
              <path
                d={path}
                stroke="#ff2fd6"
                strokeWidth={6}
                fill="none"
                style={{ 
                  strokeDasharray: '10 8', 
                  opacity: 0.6, 
                  pointerEvents: 'none' 
                }}
              />
            </g>
          );
        })()}
      </svg>
    </div>
  );
}