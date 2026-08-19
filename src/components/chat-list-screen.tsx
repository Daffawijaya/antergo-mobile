import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppIcon } from "./app-icon";
import { orderService, ServiceIcon } from "./service-icon";
import { Screen } from "./ui";
import { Colors } from "@/constants/colors";
import { listChatConversations } from "@/lib/api/chat";
import { chatKeys } from "@/lib/chat-query-keys";
import { formatDateTime } from "@/lib/format";
import { useAppTheme } from "@/stores/theme-store";
export function ChatListScreen({ role }: { role: "customer" | "driver" }) {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const query = useQuery({
    queryKey: chatKeys.all,
    queryFn: listChatConversations,
    refetchInterval: 5_000,
  });
  return (
    <Screen contentStyle={styles.screen} padded={false}>
      {/* Header style follows the send/create hero title: same padding
          and 22px bold title, without the gradient background. */}
      <View className="mt-2">
        <Text className="font-bold text-[22px] leading-7 text-foreground">
          Pesan
        </Text>
      </View>
      {query.isLoading ? (
        <Text style={styles.state}>Memuat pesan…</Text>
      ) : query.isError ? (
        <Text style={styles.state}>Percakapan belum dapat dimuat.</Text>
      ) : !query.data?.length ? (
        <View style={styles.empty}>
          <View style={styles.emptyIcon}>
            <AppIcon name="inbox" size={30} color={Colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Belum ada pesan</Text>
          <Text style={styles.state}>
            Chat tersedia setelah driver menerima pesanan.
          </Text>
        </View>
      ) : (
        <View style={styles.list}>
          {query.data.map((order) => {
            const person =
              role === "customer" ? order.driver?.user : order.user;
            const last = order.chat_messages?.[0];
            return (
              <Pressable
                key={order.id}
                onPress={() =>
                  router.push({
                    pathname:
                      role === "customer"
                        ? "/(customer)/(tabs)/chat/[id]"
                        : "/(driver)/chat/[id]",
                    params: { id: String(order.id) },
                  })
                }
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <ServiceIcon type={orderService(order)} size={52} />
                <View style={styles.copy}>
                  <View style={styles.nameRow}>
                    <Text numberOfLines={1} style={styles.name}>
                      {person?.name ??
                        (role === "customer" ? "Driver AnterGo" : "Pelanggan")}
                    </Text>
                    <Text style={styles.time}>
                      {last ? formatDateTime(last.created_at) : ""}
                    </Text>
                  </View>
                  <Text style={styles.order}>{order.order_number}</Text>
                  <Text numberOfLines={1} style={styles.preview}>
                    {last?.body ?? "Mulai percakapan"}
                  </Text>
                </View>
                {order.unread_count > 0 ? (
                  <View style={styles.unread}>
                    <Text style={styles.unreadText}>
                      {Math.min(order.unread_count, 99)}
                    </Text>
                  </View>
                ) : (
                  <AppIcon name="forward" size={20} color="#A0A0A0" />
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </Screen>
  );
}
const createStyles = (colors: ReturnType<typeof useAppTheme>["colors"]) => StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  list: { borderTopWidth: 1, borderTopColor: colors.border },
  row: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  copy: { flex: 1, gap: 2 },
  nameRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  name: {
    flex: 1,
    color: colors.text,
    fontSize: 17,
    fontFamily: "Outfit_700Bold",
  },
  time: { color: colors.muted, fontSize: 10, fontFamily: "Outfit_400Regular" },
  order: {
    color: Colors.primaryDark,
    fontSize: 11,
    fontFamily: "Outfit_600SemiBold",
  },
  preview: { color: colors.muted, fontSize: 14, fontFamily: "Outfit_400Regular" },
  unread: {
    minWidth: 23,
    height: 23,
    paddingHorizontal: 6,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
  },
  unreadText: { color: Colors.onPrimary, fontSize: 11, fontFamily: "Outfit_700Bold" },
  empty: {
    minHeight: 330,
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
  },
  emptyIcon: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceMuted,
  },
  emptyTitle: { color: colors.text, fontSize: 20, fontFamily: "Outfit_700Bold" },
  state: {
    color: colors.muted,
    fontSize: 14,
    textAlign: "center",
    fontFamily: "Outfit_400Regular",
  },
  pressed: { opacity: 0.65 },
});
