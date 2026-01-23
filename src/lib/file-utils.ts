import type { SerializedFile } from '@/types';

export async function serializeFile(file: File): Promise<SerializedFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve({
        name: file.name,
        type: file.type,
        size: file.size,
        data: base64,
        lastModified: file.lastModified,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function serializeFiles(files: File[]): Promise<SerializedFile[]> {
  return Promise.all(files.map(serializeFile));
}

export function deserializeFile(serialized: SerializedFile): File {
  const binary = atob(serialized.data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new File([bytes], serialized.name, {
    type: serialized.type,
    lastModified: serialized.lastModified,
  });
}
