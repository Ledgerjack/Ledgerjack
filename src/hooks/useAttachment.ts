import { useState, useEffect, useRef } from 'react';

export function useAttachment() {
  const [isCompressing, setIsCompressing] = useState(false);
  const activeUrls = useRef<Set<string>>(new Set());

  useEffect(() => {
    return () => {
      activeUrls.current.forEach((url) => URL.revokeObjectURL(url));
      activeUrls.current.clear();
    };
  }, []);

  const createTrackedUrl = (blob: Blob): string => {
    const url = URL.createObjectURL(blob);
    activeUrls.current.add(url);
    return url;
  };

  const revokeTrackedUrl = (url: string) => {
    if (activeUrls.current.has(url)) {
      URL.revokeObjectURL(url);
      activeUrls.current.delete(url);
    }
  };

  const compressToWebP = (file: File, maxDimension = 1200, quality = 0.75): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      setIsCompressing(true);
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        let { width, height } = img;
        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else if (height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsCompressing(false);
          return reject(new Error('Canvas context unavailable.'));
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            setIsCompressing(false);
            if (blob) resolve(blob);
            else reject(new Error('WebP conversion produced empty output.'));
          },
          'image/webp',
          quality,
        );
      };
      img.onerror = (err) => {
        setIsCompressing(false);
        reject(err);
      };
    });
  };

  return { compressToWebP, createTrackedUrl, revokeTrackedUrl, isCompressing };
}
