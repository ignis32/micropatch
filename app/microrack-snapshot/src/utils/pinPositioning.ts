// Utility to generate evenly spaced pins horizontally
export function generateHorizontalPins(count: number, y: number, minX = 0.15, maxX = 0.85) {
  if (count === 1) return [{ x: (minX + maxX) / 2, y }];
  const step = (maxX - minX) / (count - 1);
  return Array.from({ length: count }, (_, i) => ({
    x: minX + i * step,
    y,
  }));
}

export interface PinPosition {
  x: number;
  y: number;
  pinId: string;
}


export interface AllPin {
  pinId?: string;
  moduleId: string;
  pinType: "input" | "output";
  ioIndex: number;
  pinIndex: number;
  x: number;
  y: number;
  label?: string;
}

export function calculateModulePinPositions(
  moduleId: string,
  inputs: any[],
  outputs: any[],
  modX: number,
  modY: number,
  width: number,
  height: number
): { pinPositions: { input: PinPosition[][], output: PinPosition[][] }; allPins: Record<string, AllPin> } {
  const allPins: Record<string, AllPin> = {};

  // Inputs as 2D array [ioIndex][pinIndex]
  const inputPins: PinPosition[][] = (inputs || []).map((input, i) => {
    if (Array.isArray(input.pins)) {
      return input.pins.map((pin: any, j: number) => {
        const x = modX + (pin.x !== undefined ? pin.x * width : width / 2);
        const y = modY + (pin.y !== undefined ? pin.y * height : 0);
        const pinId = `${moduleId}:input:${i}:${j}`;
        allPins[pinId] = { pinId, moduleId, pinType: "input", ioIndex: i, pinIndex: j, x, y, label: input.title || input.label };
        return { x, y, pinId };
      });
    } else {
      // Module without pins array (like compressor) - use automatic positioning
      const autoPins = generateHorizontalPins(inputs.length, 0.12);
      return autoPins.map((pin, j) => {
        const x = modX + pin.x * width;
        const y = modY + pin.y * height;
        const pinId = `${moduleId}:input:${i}:${j}`;
        allPins[pinId] = { pinId, moduleId, pinType: "input", ioIndex: i, pinIndex: j, x, y, label: input.title || input.label };
        return { x, y, pinId };
      });
    }
  });

  // Outputs as 2D array [ioIndex][pinIndex]
  const outputPins: PinPosition[][] = (outputs || []).map((output, i) => {
    if (Array.isArray(output.pins)) {
      return output.pins.map((pin: any, j: number) => {
        const x = modX + (pin.x !== undefined ? pin.x * width : width / 2);
        const y = modY + (pin.y !== undefined ? pin.y * height : height);
        const pinId = `${moduleId}:output:${i}:${j}`;
        allPins[pinId] = { pinId, moduleId, pinType: "output", ioIndex: i, pinIndex: j, x, y, label: output.title || output.label };
        return { x, y, pinId };
      });
    } else {
      // Module without pins array (like compressor) - use automatic positioning
      const autoPins = generateHorizontalPins(outputs.length, 0.88);
      return autoPins.map((pin, j) => {
        const x = modX + pin.x * width;
        const y = modY + pin.y * height;
        const pinId = `${moduleId}:output:${i}:${j}`;
        allPins[pinId] = { pinId, moduleId, pinType: "output", ioIndex: i, pinIndex: j, x, y, label: output.title || output.label };
        return { x, y, pinId };
      });
    }
  });

  return {
    pinPositions: { input: inputPins, output: outputPins },
    allPins
  };
} 