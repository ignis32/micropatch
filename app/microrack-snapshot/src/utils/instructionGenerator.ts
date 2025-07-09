import type { ModuleInstance } from '../components/BreadboardSVG';

interface Breadboard {
  id: string;
  type: string;
}

interface Cable {
  id: string;
  from: string;
  to: string;
  color: string;
}

// Helper to get module name from type
const getModuleName = async (moduleType: string): Promise<string> => {
  try {
    const response = await fetch(`./modules/${moduleType}/meta.json`);
    if (response.ok) {
      const meta = await response.json();
      return meta.name || moduleType;
    }
  } catch (error) {
    console.warn(`Could not fetch name for module ${moduleType}`);
  }
  return moduleType;
};

// Helper to parse pin ID and get human readable description
const parsePinId = async (pinId: string, modules: ModuleInstance[]): Promise<string> => {
  const parts = pinId.split(':');
  if (parts.length < 4) return pinId;
  
  const [moduleId, pinType, ioIndex, pinIndex] = parts;
  const module = modules.find(m => m.id === moduleId);
  
  if (!module) return pinId;
  
  const pinGroup = pinType === 'input' ? module.inputs[parseInt(ioIndex)] : module.outputs[parseInt(ioIndex)];
  if (!pinGroup) return `${pinType}.${pinIndex}`;
  
  const groupTitle = pinGroup.title || `${pinType}.${ioIndex}`;
  const pinNumber = parseInt(pinIndex) + 1; // 1-based for humans
  
  return `${groupTitle}.${pinNumber} (${pinType.toUpperCase()})`;
};

