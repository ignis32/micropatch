# Module Metadata Format (`meta.json`)

Each module's `meta.json` provides all necessary info for rendering and interaction.

**Current Implementation Format:**
```json
{
  "id": 2,
  "name": "delay", 
  "slug": "mod-delay",
  "type": "module",
  "shortDescription": "Digital delay with feedback control",
  "price": 25,
  "unitsWidth": 9,
  "currentDraw": 100,
  "chaining": true,
  "legsPattern": "pppp_pppp",
  "inputs": [
    {
      "title": "TIME CV",
      "description": "Time control voltage input",
      "pins": [{"x": 0.1, "y": 0.9}]
    },
    {
      "title": "SIGNAL",
      "description": "Audio signal input", 
      "pins": [{"x": 0.3, "y": 0.9}]
    }
  ],
  "outputs": [
    {
      "title": "SIGNAL",
      "description": "Processed audio output",
      "pins": [{"x": 0.7, "y": 0.9}]
    }
  ],
  "knobs": [
    {
      "title": "TIME",
      "description": "Delay time in milliseconds",
      "x": 0.2,
      "y": 0.3
    },
    {
      "title": "FEEDBACK", 
      "description": "Amount of signal fed back",
      "x": 0.5,
      "y": 0.3
    }
  ],
  "switches": [
    {
      "title": "RANGE",
      "description": "Short/Long delay range",
      "x": 0.8,
      "y": 0.3
    }
  ]
}

```

## Key Fields:

- **slug** — unique identifier for the module
- **type** — "module", "accessory", etc.
- **unitsWidth** — size on breadboard in grid units
- **legsPattern** — pin layout pattern ("p" = pin, "_" = gap)
- **inputs/outputs** — available connection groups with pin coordinates
  - **pins** array with x/y coordinates (0-1 normalized to panel size)
  - **title** and **description** for UI labeling
- **knobs** — potentiometers with x/y positioning (0-1 normalized)
- **switches** — toggle switches with x/y positioning (0-1 normalized)

## Coordinate System:
- All x/y coordinates are normalized (0.0 to 1.0) relative to module panel
- (0,0) = top-left corner, (1,1) = bottom-right corner
- Pin coordinates are relative to breadboard mounting holes
- Knob/switch coordinates are relative to panel face

## Images:
Images are provided in the same directory as meta.json:
- `panel.png` — main panel image
- `panel_large.png`, `panel_medium.png`, etc. — different sizes for UI scaling