import React, { useState } from "react";
import ModulePin from "./ModulePin";
import ModuleKnob from "./ModuleKnob";
import ModuleSwitch from "./ModuleSwitch";
import { generateHorizontalPins } from "../utils/pinPositioning";


export interface PinDef {
  id: string;
  type: "input" | "output";
  label: string;
  x?: number;
  y?: number;
  pinId?: string;
}

export interface KnobDef {
  id: string;
  label?: string;
  title?: string;
  value: number; // 0-1
  angle?: number; // degrees, for rendering
  x?: number;
  y?: number;
}

export interface SwitchDef {
  id: string;
  label?: string;
  title?: string;
  value: boolean; // true/false
  x?: number;
  y?: number;
}

export interface ModuleSVGProps {
  moduleId?: string;
  width: number; // in px, how many pins wide
  height: number; // in px
  pcbImage: string; // fallback image url
  pcbImageLarge?: string; // preferred large image url
  pins: PinDef[];
  knobs: KnobDef[];
  switches: SwitchDef[];
  onKnobChange?: (moduleId: string, id: string, value: number) => void;
  onSwitchChange?: (moduleId: string, id: string, value: boolean) => void;
  onKnobHover?: (moduleId: string, knobTitle: string) => void;
  onSwitchHover?: (moduleId: string, switchTitle: string) => void;
  onElementHoverEnd?: () => void;
  inputs?: any[];
  outputs?: any[];
  hoveredPinId?: string | null;
  setHoveredPinId?: (id: string | null) => void;
}

