# Patch File Format

Describes a user-created patch: breadboards, modules, knob settings, connections, and configuration.

## Current Implementation Format:

```json
{
  "breadboards": [
    {
      "id": "bb-12345-6789",
      "type": "bb-830"
    },
    {
      "id": "bb-54321-9876", 
      "type": "bb-400"
    }
  ],
  "modules": [
    {
      "id": "mod-12345-6789",
      "type": "mod-delay",
      "x": 5,
      "y": 0,
      "width": 9,
      "height": 120,
      "breadboardId": "bb-12345-6789",
      "knobValues": {
        "TIME": 0.7,
        "FEEDBACK": 0.4,
        "DRY/WET": 1.0
      },
      "switchValues": {
        "RANGE": true
      }
    },
    {
      "id": "mod-54321-9876",
      "type": "mod-vco",
      "x": 0,
      "y": 0, 
      "width": 5,
      "height": 120,
      "breadboardId": "bb-54321-9876",
      "knobValues": {
        "PITCH": 0.3
      },
      "switchValues": {}
    }
  ],
  "cables": [
    {
      "id": "cable-123",
      "from": "mod-12345-6789:output:0:0",
      "to": "mod-54321-9876:input:1:0", 
      "color": "hsl(240,80%,60%)"
    }
  ]
}
```

## Key Concepts:

### Breadboards
- **id** — UUID for the breadboard instance
- **type** — breadboard model ("bb-830", "bb-400", etc.)
- Multiple breadboards supported per patch

### Modules  
- **id** — UUID for the module instance
- **type** — module slug from metadata
- **x**, **y** — grid position on breadboard
- **width**, **height** — module dimensions
- **breadboardId** — which breadboard this module is placed on
- **knobValues** — knob title → normalized value (0.0-1.0)
- **switchValues** — switch title → boolean state

### Cables
- **id** — UUID for the cable
- **from/to** — pin IDs in format: `moduleId:pinType:ioIndex:pinIndex`
  - **moduleId** — target module UUID
  - **pinType** — "input" or "output"  
  - **ioIndex** — index in inputs/outputs array
  - **pinIndex** — index in pins array within that group
- **color** — CSS color string for visual distinction

## Pin ID Format:
Pin connections use a structured ID system:
```
moduleId:pinType:ioIndex:pinIndex
```

Example: `mod-12345:output:0:1` refers to:
- Module with ID "mod-12345"
- Output pin
- First output group (index 0)
- Second pin in that group (index 1)

## Architecture Notes:
- All coordinates are in breadboard grid units
- Cables can connect between modules on different breadboards
- Module metadata is loaded separately and merged with patch data
- Knob and switch values are preserved independently of module metadata updates