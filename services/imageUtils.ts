
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

/**
 * Compresses an image file to a Base64 string with reduced resolution and quality.
 * Target: Max 800px width/height, 0.6 JPEG quality.
 */
export const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);

      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;

        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
             reject(new Error("Could not get canvas context"));
             return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Compress to JPEG with 0.5 quality
          const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
          resolve(dataUrl);
        };

        img.onerror = (err) => reject(err);
      };

      reader.onerror = (error) => reject(error);
    });
};

/**
 * Compresses a base64 image string (already loaded as dataURL).
 * Used when image is captured via Camera API which returns base64.
 */
export const compressBase64Image = (base64String: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = base64String;

        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
             reject(new Error("Could not get canvas context"));
             return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Compress to JPEG with 0.5 quality
          const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
          resolve(dataUrl);
        };

        img.onerror = (err) => reject(err);
    });
};

/**
 * Captures a photo using Capacitor Camera API on native platforms.
 * On web, returns null to fallback to input file.
 * Returns compressed base64 image.
 */
export const capturePhoto = async (): Promise<string | null> => {
    // On web, return null to use file input fallback
    if (Capacitor.getPlatform() === 'web') {
        return null;
    }

    try {
        const image = await Camera.getPhoto({
            quality: 90,
            allowEditing: false,
            resultType: CameraResultType.Base64,
            source: CameraSource.Prompt, // Allows user to choose camera or gallery
        });

        if (!image.base64String) {
            throw new Error('No image data received');
        }

        // Convert to data URL format
        const base64Data = `data:image/${image.format};base64,${image.base64String}`;

        // Compress the image to match current behavior
        const compressed = await compressBase64Image(base64Data);

        return compressed;
    } catch (error) {
        console.error('Camera error:', error);
        // User cancelled or error occurred
        return null;
    }
};
