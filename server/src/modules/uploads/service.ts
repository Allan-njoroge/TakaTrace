import sharp from "sharp";
import { config } from "../../config.js";
import { prisma } from "../../db.js";
import { writeAudit } from "../../lib/audit.js";
import { sha256Hex } from "../../lib/crypto.js";
import { AppError } from "../../lib/errors.js";
import { storage } from "../../providers/storage/index.js";
import type { SessionUser } from "../../middleware/session.js";

export async function uploadPhoto(user: SessionUser, file: { buffer: Buffer; size: number }) {
  if (file.size > config.PHOTO_MAX_BYTES) {
    throw new AppError("VALIDATION", `Photo must be smaller than ${Math.floor(config.PHOTO_MAX_BYTES / 1024 / 1024)} MB.`);
  }

  let processed;
  try {
    processed = await sharp(file.buffer)
      .rotate() // auto-orient from EXIF, then the metadata below is stripped
      .resize({ width: config.PHOTO_MAX_DIMENSION, height: config.PHOTO_MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new AppError("VALIDATION", "That file doesn't look like a valid image.");
  }

  const bytes = processed.data;
  const sha256 = sha256Hex(bytes);

  const existing = await prisma.photo.findFirst({ where: { sha256 } });
  if (existing) return existing;

  const cid = await storage.put(bytes);
  const photo = await prisma.photo.create({
    data: {
      cid,
      sha256,
      mimeType: "image/jpeg",
      sizeBytes: bytes.length,
      width: processed.info.width,
      height: processed.info.height,
      storage: storage.name === "IPFS_LOCAL" ? "IPFS_LOCAL" : "PINATA",
      uploadedByUserId: user.id,
    },
  });
  await writeAudit(prisma, { actorType: "USER", actorId: user.id, action: "PHOTO_UPLOADED", entityType: "Photo", entityId: photo.id, summary: `Uploaded photo ${cid}.` });
  return photo;
}

export async function getPhotoBytes(cid: string): Promise<AsyncIterable<Uint8Array>> {
  const photo = await prisma.photo.findUnique({ where: { cid } });
  if (!photo) throw new AppError("NOT_FOUND", "Photo not found.");
  return storage.get(cid);
}
