import React from "react";

interface ModuleSwitchProps {
  x: number;
  y: number;
  size?: number;
  value: boolean; // true/false instead of 0-1
  label?: string;
  onChange?: (value: boolean) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}

const ModuleSwitch: React.FC<ModuleSwitchProps> = ({
  x,
  y,
  size = 30,
  value,
  label,
  onChange,
  onMouseEnter,
  onMouseLeave,
}) => {
  const handleClick = (e: React.PointerEvent<SVGGElement>) => {
    e.stopPropagation(); // Prevent module drag
    if (onChange) {
      onChange(!value);
    }
  };

  // Colors based on state
  const fillColor = value ? "#4CAF50" : "#9E9E9E"; // Green when on, gray when off
  const strokeColor = "#000";
  const textColor = value ? "#fff" : "#000";

  return (
    <g
      tabIndex={0}
      aria-label={label || "Switch"}
      style={{ cursor: "pointer" }}
      onPointerDown={handleClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Switch body - square */}
      <rect
        x={x - size/2}
        y={y - size/2}
        width={size}
        height={size}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={2}
        rx={2} // Small rounded corners
      />
      
      {/* Visual indicator for state */}
      {value && (
        <g>
          {/* Checkmark when active */}
          <path
            d={`M ${x - size*0.3} ${y - size*0.1} L ${x - size*0.1} ${y + size*0.1} L ${x + size*0.3} ${y - size*0.2}`}
            stroke="#fff"
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
      
      {/* Label - first character centered in switch */}
      <text
        x={x}
        y={y}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={size * 0.5}
        fontWeight="bold"
        fill={textColor}
        pointerEvents="none"
      >
        {(label && label.length > 0) ? label.charAt(0) : "S"}
      </text>
    </g>
  );
};

export default ModuleSwitch;