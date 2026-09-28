/**
 * Utility to compress images, crop avatars, and prevent localStorage QuotaExceededError.
 */

export async function compressImage(
  source: File | string,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.88
): Promise<string> {
  return new Promise((resolve) => {
    // Safety timeout: Never hang in loading state longer than 4s
    const timeoutId = setTimeout(() => {
      console.warn('compressImage timed out, resolving fallback');
      if (typeof source === 'string') resolve(source);
      else resolve('');
    }, 4000);

    const finish = (result: string) => {
      clearTimeout(timeoutId);
      resolve(result);
    };

    const processDataUrl = (dataUrl: string) => {
      if (!dataUrl) {
        finish('');
        return;
      }

      // If it's already an SVG or tiny string, return it directly
      if (dataUrl.startsWith('data:image/svg+xml') || dataUrl.length < 5000) {
        finish(dataUrl);
        return;
      }

      const img = new Image();
      img.onload = () => {
        try {
          let width = img.naturalWidth || img.width;
          let height = img.naturalHeight || img.height;

          if (width <= 0 || height <= 0) {
            finish(dataUrl);
            return;
          }

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = Math.max(width, 1);
          canvas.height = Math.max(height, 1);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            finish(dataUrl);
            return;
          }

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const compressed = canvas.toDataURL('image/jpeg', quality);
          finish(compressed);
        } catch (err) {
          console.warn('compressImage processing error:', err);
          finish(dataUrl);
        }
      };

      img.onerror = (err) => {
        console.warn('compressImage img.onerror:', err);
        finish(dataUrl);
      };

      img.src = dataUrl;
    };

    if (source instanceof File) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const raw = (e.target?.result as string) || '';
        processDataUrl(raw);
      };
      reader.onerror = () => finish('');
      reader.readAsDataURL(source);
    } else {
      processDataUrl(source);
    }
  });
}

/**
 * Bakes the zoomed & panned avatar into a clean square image canvas
 * matching exactly what the user saw in the preview viewport (containerSize = 192px),
 * without ever pre-cutting or truncating the original photo.
 */
export async function bakeCroppedAvatar(
  imageSrc: string,
  scale: number = 1,
  position: { x: number; y: number } = { x: 0, y: 0 },
  outputSize: number = 256,
  containerSize: number = 192
): Promise<string> {
  return new Promise((resolve) => {
    if (!imageSrc) {
      resolve('');
      return;
    }

    // Safety timeout: never hang longer than 3s
    const timeoutId = setTimeout(() => {
      console.warn('bakeCroppedAvatar timed out, resolving original source');
      resolve(imageSrc);
    }, 3000);

    const finish = (result: string) => {
      clearTimeout(timeoutId);
      resolve(result);
    };

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = outputSize;
        canvas.height = outputSize;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          finish(imageSrc);
          return;
        }

        // Fill crisp background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, outputSize, outputSize);

        const nw = img.naturalWidth || outputSize;
        const nh = img.naturalHeight || outputSize;
        const aspect = nw / nh;

        // Base size rendered in the preview container
        let baseW = containerSize;
        let baseH = containerSize;
        if (aspect < 1) {
          // Portrait: width fits container, height is taller
          baseW = containerSize;
          baseH = containerSize / aspect;
        } else {
          // Landscape or square: height fits container, width is wider
          baseH = containerSize;
          baseW = containerSize * aspect;
        }

        const ratio = outputSize / containerSize;
        const renderW = baseW * ratio * scale;
        const renderH = baseH * ratio * scale;
        const cx = outputSize / 2;
        const cy = outputSize / 2;
        const dx = position.x * ratio;
        const dy = position.y * ratio;

        ctx.drawImage(img, cx + dx - renderW / 2, cy + dy - renderH / 2, renderW, renderH);

        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        finish(dataUrl);
      } catch (err) {
        console.warn('bakeCroppedAvatar error:', err);
        finish(imageSrc);
      }
    };

    img.onerror = () => finish(imageSrc);
    img.src = imageSrc;
  });
}
