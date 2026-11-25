import { Router } from "express";
import multer from "multer";
import { config } from "../../config.js";
import { requireRole } from "../../middleware/requireRole.js";
import { uploadRateLimit } from "../../middleware/rateLimits.js";
import { getPhotoBytes, uploadPhoto } from "./service.js";
import { AppError } from "../../lib/errors.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: config.PHOTO_MAX_BYTES } });

export const uploadsRouter = Router();

uploadsRouter.post("/photos", requireRole("CENTRE_OPERATOR", "ADMIN"), uploadRateLimit, upload.single("photo"), async (req, res) => {
  if (!req.file) throw new AppError("VALIDATION", "No photo was uploaded.", { photo: "Required" });
  const photo = await uploadPhoto(req.user!, { buffer: req.file.buffer, size: req.file.size });
  res.json({ id: photo.id, cid: photo.cid, url: `${config.PUBLIC_BASE_URL}/api/photos/${photo.cid}`, sha256: photo.sha256, width: photo.width, height: photo.height, sizeBytes: photo.sizeBytes });
});

export const photosRouter = Router();

photosRouter.get("/:cid", async (req, res) => {
  const bytes = await getPhotoBytes((req.params.cid as string));
  res.setHeader("Content-Type", "image/jpeg");
  res.setHeader("Cache-Control", "public, max-age=86400, immutable");
  for await (const chunk of bytes) res.write(chunk);
  res.end();
});
