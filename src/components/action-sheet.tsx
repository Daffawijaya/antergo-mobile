import { Platform } from "react-native";

import { ActionSheet as NativeActionSheet } from "./action-sheet.native";
import { ActionSheet as WebActionSheet } from "./action-sheet.web";

export const ActionSheet =
  Platform.OS === "web" ? WebActionSheet : NativeActionSheet;

/* Re-export shared types so consumers only import from this file. */
export type { ActionSheetItem, ActionSheetProps, PhotoModeConfig } from "./action-sheet.native";
