import type { ImagePickerAsset } from "expo-image-picker";
import { Platform } from "react-native";

export type PhotoKind =
  | "merchant"
  | "product"
  | "avatar"
  | "document"
  | "vehicle";

export type SupportedImageMime = "image/jpeg" | "image/png" | "image/webp";

export type OptimizedPhoto = {
  uri: string;
  name: string;
  type: SupportedImageMime;
  width: number;
  height: number;
};

function resolveMimeType(asset: ImagePickerAsset): SupportedImageMime {
  const mimeType = asset.mimeType?.toLowerCase();

  if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
    return "image/jpeg";
  }

  if (mimeType === "image/png") {
    return "image/png";
  }

  if (mimeType === "image/webp") {
    return "image/webp";
  }

  const fileName = asset.fileName?.toLowerCase() ?? "";
  const uri = asset.uri.toLowerCase();

  if (
    fileName.endsWith(".jpg") ||
    fileName.endsWith(".jpeg") ||
    uri.endsWith(".jpg") ||
    uri.endsWith(".jpeg")
  ) {
    return "image/jpeg";
  }

  if (fileName.endsWith(".png") || uri.endsWith(".png")) {
    return "image/png";
  }

  if (fileName.endsWith(".webp") || uri.endsWith(".webp")) {
    return "image/webp";
  }

  throw new Error(
    "Format foto tidak didukung. Gunakan JPG, JPEG, PNG, atau WebP.",
  );
}

function extensionForMime(type: SupportedImageMime): string {
  switch (type) {
    case "image/png":
      return "png";

    case "image/webp":
      return "webp";

    case "image/jpeg":
    default:
      return "jpg";
  }
}

export async function optimizePhoto(
  asset: ImagePickerAsset,
  kind: PhotoKind,
): Promise<OptimizedPhoto> {
  const type = resolveMimeType(asset);
  const extension = extensionForMime(type);

  return {
    uri: asset.uri,
    name: `antergo-${kind}-${Date.now()}.${extension}`,
    type,
    width: asset.width,
    height: asset.height,
  };
}

export async function appendPhoto(
  form: FormData,
  key: string,
  photo: OptimizedPhoto,
): Promise<void> {
  if (Platform.OS === "web") {
    const response = await fetch(photo.uri);

    if (!response.ok) {
      throw new Error("Foto tidak dapat dibaca.");
    }

    const sourceBlob = await response.blob();

    const blob = new Blob([sourceBlob], {
      type: photo.type,
    });

    form.append(key, blob, photo.name);

    return;
  }

  form.append(key, {
    uri: photo.uri,
    name: photo.name,
    type: photo.type,
  } as unknown as Blob);
}