export const generateInstructions = async (
  breadboards: Breadboard[],
  modules: ModuleInstance[],
  cables: Cable[],
  patchName?: string
): Promise<string> => {
  let instructions = '';
  
  // Header
  instructions += '===============================================\n';
  if (patchName) {
    instructions += `           ${patchName.toUpperCase()}\n`;
    instructions += '           MICROPATCH ASSEMBLY GUIDE\n';
  } else {
    instructions += '           MICROPATCH ASSEMBLY GUIDE\n';
  }
  instructions += '===============================================\n\n';
  
  // === BOM SECTION ===
  instructions += '=== BILL OF MATERIALS ===\n\n';
  
  // Count breadboards by type
  const breadboardCounts: Record<string, number> = {};
  breadboards.forEach(board => {
    breadboardCounts[board.type] = (breadboardCounts[board.type] || 0) + 1;
  });
  
  instructions += 'BREADBOARDS:\n';
  Object.entries(breadboardCounts).forEach(([type, count]) => {
    instructions += `  ${count}x ${type}\n`;
  });
  instructions += '\n';
  
  // Count modules by type
  const moduleTypePromises = modules.map(async (module) => {
    const name = await getModuleName(module.type);
    return { type: module.type, name };
  });
  
  const moduleTypes = await Promise.all(moduleTypePromises);
  const moduleCounts: Record<string, number> = {};
  
  moduleTypes.forEach(({ name }) => {
    moduleCounts[name] = (moduleCounts[name] || 0) + 1;
  });
  
  instructions += 'MODULES:\n';
  Object.entries(moduleCounts).forEach(([name, count]) => {
    instructions += `  ${count}x ${name}\n`;
  });
  instructions += '\n';
  
  instructions += `PATCH CABLES: ${cables.length}\n\n`;
  
  // === MODULE PLACEMENT SECTION ===
  instructions += '=== MODULE PLACEMENT ===\n\n';
  
  breadboards.forEach((board, boardIndex) => {
    const boardModules = modules
      .filter(m => m.breadboardId === board.id)
      .sort((a, b) => a.x - b.x); // left to right
    
    if (boardModules.length === 0) return;
    
    instructions += `BREADBOARD ${boardIndex + 1}:\n`;
    
    for (let i = 0; i < boardModules.length; i++) {
      const module = boardModules[i];
      const moduleName = moduleTypes.find(mt => mt.type === module.type)?.name || module.type;
      instructions += `  ${i + 1}. ${moduleName}\n`;
    }
    instructions += '\n';
  });
  
  // === CABLE CONNECTIONS SECTION ===
  instructions += '=== CABLE CONNECTIONS ===\n\n';
  
  if (cables.length === 0) {
    instructions += 'No cables to connect.\n\n';
  } else {
    for (let i = 0; i < cables.length; i++) {
      const cable = cables[i];
      
      // Find source module
      const fromModuleId = cable.from.split(':')[0];
      const fromModule = modules.find(m => m.id === fromModuleId);
      
      // Find target module  
      const toModuleId = cable.to.split(':')[0];
      const toModule = modules.find(m => m.id === toModuleId);
      
      if (!fromModule || !toModule) continue;
      
      // Find breadboard positions
      const fromBoardIndex = breadboards.findIndex(b => b.id === fromModule.breadboardId);
      const toBoardIndex = breadboards.findIndex(b => b.id === toModule.breadboardId);
      
      // Find module positions within breadboards
      const fromBoardModules = modules
        .filter(m => m.breadboardId === fromModule.breadboardId)
        .sort((a, b) => a.x - b.x);
      const fromModulePosition = fromBoardModules.findIndex(m => m.id === fromModule.id) + 1;
      
      const toBoardModules = modules
        .filter(m => m.breadboardId === toModule.breadboardId)
        .sort((a, b) => a.x - b.x);
      const toModulePosition = toBoardModules.findIndex(m => m.id === toModule.id) + 1;
      
      // Get human readable pin descriptions
      const fromPin = await parsePinId(cable.from, modules);
      const toPin = await parsePinId(cable.to, modules);
      
      const fromModuleName = moduleTypes.find(mt => mt.type === fromModule.type)?.name || fromModule.type;
      const toModuleName = moduleTypes.find(mt => mt.type === toModule.type)?.name || toModule.type;
      
      instructions += `  ${i + 1}. Breadboard ${fromBoardIndex + 1}, module ${fromModulePosition} (${fromModuleName}) - ${fromPin}\n`;
      instructions += `     ->  Breadboard ${toBoardIndex + 1}, module ${toModulePosition} (${toModuleName}) - ${toPin}\n\n`;
    }
  }
  
  // === CONTROL SETTINGS SECTION ===
  instructions += '=== CONTROL SETTINGS ===\n\n';
  
  let hasControls = false;
  breadboards.forEach((board, boardIndex) => {
    const boardModules = modules
      .filter(m => m.breadboardId === board.id)
      .sort((a, b) => a.x - b.x);
    
    const modulesWithControls = boardModules.filter(m => 
      (m.knobs && m.knobs.length > 0) || (m.switches && m.switches.length > 0)
    );
    
    if (modulesWithControls.length > 0) {
      hasControls = true;
      instructions += `BREADBOARD ${boardIndex + 1}:\n`;
      
      modulesWithControls.forEach((module, moduleIndex) => {
        const moduleName = moduleTypes.find(mt => mt.type === module.type)?.name || module.type;
        const modulePosition = boardModules.findIndex(m => m.id === module.id) + 1;
        
        instructions += `  Module ${modulePosition} (${moduleName}):\n`;
        
        // Add knobs first
        if (module.knobs && module.knobs.length > 0) {
          module.knobs.forEach((knob, knobIndex) => {
            const percentage = Math.round(knob.value * 100);
            const knobTitle = knob.title || `Knob ${knobIndex + 1}`;
            instructions += `    ${knobTitle}: ${percentage}%\n`;
          });
        }
        
        // Add switches after knobs
        if (module.switches && module.switches.length > 0) {
          module.switches.forEach((switchItem, switchIndex) => {
            const switchTitle = switchItem.title || `Switch ${switchIndex + 1}`;
            const switchState = switchItem.value ? 'ON' : 'OFF';
            instructions += `    ${switchTitle}: ${switchState}\n`;
          });
        }
        
        instructions += '\n';
      });
    }
  });
  
  if (!hasControls) {
    instructions += 'No controls to adjust.\n\n';
  }
  
  instructions += '===============================================\n';
  instructions += '              END OF INSTRUCTIONS\n';
  instructions += '===============================================\n';
  
  return instructions;
};