export default function ModuleSVG({
  moduleId,
  width,
  height,
  pcbImage,
  pcbImageLarge,
  pins = [],
  knobs = [],
  switches = [],
  onKnobChange,
  onSwitchChange,
  onKnobHover,
  onSwitchHover,
  onElementHoverEnd,
  inputs = [],
  outputs = [],
  onPinClick,
  onPinPointerDown,
  pendingCable,
  hoveredPinId,
  setHoveredPinId
}: ModuleSVGProps & { onPinClick?: any; onPinPointerDown?: any; pendingCable?: any; hoveredPinId?: string | null; setHoveredPinId?: (id: string | null) => void }) {
  const [imgSrc, setImgSrc] = useState(pcbImageLarge || pcbImage);
  const pinRadius = 6;
  const knobRadius = 24;
  const pinY = 18;
  const knobY = height / 2;

  // Distribute pins along the top edge
  const pinPositions = pins.map((pin, i) => ({
    ...pin,
    x: pin.x !== undefined ? pin.x * width : ((i + 1) * width) / (pins.length + 1),
    y: pin.y !== undefined ? pin.y * height : pinY,
    pinId: pin.pinId || `${moduleId}:auto:${pin.type || 'input'}:${i}:0`,
  }));

  // Distribute knobs along the center
  const knobPositions = knobs.map((knob, i) => ({
    ...knob,
    label: knob.label || knob.title,
    x: knob.x !== undefined ? knob.x * width : ((i + 1) * width) / (knobs.length + 1),
    y: knob.y !== undefined ? knob.y * height : knobY,
  }));

  const handleKnobChange = (id: string, newValue: number) => {
    if (onKnobChange && moduleId) onKnobChange(moduleId, id, Math.max(0, Math.min(1, newValue)));
  };

  // Distribute switches
  const switchPositions = switches.map((switchDef, i) => ({
    ...switchDef,
    label: switchDef.label || switchDef.title,
    x: switchDef.x !== undefined ? switchDef.x * width : ((i + 1) * width) / (switches.length + 1),
    y: switchDef.y !== undefined ? switchDef.y * height : knobY + 60, // Below knobs
  }));

  // Debug: Log switch information
  // if (switches.length > 0) {
  //   console.log(`[ModuleSVG] Module ${moduleId} has ${switches.length} switches:`, switches);
  //   console.log(`[ModuleSVG] Switch positions:`, switchPositions);
  // }

  const handleSwitchChange = (id: string, newValue: boolean) => {
    if (onSwitchChange && moduleId) onSwitchChange(moduleId, id, newValue);
  };

  // --- Auto-place input pins if missing coordinates ---
  const autoInputPins = (!inputs.length || (inputs.every(input => !input.pins || !input.pins.length)))
    ? generateHorizontalPins(inputs.length || 1, 0.12).map((pin, i) => ({
        ...pin,
        pinId: `${moduleId}:input:${i}:0`
      }))
    : null;

  // --- Auto-place output pins if missing coordinates ---
  const autoOutputPins = (!outputs.length || (outputs.every(output => !output.pins || !output.pins.length)))
    ? generateHorizontalPins(outputs.length || 1, 0.88).map((pin, i) => ({
        ...pin,
        pinId: `${moduleId}:output:${i}:0`
      }))
    : null;

  return (
    <g>
      {/* PCB image, scaled to fit */}
      <image
        href={imgSrc}
        x={0}
        y={0}
        width={width}
        height={height}
        preserveAspectRatio="xMidYMid meet"
        style={{ pointerEvents: "none" }}
        onError={() => setImgSrc(pcbImage)}
      />
      {/* Input pins (red) */}
      {autoInputPins
        ? autoInputPins.map((pin, i) => (
            <g key={`auto-input-${i}`}>
              <ModulePin
                x={pin.x * width}
                y={pin.y * height}
                color={hoveredPinId === pin.pinId ? "#ff2fd6" : "#f44"}
                type="input"
                label={inputs[i]?.label || inputs[i]?.title || `In${i+1}`}
                pinId={pin.pinId}
                isHovered={hoveredPinId === pin.pinId}
                onClick={() => onPinClick && onPinClick(pin.pinId)}
                onPointerDown={onPinPointerDown ? (e: React.PointerEvent) => onPinPointerDown(pin.pinId, e) : undefined}
                onMouseEnter={() => !pendingCable?.from && setHoveredPinId && setHoveredPinId(pin.pinId)}
                onMouseLeave={() => !pendingCable?.from && setHoveredPinId && setHoveredPinId(null)}
              />
              {/* Debug overlay removed */}
            </g>
          ))
        : Array.isArray(inputs) && inputs.map((input, i) =>
            (input.pins || []).map((pin: any, j: number) => {
              const pinId = pin.pinId || `${moduleId}:input:${i}:${j}`;
              return (
                <g key={`input-${i}-${j}`}>
                  <ModulePin
                    x={pin.x * width}
                    y={pin.y * height}
                    color={hoveredPinId === pinId ? "#ff2fd6" : "#f44"}
                    type="input"
                    label={input.label || input.title}
                    pinId={pinId}
                    isHovered={hoveredPinId === pinId}
                    onClick={() => onPinClick && onPinClick(pinId)}
                    onPointerDown={onPinPointerDown ? (e: React.PointerEvent) => onPinPointerDown(pinId, e) : undefined}
                    onMouseEnter={() => !pendingCable?.from && setHoveredPinId && setHoveredPinId(pinId)}
                    onMouseLeave={() => !pendingCable?.from && setHoveredPinId && setHoveredPinId(null)}
                  />
                  {/* Debug overlay removed */}
                </g>
              );
            })
          )}
      {/* Output pins (blue) */}
      {autoOutputPins
        ? autoOutputPins.map((pin, i) => (
            <g key={`auto-output-${i}`}>
              <ModulePin
                x={pin.x * width}
                y={pin.y * height}
                color={hoveredPinId === pin.pinId ? "#ff2fd6" : "#44f"}
                type="output"
                label={outputs[i]?.label || outputs[i]?.title || `Out${i+1}`}
                pinId={pin.pinId}
                isHovered={hoveredPinId === pin.pinId}
                onClick={() => onPinClick && onPinClick(pin.pinId)}
                onPointerDown={onPinPointerDown ? (e: React.PointerEvent) => onPinPointerDown(pin.pinId, e) : undefined}
                onMouseEnter={() => !pendingCable?.from && setHoveredPinId && setHoveredPinId(pin.pinId)}
                onMouseLeave={() => !pendingCable?.from && setHoveredPinId && setHoveredPinId(null)}
              />
              {/* Debug overlay removed */}
            </g>
          ))
        : Array.isArray(outputs) && outputs.map((output, i) =>
            (output.pins || []).map((pin: any, j: number) => {
              const pinId = pin.pinId || `${moduleId}:output:${i}:${j}`;
              return (
                <g key={`output-${i}-${j}`}>
                  <ModulePin
                    x={pin.x * width}
                    y={pin.y * height}
                    color={hoveredPinId === pinId ? "#ff2fd6" : "#44f"}
                    type="output"
                    label={output.label || output.title}
                    pinId={pinId}
                    isHovered={hoveredPinId === pinId}
                    onClick={() => onPinClick && onPinClick(pinId)}
                    onPointerDown={onPinPointerDown ? (e: React.PointerEvent) => onPinPointerDown(pinId, e) : undefined}
                    onMouseEnter={() => !pendingCable?.from && setHoveredPinId && setHoveredPinId(pinId)}
                    onMouseLeave={() => !pendingCable?.from && setHoveredPinId && setHoveredPinId(null)}
                  />
                  {/* Debug overlay removed */}
                </g>
              );
            })
          )}
      {/* Knobs */}
      {knobPositions.map(knob => (
        <ModuleKnob
          key={knob.title || ''}
          x={knob.x}
          y={knob.y}
          radius={knobRadius}
          value={knob.value}
          label={knob.label}
          onChange={v => handleKnobChange(knob.title || '', v)}
          onMouseEnter={() => onKnobHover && moduleId && onKnobHover(moduleId, knob.title || '')}
          onMouseLeave={onElementHoverEnd}
        />
      ))}
      {/* Switches */}
      {switchPositions.map(switchDef => (
        <ModuleSwitch
          key={switchDef.title || ''}
          x={switchDef.x}
          y={switchDef.y}
          value={switchDef.value}
          label={switchDef.label}
          onChange={v => handleSwitchChange(switchDef.title || '', v)}
          onMouseEnter={() => onSwitchHover && moduleId && onSwitchHover(moduleId, switchDef.title || '')}
          onMouseLeave={onElementHoverEnd}
        />
      ))}
    </g>
  );
} 