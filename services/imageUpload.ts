import { dbClient } from './database';

export const uploadImage = async (
  file: File,
  userId: string,
  folder: string
): Promise<string | null> => {
  const timestamp = Date.now();
  const path = `${userId}/${folder}/${timestamp}.jpg`;

  console.log(`[ImageUpload] Uploading to uploads/${path}`);

  const { error } = await dbClient.storage
    .from('uploads')
    .upload(path, file, { contentType: 'image/jpeg', upsert: true });

  if (error) {
    console.error('[ImageUpload] Upload failed:', error);
    return null;
  }

  const { data } = dbClient.storage.from('uploads').getPublicUrl(path);
  const url = data.publicUrl;

  console.log('[ImageUpload] Upload successful, public URL:', url);
  return url;
};

export const base64ToFile = (base64: string, filename = 'photo.jpg'): File => {
  const arr = base64.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  return new File([u8arr], filename, { type: mime });
};
