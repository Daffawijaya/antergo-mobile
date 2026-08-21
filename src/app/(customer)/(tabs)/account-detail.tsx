import { isAxiosError } from "axios";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Image } from "expo-image";
import { Pressable, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import type { ImagePickerAsset } from "expo-image-picker";
import { ActionSheet } from "@/components/action-sheet";
import { AppIcon } from "@/components/app-icon";
import { HiMiniCameraIcon, HiUserCircleIcon } from "@/components/brand-icons";
import { FormField, Notice, Screen } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { getApiErrorMessage } from "@/lib/api/client";
import { roleAvatar } from "@/lib/user-avatar";
import { useAppTheme } from "@/stores/theme-store";
import { useAuthStore } from "@/stores/auth-store";
import { useTranslation } from "@/i18n";
import type { ApiErrorPayload } from "@/types/api";
import { updateCustomerPhoto } from "@/lib/api/auth";

export default function AccountDetailScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const user = useAuthStore((state) => state.user);
  const activeRole = useAuthStore((state) => state.activeRole);
  const avatar = roleAvatar(user, activeRole);
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const refreshUser = useAuthStore((state) => state.refreshUser);
  const [name, setName] = useState(user?.name ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    phone?: string;
    email?: string;
  }>({});
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [pickedPhoto, setPickedPhoto] = useState<ImagePickerAsset | null>(
    null,
  );
  const [photoSheetVisible, setPhotoSheetVisible] = useState(false);
  const { t } = useTranslation();
  // Track whether the photo-picker ActionSheet is open so we can skip
  // the useFocusEffect reset that fires when the native camera activity
  // closes and the screen regains focus.
  const pickingRef = useRef(false);

  // While a new photo is picked but not yet saved, show the local preview.
  const avatarSource = pickedPhoto?.uri ?? avatar;

  // Keep the ActionSheet open flag in sync so useFocusEffect can skip
  // the reset when the native camera/gallery activity returns.
  useEffect(() => {
    if (photoSheetVisible) {
      pickingRef.current = true;
    } else {
      // Allow a small window for the native camera activity to finish
      // regaining focus before we re-enable the focus-effect reset.
      const t = setTimeout(() => {
        pickingRef.current = false;
      }, 400);
      return () => clearTimeout(t);
    }
  }, [photoSheetVisible]);

  // Re-entering the page resets the form to the saved data: unsaved edits are
  // discarded when the user leaves, so coming back shows the original values.
  useFocusEffect(
    useCallback(() => {
      // Skip the reset when returning from a native camera/gallery activity –
      // the photo result is handled by handlePhotoPicked.
      if (pickingRef.current) return;
      setName(user?.name ?? "");
      setPhone(user?.phone ?? "");
      setEmail(user?.email ?? "");
      setFieldErrors({});
      setSuccess(false);
      setError("");
      setPickedPhoto(null);
    }, [user]),
  );
  // Also keep the form in sync when the stored user changes (e.g. after save).
  useEffect(() => {
    setName(user?.name ?? "");
    setPhone(user?.phone ?? "");
    setEmail(user?.email ?? "");
    setPickedPhoto(null);
  }, [user]);
  const dirty =
    name !== (user?.name ?? "") ||
    phone !== (user?.phone ?? "") ||
    email !== (user?.email ?? "");
  const validate = () => {
    const errors: typeof fieldErrors = {};
    if (!name.trim()) errors.name = "Nama wajib diisi.";
    if (!phone.trim()) errors.phone = "Nomor ponsel wajib diisi.";
    if (!email.trim()) errors.email = "Email wajib diisi.";
    else if (!/^\S+@\S+\.\S+$/.test(email.trim()))
      errors.email = "Format email tidak valid.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      if (pickedPhoto) {
        await updateCustomerPhoto(pickedPhoto);
      }
      await updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
      });
      await refreshUser();
      setPickedPhoto(null);
      setSuccess(true);
    } catch (cause) {
      if (isAxiosError<ApiErrorPayload>(cause)) {
        const errors = cause.response?.data?.errors;
        if (errors) {
          setFieldErrors({
            name: errors.name?.[0],
            phone: errors.phone?.[0],
            email: errors.email?.[0],
          });
          return;
        }
      }
      setError(getApiErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoPicked = (optimized: import("@/lib/image-upload").OptimizedPhoto) => {
    try {
      // Convert OptimizedPhoto back to ImagePickerAsset-like shape for compatibility
      setPickedPhoto({
        uri: optimized.uri,
        width: optimized.width,
        height: optimized.height,
        mimeType: optimized.type,
        fileName: optimized.name,
      } as ImagePickerAsset);
      setSuccess(false);
      setError("");
    } catch (e) {
      console.error("Error setting picked photo:", e);
      setError("Gagal memproses pratinjau foto.");
    }
  };

  const handleRemovePhoto = () => {
    setPickedPhoto(null);
    setSuccess(false);
    setError("");
  };

  return (
    <Screen
      padded={false}
      contentStyle={{ gap: 20, paddingHorizontal: 20, paddingTop: 8 }}
      header={
        <ActionSheet
          visible={photoSheetVisible}
          onClose={() => setPhotoSheetVisible(false)}
          photoMode={{
            kind: "avatar",
            onPicked: handlePhotoPicked,
            remove: pickedPhoto
              ? { label: t("accountDetail.removePhoto"), onRemove: handleRemovePhoto }
              : undefined,
          }}
        />
      }
    >
      {/* Header */}
      <View className="mt-2 flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          onPress={() => router.back()}
          className="h-10 w-10 -ml-3 items-center justify-center rounded-full active:opacity-70"
        >
          <AppIcon name="back" size={26} color={colors.text} />
        </Pressable>
        {dirty || pickedPhoto ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.save")}
            disabled={saving}
            onPress={save}
            className="h-10 items-center justify-center px-1 active:opacity-70"
          >
            <Text className="font-sans text-base text-brand">
              {saving ? t("accountDetail.saving") : t("common.save")}
            </Text>
          </Pressable>
        ) : null}
      </View>

      {/* Avatar with camera icon */}
      <View className="items-center py-3">
        <Pressable
          onPress={() => setPhotoSheetVisible(true)}
          className="relative"
        >
          {avatarSource ? (
            <View className="h-28 w-28 overflow-hidden rounded-full">
              <Image
                key={avatarSource}
                source={{ uri: avatarSource }}
                className="h-full w-full"
                contentFit="cover"
              />
            </View>
          ) : (
            <HiUserCircleIcon size={112} color={colors.muted} />
          )}
          <View className="absolute bottom-1 right-1 rounded-full bg-surface p-2 shadow-sm">
            <HiMiniCameraIcon size={16} color={colors.text} />
          </View>
        </Pressable>
      </View>

      {/* Form fields */}
      <View className="gap-5">
        <FormField
          label={t("accountDetail.name")}
          value={name}
          onChangeText={setName}
          placeholder={t("accountDetail.namePlaceholder")}
          error={fieldErrors.name}
        />
        <FormField
          label={t("accountDetail.phone")}
          value={phone}
          onChangeText={setPhone}
          placeholder={t("accountDetail.phonePlaceholder")}
          keyboardType="phone-pad"
          error={fieldErrors.phone}
        />
        <FormField
          label={t("accountDetail.email")}
          value={email}
          onChangeText={setEmail}
          placeholder={t("accountDetail.emailPlaceholder")}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          error={fieldErrors.email}
        />
      </View>
      {success ? (
        <Notice tone="success">{t("accountDetail.saved")}</Notice>
      ) : null}
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <Text className="text-center text-[13px] leading-5 text-muted">
        {t("accountDetail.photoHint")}
      </Text>

    </Screen>
  );
}
