import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { fail } from './store';
export function uploadDirectory() { return path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR || './uploads'); }
function photoPath(key: string) {
  if (!/^[a-f0-9-]{36}\.jpg$/.test(key)) fail('Invalid photo.', 404);
  return path.join(/*turbopackIgnore: true*/ uploadDirectory(), key);
}
export async function readLocalPhoto(key: string) {
  try { return await readFile(/*turbopackIgnore: true*/ photoPath(key)); } catch (e: any) { if (e.code === 'ENOENT') return null; throw e; }
}
export async function removeLocalPhoto(key: string) {
  try { await unlink(photoPath(key)); } catch (e: any) { if (e.code !== 'ENOENT') console.error('Photo cleanup failed', e.code); }
}
export async function writeLocalPhoto(input: Buffer) {
  if (process.env.VERCEL) fail('Local photo uploads require a server with persistent disk. Vercel cannot retain uploaded photos.', 503);
  const key = crypto.randomUUID() + '.jpg';
  let image: Buffer;
  try { image = await sharp(input, { limitInputPixels: 40_000_000, animated: false }).rotate().resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 90 }).toBuffer(); }
  catch { fail('Choose a valid JPEG or PNG image.'); }
  await mkdir(uploadDirectory(), { recursive: true, mode: 0o700 });
  await writeFile(photoPath(key), image, { flag: 'wx', mode: 0o600 });
  return key;
}
