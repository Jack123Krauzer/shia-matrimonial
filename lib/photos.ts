import { randomUUID } from 'node:crypto';
import sharp from 'sharp';
import { prisma } from './prisma';
import { fail } from './store';

export async function readPhoto(key: string) {
  if (!/^[a-f0-9-]{36}\.jpg$/.test(key)) fail('Invalid photo.', 404);
  const photo = await prisma.photo.findUnique({ where: { key }, select: { data: true } });
  return photo?.data ?? null;
}

export async function writePhoto(input: Buffer, profileId: string) {
  let image: Buffer;
  try {
    image = await sharp(input, { limitInputPixels: 40_000_000, animated: false })
      .rotate().resize({ width: 1400, height: 1400, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 82 }).toBuffer();
  } catch { fail('Choose a valid JPEG or PNG image.'); }
  if (image.length > 1024 * 1024) fail('Choose a simpler or smaller photo. The processed image must be under 1 MB.', 413);
  const key = randomUUID() + '.jpg';
  await prisma.$transaction(async tx => {
    await tx.photo.upsert({ where: { profileId }, create: { key, profileId, data: new Uint8Array(image) }, update: { key, data: new Uint8Array(image), createdAt: new Date() } });
    await tx.profile.update({ where: { id: profileId }, data: { photoKey: key } });
    await tx.connection.updateMany({ where: { senderId: profileId }, data: { senderPhoto: false } });
    await tx.connection.updateMany({ where: { receiverId: profileId }, data: { receiverPhoto: false } });
  });
  return key;
}

export async function removePhoto(profileId: string) {
  await prisma.$transaction(async tx => {
    await tx.photo.deleteMany({ where: { profileId } });
    await tx.profile.update({ where: { id: profileId }, data: { photoKey: null } });
    await tx.connection.updateMany({ where: { senderId: profileId }, data: { senderPhoto: false } });
    await tx.connection.updateMany({ where: { receiverId: profileId }, data: { receiverPhoto: false } });
  });
}
