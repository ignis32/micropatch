import React, { useRef } from "react";

interface ModuleKnobProps {
  x: number;
  y: number;
  radius?: number;
  value: number; // 0-1
  label?: string;
  rotation?: number; // degrees
  onChange?: (value: number) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}
const SWEEP_START = 110; // degrees, 0 = down
const SWEEP_END = 420;   // degrees, 1 = down (after 270° sweep)
const SWEEP_RANGE = SWEEP_END-SWEEP_START; // degrees

const ModuleKnob: React.FC<ModuleKnobProps> = ({
  x,
  y,
  radius = 24,
  value,
  label,
  rotation = 0,
  onChange,
  onMouseEnter,
  onMouseLeave,
}) => {
  const dragging = useRef(false);

  // Calculate indicator angle (0-1 mapped to 270° sweep)
  const angle = SWEEP_START + value * SWEEP_RANGE + rotation;
  const rad = (angle * Math.PI) / 180;
  const indicatorX = x + radius * Math.cos(rad);
  const indicatorY = y + radius * Math.sin(rad);

  const handleWheel = (e: React.WheelEvent<SVGCircleElement>) => {
    e.preventDefault();
    if (onChange) {
      // Reverse direction: up increases value, down decreases
      onChange(Math.max(0, Math.min(1, value + (e.deltaY > 0 ? -0.05 : 0.05))));
    }
  };

  // Drag-to-rotate logic
  const handlePointerDown = (e: React.PointerEvent<SVGGElement>) => {
    e.stopPropagation(); // Prevent module drag
    dragging.current = true;
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: React.PointerEvent<SVGGElement>) => {
    if (!dragging.current || !onChange) return;
    const rect = (e.currentTarget as SVGGElement).ownerSVGElement?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + rect.width * (x / (e.currentTarget as SVGGElement).ownerSVGElement!.width.baseVal.value);
    const cy = rect.top + rect.height * (y / (e.currentTarget as SVGGElement).ownerSVGElement!.height.baseVal.value);
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    let theta = Math.atan2(dy, dx) * 180 / Math.PI;
    if (theta < 0) theta += 360; // Normalize to [0, 360)
    // Calculate wrapped difference
    let diff = theta - SWEEP_START;
    if (diff < 0) diff += 360;
    if (diff > SWEEP_RANGE) diff -= 360;
    let rel = diff / SWEEP_RANGE;
    rel = Math.max(0, Math.min(1, rel));
    onChange(rel);
  };
  const handlePointerUp = (e: React.PointerEvent<SVGGElement>) => {
    dragging.current = false;
    (e.target as Element).releasePointerCapture(e.pointerId);
  };

  return (
    <g
      tabIndex={0}
      aria-label={label || "Knob"}
      style={{ cursor: "pointer" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <circle
        cx={x}
        cy={y}
        r={radius}
        fill="#FFD600" // yellow
        stroke="#000"
        strokeWidth={3}
        onWheel={handleWheel}
      />
      {/* Knob indicator */}
      <line
        x1={x}
        y1={y}
        x2={indicatorX}
        y2={indicatorY}
        stroke="#000"
        strokeWidth={3}
      />
      {/* Centered label character */}
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={radius * 0.9}
        fontWeight="bold"
        fill="#fff"
        pointerEvents="none"
      >
        {(label && label.length > 0) ? label.charAt(0) : "?"}
      </text>
      {/* Full label below knob removed for now */}
    </g>
  );
};

export default ModuleKnob; 