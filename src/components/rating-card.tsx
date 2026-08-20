import { useMemo as useThemeMemo , useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button, Card, FormField, KeyValue } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { useTranslation } from "@/i18n";
import { getApiErrorMessage } from "@/lib/api/client";
import { submitOrderRating } from "@/lib/api/payment-rating";
import type { Order, RatingTarget } from "@/types/api";
import { useAppTheme } from "@/stores/theme-store";

export function RatingCard({
  order,
  queryKey,
}: {
  order: Order;
  queryKey: readonly unknown[];
}) {
  const { styles } = useScreenStyles();
  const { t } = useTranslation();
  const client = useQueryClient();
  const [score, setScore] = useState(0);
  const [comment, setComment] = useState("");
  const defaultTarget: RatingTarget =
    order.type === "food" ? "merchant" : "driver";
  const [target, setTarget] = useState<RatingTarget>(defaultTarget);
  const mutation = useMutation({
    mutationFn: () =>
      submitOrderRating(order.id, {
        target,
        rating: score,
        comment: comment.trim() || null,
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey });
    },
  });

  if (order.status !== "completed") return null;
  if (order.payment_status !== "paid")
    return (
      <Card>
        <Text style={styles.title}>{t("rating.title")}</Text>
        <Text style={styles.body}>
          {t("rating.availableAfter")}
        </Text>
      </Card>
    );
  if (order.rating)
    return (
      <Card>
        <Text style={styles.title}>{t("rating.yourRating")}</Text>
        <KeyValue
          label={t("rating.target")}
          value={order.rating.driver_id ? "Driver" : t("rating.merchant")}
        />
        <Text style={styles.stars}>
          {"★".repeat(order.rating.rating)}
          {"☆".repeat(5 - order.rating.rating)}
        </Text>
        {order.rating.comment ? (
          <Text style={styles.body}>{order.rating.comment}</Text>
        ) : null}
      </Card>
    );

  return (
    <Card>
      <Text style={styles.title}>{t("rating.giveRating")}</Text>
      {order.type === "food" ? (
        <View style={styles.targets}>
          <Button
            title={t("rating.merchant")}
            variant={target === "merchant" ? "primary" : "secondary"}
            onPress={() => setTarget("merchant")}
          />
          <Button            title="Driver"
            variant={target === "driver" ? "primary" : "secondary"}
            onPress={() => setTarget("driver")}
          />

        </View>
      ) : null}
      <View style={styles.starRow}>
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityLabel={`${value} bintang`}
            onPress={() => setScore(value)}
          >
            <Text style={[styles.star, value <= score && styles.starActive]}>
              ★
            </Text>
          </Pressable>
        ))}
      </View>
      <FormField
        label={t("rating.commentOptional")}
        value={comment}
        onChangeText={setComment}
        multiline
        numberOfLines={3}
        maxLength={1000}
      />
      {score === 0 ? (
        <Text style={styles.hint}>{t("rating.selectStars")}</Text>
      ) : null}
      {mutation.isError ? (
        <Text style={styles.error}>{getApiErrorMessage(mutation.error)}</Text>
      ) : null}
      <Button
        title={t("rating.submitRating")}
        disabled={score === 0}
        loading={mutation.isPending}
        onPress={() => mutation.mutate()}
      />
    </Card>
  );
}

function useScreenStyles() {
  const { colors } = useAppTheme();
  return { styles: useThemeMemo(() => createStyles(colors), [colors]) };
}
const createStyles = (colors: ReturnType<typeof useAppTheme>["colors"]) => StyleSheet.create({
  title: { color: colors.text, fontSize: 18, fontWeight: "800" },
  body: { color: colors.text, lineHeight: 20 },
  targets: { gap: 8 },
  starRow: { flexDirection: "row", gap: 8 },
  star: { color: colors.border, fontSize: 38 },
  starActive: { color: "#F59E0B" },
  stars: { color: "#F59E0B", fontSize: 26 },
  hint: { color: colors.muted },
  error: { color: Colors.danger, lineHeight: 20 },
});
