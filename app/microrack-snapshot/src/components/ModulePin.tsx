import React from "react";

interface ModulePinProps {
  x: number;
  y: number;
  color: string;
  type: "input" | "output";
  label?: string;
  radius?: number;
  pinId?: string;
  isHovered?: boolean;
  onClick?: () => void;
  onPointerDown?: (e: React.PointerEvent) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const ModulePin: React.FC<ModulePinProps> = ({ x, y, color, type, label, radius = 7, pinId, isHovered, onClick, onPointerDown, onMouseEnter, onMouseLeave }) => (
  <g
    tabIndex={0}
    aria-label={label || type}
    role="button"
    style={{ cursor: "pointer" }}
    onClick={e => { e.stopPropagation(); e.preventDefault(); onClick && onClick(); }}
    onPointerDown={e => { e.stopPropagation(); e.preventDefault(); onPointerDown && onPointerDown(e); }}
    onKeyDown={e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick && onClick();
      }
    }}
    onMouseEnter={onMouseEnter}
    onMouseLeave={onMouseLeave}
  >
    {isHovered && (
      <circle
        cx={x}
        cy={y}
        r={radius + 4}
        fill="none"
        stroke="#ff2fd6"
        strokeWidth={3}
        style={{ pointerEvents: 'none' }}
      />
    )}
    <circle
      cx={x}
      cy={y}
      r={radius}
      fill={color}
      stroke="#222"
      strokeWidth={2}
    />
    {label && (
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={radius * 1.2}
        fontWeight="bold"
        fill="#fff"
        pointerEvents="none"
      >
        {label.charAt(0)}
      </text>
    )}
  </g>
);

export default ModulePin; 