import { Platform } from "react-native";

import { PhotoInput as NativePhotoInput } from "./photo-input.native";
import { PhotoInput as WebPhotoInput } from "./photo-input.web";

export const PhotoInput =
  Platform.OS === "web" ? WebPhotoInput : NativePhotoInput;
