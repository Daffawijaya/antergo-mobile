import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppIcon } from "./app-icon";
import { BackButton, StatusState } from "./ui";
import { Colors, Radius, Spacing, Typography } from "@/constants/colors";
import { listChatMessages, sendChatMessage } from "@/lib/api/chat";
import { getApiErrorMessage } from "@/lib/api/client";
import { chatKeys } from "@/lib/chat-query-keys";
import { formatDateTime } from "@/lib/format";
import { useAuthStore } from "@/stores/auth-store";
import { useAppTheme } from "@/stores/theme-store";
export function ChatThreadScreen({ orderId }: { orderId: number }) {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const client = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const [body, setBody] = useState("");
  const query = useQuery({
    queryKey: chatKeys.thread(orderId),
    queryFn: () => listChatMessages(orderId),
    enabled: Number.isFinite(orderId),
    refetchInterval: 3_000,
  });
  const mutation = useMutation({
    mutationFn: (message: string) => sendChatMessage(orderId, message),
    onSuccess: async () => {
      setBody("");
      await Promise.all([
        client.invalidateQueries({ queryKey: chatKeys.thread(orderId) }),
        client.invalidateQueries({ queryKey: chatKeys.all }),
      ]);
    },
  });
  const submit = () => {
    const message = body.trim();
    if (message && !mutation.isPending) mutation.mutate(message);
  };
  return (
    <SafeAreaView
      style={styles.safe}
      edges={["top", "left", "right", "bottom"]}
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <BackButton onPress={() => router.back()} />
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Chat pesanan</Text>
            <Text style={styles.subtitle}>Pesan #{orderId}</Text>
          </View>
        </View>
        {query.isLoading ? (
          <StatusState type="loading" />
        ) : query.isError ? (
          <StatusState type="error" message={getApiErrorMessage(query.error)} />
        ) : (
          <ScrollView
            style={styles.messages}
            contentContainerStyle={styles.messagesContent}
            keyboardShouldPersistTaps="handled"
          >
            {!query.data?.length ? (
              <View style={styles.start}>
                <AppIcon name="chat" size={26} color={Colors.primary} />
                <Text style={styles.startTitle}>Mulai percakapan</Text>
                <Text style={styles.startCopy}>
                  Gunakan chat untuk informasi terkait pickup dan pengantaran.
                </Text>
              </View>
            ) : (
              query.data.map((message) => {
                const mine = message.sender_id === userId;
                return (
                  <View
                    key={message.id}
                    style={[styles.messageRow, mine && styles.messageRowMine]}
                  >
                    <View style={[styles.bubble, mine && styles.bubbleMine]}>
                      <Text
                        style={[styles.message, mine && styles.messageMine]}
                      >
                        {message.body}
                      </Text>
                      <Text
                        style={[styles.timestamp, mine && styles.timestampMine]}
                      >
                        {formatDateTime(message.created_at)}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}
        {mutation.isError ? (
          <Text style={styles.error}>{getApiErrorMessage(mutation.error)}</Text>
        ) : null}
        <View style={styles.composer}>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Tulis pesan…"
            placeholderTextColor={Colors.subtle}
            multiline
            maxLength={2000}
            style={styles.input}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Kirim pesan"
            disabled={!body.trim() || mutation.isPending}
            onPress={submit}
            style={[
              styles.send,
              (!body.trim() || mutation.isPending) && styles.disabled,
            ]}
          >
            <AppIcon name="send" size={21} color={Colors.onPrimary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const createStyles = (colors: ReturnType<typeof useAppTheme>["colors"]) => StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  headerCopy: { gap: 1 },
  title: { color: colors.text, ...Typography.cardTitle },
  subtitle: { color: colors.muted, ...Typography.caption },
  messages: { flex: 1 },
  messagesContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  messageRow: { alignItems: "flex-start" },
  messageRowMine: { alignItems: "flex-end" },
  bubble: {
    maxWidth: "82%",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleMine: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  message: { color: colors.text, ...Typography.body },
  messageMine: { color: Colors.onPrimary },
  timestamp: { color: colors.muted, fontSize: 10 },
  timestampMine: { color: "#5C4700" },
  start: { alignItems: "center", gap: Spacing.sm, padding: Spacing.xxxl },
  startTitle: { color: colors.text, ...Typography.cardTitle },
  startCopy: {
    color: colors.muted,
    ...Typography.metadata,
    textAlign: "center",
  },
  composer: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.sm,
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 46,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: 15,
    paddingVertical: 11,
    borderRadius: 23,
    backgroundColor: colors.surfaceMuted,
  },
  send: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary,
  },
  disabled: { opacity: 0.45 },
  error: {
    color: Colors.danger,
    ...Typography.caption,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
});
