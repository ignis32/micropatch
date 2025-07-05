// Image loading utility for calculating proper module dimensions
export interface ImageDimensions {
  width: number;
  height: number;
  aspectRatio: number;
}

// Cache for loaded image dimensions
const imageCache = new Map<string, ImageDimensions>();

export async function loadImageDimensions(imagePath: string): Promise<ImageDimensions> {
  // Check cache first
  if (imageCache.has(imagePath)) {
    return imageCache.get(imagePath)!;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      const dimensions: ImageDimensions = {
        width: img.naturalWidth,
        height: img.naturalHeight,
        aspectRatio: img.naturalWidth / img.naturalHeight
      };
      
      // Cache the result
      imageCache.set(imagePath, dimensions);
      resolve(dimensions);
    };
    
    img.onerror = () => {
      reject(new Error(`Failed to load image: ${imagePath}`));
    };
    
    img.src = imagePath;
  });
}

// Calculate module height based on breadboard width and image aspect ratio
export function calculateModuleHeight(
  unitsWidth: number,
  cellSize: number,
  margin: number,
  aspectRatio: number
): number {
  // Calculate the pixel width that the module will occupy on the breadboard
  const pixelWidth = unitsWidth * cellSize + (unitsWidth - 1) * margin;
  
  // Calculate height based on aspect ratio
  const height = pixelWidth / aspectRatio;
  
  return Math.round(height);
}

// Clear cache (useful for development)
export function clearImageCache(): void {
  imageCache.clear();
}