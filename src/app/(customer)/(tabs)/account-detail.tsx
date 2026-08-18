import { isAxiosError } from "axios";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import type { ImagePickerAsset } from "expo-image-picker";
import { AppIcon } from "@/components/app-icon";
import { HiUserCircleIcon, PencilIcon } from "@/components/brand-icons";
import { FormField, Notice, Screen } from "@/components/ui";
import { getApiErrorMessage } from "@/lib/api/client";
import { roleAvatar } from "@/lib/user-avatar";
import { useAppTheme } from "@/stores/theme-store";
import { useAuthStore } from "@/stores/auth-store";
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
  const [pickedPhoto, setPickedPhoto] = useState<ImagePickerAsset | null>(null);
  // While a new photo is picked but not yet saved, show the local preview.
  const avatarSource = pickedPhoto?.uri ?? avatar;
  
  // Re-entering the page resets the form to the saved data: unsaved edits are
  // discarded when the user leaves, so coming back shows the original values.
  useFocusEffect(
    useCallback(() => {
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

  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });
    if (!result.canceled) {
      // Preview only — the photo is uploaded (and converted to WebP on the
      // backend) when the user taps "Simpan".
      setPickedPhoto(result.assets[0]);
      setSuccess(false);
      setError("");
    }
  };

  return (
    <Screen
      padded={false}
      contentStyle={{ gap: 20, paddingHorizontal: 20, paddingTop: 8 }}
    >
      {/* Header follows the create pages: same padding, same back icon, and a
          text-only "Simpan" at the far right that only appears on changes. */}
      <View className="mt-2 flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Kembali"
          onPress={() => router.replace("/(customer)/(tabs)/profile")}
          className="h-10 w-10 -ml-3 items-center justify-center rounded-full active:opacity-70"
        >
          <AppIcon name="back" size={26} color={colors.text} />
        </Pressable>
        {dirty || pickedPhoto ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Simpan perubahan"
            disabled={saving}
            onPress={save}
            className="h-10 items-center justify-center px-1 active:opacity-70"
          >
            <Text className="font-sans text-base text-brand">
              {saving ? "Menyimpan…" : "Simpan"}
            </Text>
          </Pressable>
        ) : null}
      </View>
      <View className="items-center py-3">
        <Pressable onPress={handlePickAvatar} className="relative">
          {avatarSource ? (
            <View className="h-28 w-28 overflow-hidden rounded-full">
              <Image
                source={{ uri: avatarSource }}
                className="h-full w-full"
                resizeMode="cover"
              />
            </View>
          ) : (
            <HiUserCircleIcon size={112} color={colors.muted} />
          )}
          <View className="absolute bottom-1 right-1 rounded-full bg-surface p-2 shadow-sm">
            <PencilIcon size={16} color={colors.text} />
          </View>
        </Pressable>
      </View>
      <View className="gap-5">
        <FormField
          label="Nama"
          value={name}
          onChangeText={setName}
          placeholder="Nama lengkap"
          error={fieldErrors.name}
        />
        <FormField
          label="Nomor ponsel"
          value={phone}
          onChangeText={setPhone}
          placeholder="Contoh: 0812xxxx"
          keyboardType="phone-pad"
          error={fieldErrors.phone}
        />
        <FormField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="nama@email.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          error={fieldErrors.email}
        />
      </View>
      {success ? (
        <Notice tone="success">Perubahan berhasil disimpan.</Notice>
      ) : null}
      {error ? <Notice tone="danger">{error}</Notice> : null}
      <Text className="text-center text-[13px] leading-5 text-muted">
        Perubahan langsung tersimpan ke akun AnterGo-mu.
      </Text>
    </Screen>
  );
}
