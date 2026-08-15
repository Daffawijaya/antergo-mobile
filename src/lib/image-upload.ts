import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import type { ImagePickerAsset } from "expo-image-picker";
import { Platform } from "react-native";

export type PhotoKind =
  | "merchant"
  | "product"
  | "avatar"
  | "document"
  | "vehicle";

export type OptimizedPhoto = {
  uri: string;
  name: string;
  type: "image/webp";
  width: number;
  height: number;
};

const settings: Record<PhotoKind, { edge: number; quality: number }> = {
  merchant: {
    edge: 1600,
    quality: 0.84,
  },
  product: {
    edge: 1400,
    quality: 0.84,
  },
  avatar: {
    edge: 1000,
    quality: 0.84,
  },
  document: {
    edge: 2200,
    quality: 0.9,
  },
  vehicle: {
    edge: 1800,
    quality: 0.86,
  },
};

export async function optimizePhoto(
  asset: ImagePickerAsset,
  kind: PhotoKind,
): Promise<OptimizedPhoto> {
  const { edge, quality } = settings[kind];

  const context = ImageManipulator.manipulate(asset.uri);

  if (asset.width > edge || asset.height > edge) {
    if (asset.width >= asset.height) {
      context.resize({
        width: edge,
        height: null,
      });
    } else {
      context.resize({
        width: null,
        height: edge,
      });
    }
  }

  const rendered = await context.renderAsync();

  const result = await rendered.saveAsync({
    compress: quality,
    format: SaveFormat.WEBP,
  });

  return {
    uri: result.uri,
    name: `antergo-${kind}-${Date.now()}.webp`,
    type: "image/webp",
    width: result.width,
    height: result.height,
  };
}

export async function appendPhoto(
  form: FormData,
  key: string,
  photo: OptimizedPhoto,
): Promise<void> {
  if (Platform.OS === "web") {
    const response = await fetch(photo.uri);
    const sourceBlob = await response.blob();

    const webpBlob = new Blob([sourceBlob], {
      type: "image/webp",
    });

    form.append(key, webpBlob, photo.name);

    return;
  }

  form.append(key, {
    uri: photo.uri,
    name: photo.name,
    type: photo.type,
  } as unknown as Blob);
}
