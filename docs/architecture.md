# Current Architecture (Post-Cleanup)

## Overview
Web-based patchbook for Microrack modular synths with visual patch building using virtual breadboards and modules.

## Core Components

### Main Application (`app/microrack-snapshot/src/App.tsx`)
- Central state management for breadboards, modules, cables, and patches
- Drag-and-drop functionality using @dnd-kit/core
- Save/load patch functionality (JSON format)
- Debug logging system for cable connections
- Fixed sidebar layout with sticky panels

### Key React Components:

#### `BreadboardSVG`
- Renders individual breadboard layout with modules
- Handles module positioning and collision detection  
- Provides pin hit-testing for cable connections
- Manages module interactions (drag, knob control, switches)

#### `ModuleBrowser` 
- Left sidebar for browsing and adding modules
- Drag-and-drop source for new modules
- Delete target for removing modules

#### `GlobalCableLayer`
- Renders all cables across multiple breadboards
- Handles inter-breadboard cable routing
- Manages ghost cable during dragging
- Uses global coordinate transformation

#### `ModuleSVG`
- Individual module rendering with panel image
- Interactive knobs and switches  
- Pin rendering with hover states
- Module-specific coordinate calculations

### Data Structure

#### Module Library (`microrack_modules_library/`)
- Each module has folder with `meta.json` and panel images
- `meta.json` contains: pins, knobs, dimensions, coordinates
- Images: panel.png, panel_large.png, panel_medium.png, etc.

#### Current Module Format:
```json
{
  "slug": "mod-delay",
  "unitsWidth": 9,
  "legsPattern": "pppp_pppp", 
  "inputs": [{"title": "SIGNAL", "pins": [{"x": 0.3, "y": 0.9}]}],
  "outputs": [{"title": "OUT", "pins": [{"x": 0.7, "y": 0.9}]}],
  "knobs": [{"title": "TIME", "x": 0.2, "y": 0.3}],
  "switches": [{"title": "RANGE", "x": 0.8, "y": 0.3}]
}
```

#### Current Patch Format:
```json
{
  "breadboards": [{"id": "bb-uuid", "type": "bb-830"}],
  "modules": [{
    "id": "mod-uuid", 
    "type": "mod-delay",
    "x": 5, "y": 0,
    "breadboardId": "bb-uuid",
    "knobValues": {"TIME": 0.7},
    "switchValues": {"RANGE": true}
  }],
  "cables": [{
    "id": "cable-uuid",
    "from": "mod-uuid:output:0:0", 
    "to": "mod-uuid2:input:1:0",
    "color": "hsl(240,80%,60%)"
  }]
}
```

## Key Features

### 1. Multi-breadboard Support
- Users can add multiple breadboards per patch
- Breadboard management (add, remove, reorder)
- Different breadboard types (830-pin, 400-pin)

### 2. Module System  
- Drag from browser to breadboards or between breadboards
- Grid-based positioning with collision detection
- Module metadata loaded from local library
- Panel images with multiple sizes

### 3. Cable Connections
- Click/drag between pins to create colored cables
- Global cable layer handles inter-breadboard connections
- Pin ID system: `moduleId:pinType:ioIndex:pinIndex`
- Visual cable curves with customizable gravity

### 4. Interactive Controls
- Knob rotation with value persistence
- Switch toggling with state persistence
- Hover information display
- Debug coordinate recording

### 5. Patch Persistence
- Save/load patches as JSON files
- Module state preservation (knobs, switches)
- Cable topology preservation
- Breadboard layout preservation

## Coordinate Systems

### 1. Breadboard Grid Coordinates
- Integer grid positions for module placement
- Collision detection based on module width
- Pin positioning within grid cells

### 2. SVG Coordinates  
- Breadboard-local SVG coordinate space
- Pin hit-testing and interaction
- Module panel rendering

### 3. Global Coordinates
- Screen-space coordinates for inter-breadboard cables
- Calculated relative to main container
- Used by GlobalCableLayer for cable rendering

### 4. Normalized Coordinates (0-1)
- Module metadata uses normalized coordinates
- Pin positions relative to module panel
- Knob/switch positions on module face

## Removed Components (Cleanup)
The following deprecated components were removed:
- `Cable.tsx` - superseded by GlobalCableLayer
- `TopMenu.tsx` - unused UI component
- `BreadboardPanel.tsx` - legacy breadboard management
- `BreadboardStack.tsx` - old breadboard container
- `BreadboardArea.tsx` - deprecated breadboard logic
- `BreadboardViewer.tsx` - old rendering approach

## File Organization
```
app/microrack-snapshot/
├── src/
│   ├── App.tsx                    # Main application
│   ├── components/
│   │   ├── BreadboardSVG.tsx      # Breadboard rendering
│   │   ├── ModuleBrowser.tsx      # Module library sidebar  
│   │   ├── GlobalCableLayer.tsx   # Inter-breadboard cables
│   │   ├── ModuleSVG.tsx          # Individual modules
│   │   ├── ModuleKnob.tsx         # Knob controls
│   │   └── ModuleSwitch.tsx       # Switch controls
│   ├── utils/
│   │   └── pinPositioning.ts      # Pin calculation utilities
│   └── breadboardConfig.ts        # Layout constants
├── public/
│   ├── breadboards/               # Breadboard layouts
│   └── modules/                   # Module library (mounted)
microrack_modules_library/         # Module metadata and images
docs/                              # Documentation
```

## Development Notes
- Uses Vite for build tooling with React and TypeScript
- ESLint configuration with React hooks rules
- SVG-based rendering for precision and scalability
- Pointer events for robust cable drag interactions
- Fixed panel layout prevents scrolling issues
- Debug mode for coordinate development and troubleshooting