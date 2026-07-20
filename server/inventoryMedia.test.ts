import { describe, expect, it } from "vitest";
import {
  buildExternalInventoryMediaRows,
  buildInventoryMediaStorageKey,
  buildLegacyInventoryMediaFields,
  inferInventoryMediaTypeFromMime,
  isAllowedInventoryMediaMime,
  sanitizeInventoryFileName,
} from "./inventoryMedia";

describe("inventoryMedia", () => {
  it("buildLegacyInventoryMediaFields mantém imagem primária e vídeo principal", () => {
    const result = buildLegacyInventoryMediaFields([
      { id: 10, mediaType: "image", sourceMode: "upload", storageProvider: "s3", url: "https://cdn/b.jpg", sortOrder: 2, isPrimary: false, status: "active" },
      { id: 11, mediaType: "image", sourceMode: "upload", storageProvider: "s3", url: "https://cdn/a.jpg", sortOrder: 1, isPrimary: true, status: "active" },
      { id: 12, mediaType: "video", sourceMode: "upload", storageProvider: "s3", url: "https://cdn/v.mp4", sortOrder: 4, isPrimary: true, status: "active" },
    ]);

    expect(result.photoUrl).toBe("https://cdn/a.jpg");
    expect(result.photos).toBe(JSON.stringify(["https://cdn/a.jpg", "https://cdn/b.jpg"]));
    expect(result.videoUrl).toBe("https://cdn/v.mp4");
  });

  it("buildExternalInventoryMediaRows deduplica URLs e marca a primeira imagem como principal", () => {
    const result = buildExternalInventoryMediaRows({
      tenantId: 3,
      vehicleId: 77,
      actorId: 9,
      photoUrl: "https://cdn/a.jpg",
      photos: ["https://cdn/a.jpg", "https://cdn/b.jpg"],
      videoUrl: "https://cdn/test.mp4",
    });

    expect(result).toHaveLength(3);
    expect(result[0].url).toBe("https://cdn/a.jpg");
    expect(result[0].isPrimary).toBe(true);
    expect(result[1].url).toBe("https://cdn/b.jpg");
    expect(result[2].mediaType).toBe("video");
  });

  it("gera key de bucket no padrão de inventory/images e inventory/videos", () => {
    const imageKey = buildInventoryMediaStorageKey({
      tenantId: 1,
      vehicleId: 15,
      mediaType: "image",
      fileName: "carro principal.png",
      mimeType: "image/png",
    });
    const videoKey = buildInventoryMediaStorageKey({
      tenantId: 1,
      vehicleId: 15,
      mediaType: "video",
      fileName: "tour.mp4",
      mimeType: "video/mp4",
    });

    expect(imageKey).toMatch(/^inventory\/15\/images\/.+\.png$/);
    expect(videoKey).toMatch(/^inventory\/15\/videos\/.+\.mp4$/);
  });

  it("valida e infere mime types permitidos", () => {
    expect(inferInventoryMediaTypeFromMime("image/jpeg")).toBe("image");
    expect(inferInventoryMediaTypeFromMime("video/webm")).toBe("video");
    expect(inferInventoryMediaTypeFromMime("application/pdf")).toBeNull();
    expect(isAllowedInventoryMediaMime("image/webp")).toBe(true);
    expect(isAllowedInventoryMediaMime("application/pdf")).toBe(false);
  });

  it("sanitiza nome de arquivo sem esvaziar o valor", () => {
    expect(sanitizeInventoryFileName(" vídeo@tour?.mp4 ")).toBe("vídeo_tour_.mp4");
    expect(sanitizeInventoryFileName("   ")).toBe("arquivo");
  });
});
