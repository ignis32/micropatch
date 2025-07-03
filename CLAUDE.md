# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

The main application is in `app/microrack-snapshot/` which is a React TypeScript Vite application.

### Docker Development Environment
- `docker-compose up` - Start development server (runs npm dev on port 5173)
- The dev server is already running when using Docker Compose
- Module library is mounted as read-only at `/app/microrack-snapshot/public/modules`

### Frontend Development (in app/microrack-snapshot/ if running locally)
- `npm run dev` - Start development server
- `npm run build` - Build for production (runs TypeScript compilation then Vite build)
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

### Module Management
- `python parser.py` - Download module metadata and images from microrack.org API
- `./generate_modules_index.sh` - Generate modules index JSON from local module library

## Architecture Overview

This is a **web-based patchbook for Microrack modular synths** that allows visual patch building with virtual breadboards and modules.

### Core Components

**Main Application (`app/microrack-snapshot/src/App.tsx`)**
- Central state management for breadboards, modules, cables, and patches
- Drag-and-drop functionality using @dnd-kit/core
- Save/load patch functionality (JSON format)
- Debug logging system for cable connections

**Key React Components:**
- `BreadboardSVG` - Renders breadboard layout with modules and cables
- `ModuleBrowser` - Sidebar for browsing and adding modules
- `Cable` - Virtual patch cable rendering
- `ModuleSVG` - Individual module rendering with knobs and pins

### Data Structure

**Module Library (`microrack_modules_library/`)**
- Each module has a folder with `meta.json` and panel images
- `meta.json` contains module metadata: pins, knobs, dimensions, etc.
- Images in multiple sizes: panel.png, panel_large.png, panel_medium.png, panel_small.png, panel_thumb.png

**Patch Format** (as documented in `docs/patch_format.md`):
- JSON structure with breadboards, modules, connections, and notes
- Modules have instanceId, slug, position, and knob values
- Connections link output pins to input pins between modules

**Module Format** (actual format from `microrack_modules_library/`):
- `name` - module name
- `slug` - unique identifier
- `unitsWidth` - breadboard width in units
- `legsPattern` - pin layout pattern (null for automatic)
- `shortDescription` - module description
- `inputs`/`outputs` - arrays with `title` and `pins` (x/y coordinates as percentages)
- `knobs` - array of knob definitions (empty for modules without knobs)
- Pin coordinates are normalized (0-1) relative to module panel

### Key Features

1. **Multi-breadboard Support** - Users can add multiple breadboards per patch
2. **Module Drag & Drop** - Modules can be dragged from browser to breadboards or between breadboards
3. **Cable Connections** - Click/drag between pins to create colored cables
4. **Knob Control** - Interactive knobs with value persistence
5. **Patch Persistence** - Save/load patches as JSON files
6. **Debug Logging** - Cable connection debugging with downloadable logs

### File Organization

- `app/microrack-snapshot/` - Main React application
- `microrack_modules_library/` - Module metadata and images
- `docs/` - Documentation for formats and architecture
- `parser.py` - Module data fetcher from microrack.org
- `generate_modules_index.sh` - Creates module index for frontend

### Development Notes

- Uses Vite for build tooling with React and TypeScript
- ESLint configuration with React hooks and TypeScript rules
- Module positioning uses grid-based layout with collision detection
- SVG-based rendering for breadboards and modules
- Pointer events for cable drag interactions