# Filesystem Layout for Module Library

All Microrack modules and breadboards are organized in a local directory, typically `microrack_modules/`.

Each module or accessory has its own subdirectory named by its slug.

Example:
microrack_modules/
mod-vco/
meta.json # Module metadata (as parsed from the API)
panel.png # Main panel image (original)
panel_large.png # Large image (optional)
panel_medium.png # Medium image (optional)
panel_small.png # Small image (optional)
panel_thumb.png # Thumbnail (optional)
mod-delay/
meta.json
panel.png
...
bb-120/
meta.json
panel.png


- `meta.json` contains all available module properties, pins, knobs, etc.
- Images correspond to different panel sizes for use in the UI.
- The parser automatically generates this structure from the Microrack API.
