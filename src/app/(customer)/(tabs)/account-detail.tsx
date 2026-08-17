import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { AppIcon } from "@/components/app-icon";
import { BackButton, Screen } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { useAuthStore } from "@/stores/auth-store";

export default function AccountDetailScreen() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  return (
    <Screen className="gap-5 px-4 pt-2">
      <View className="flex-row items-center justify-between">
        <BackButton onPress={() => router.replace("/(customer)/profile")} />
        <Text className="font-bold text-lg text-foreground">Detail akun</Text>
        <View className="h-10 w-10" />
      </View>
      <View className="items-center py-3">
        <View className="h-28 w-28 items-center justify-center rounded-full bg-brand">
          <AppIcon name="profile" size={68} color={Colors.onPrimary} />
        </View>
      </View>
      <View className="gap-5">
        <ReadOnlyField label="Nama" value={user?.name} />
        <ReadOnlyField label="Nomor ponsel" value={user?.phone} />
        <ReadOnlyField label="Email" value={user?.email} />
      </View>
      <View className="mt-3 border-t border-border pt-5">
        <Text className="font-bold text-lg text-foreground">Profil</Text>
        <Text className="mt-2 text-sm leading-5 text-muted">
          Informasi akun berasal dari data AnterGo. Pengeditan belum tersedia
          pada API saat ini.
        </Text>
      </View>
    </Screen>
  );
}
function ReadOnlyField({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <View className="gap-2">
      <Text className="font-medium text-base text-foreground">{label}</Text>
      <View className="min-h-14 justify-center rounded-2xl border border-border bg-surface px-4">
        <Text className="font-sans text-base text-foreground">
          {value || "Belum tersedia"}
        </Text>
      </View>
    </View>
  );
}
