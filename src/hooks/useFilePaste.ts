import { useEffect, useCallback } from 'react';

interface UseFilePasteOptions {
  onFilesPasted: (files: File[]) => void;
}

function renameGenericImage(file: File): File {
  const genericNames = ['image.png', 'image.jpg', 'image.jpeg', 'image.gif', 'image.webp'];
  if (!genericNames.includes(file.name.toLowerCase())) return file;

  const ext = file.name.split('.').pop() || 'png';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return new File([file], `pasted-${timestamp}.${ext}`, { type: file.type });
}

export function useFilePaste({ onFilesPasted }: UseFilePasteOptions) {
  const handleFilesPasted = useCallback(onFilesPasted, [onFilesPasted]);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const files: File[] = [];
      for (const item of items) {
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) files.push(renameGenericImage(file));
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        handleFilesPasted(files);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handleFilesPasted]);
}
