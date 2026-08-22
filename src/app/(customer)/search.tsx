import { useQuery } from "@tanstack/react-query";
import { useFocusEffect, useRouter } from "expo-router";
import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { AppIcon } from "@/components/app-icon";
import {
  Animated,
  BackHandler,
  Dimensions,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors } from "@/constants/colors";
import { listNearbyProducts } from "@/lib/api/food";
import { formatRupiah } from "@/lib/format";
import { useLocationPickerStore } from "@/stores/location-picker-store";
import { useAppTheme } from "@/stores/theme-store";
import { useTranslation } from "@/i18n";

type Filter = "all" | "food" | "shopping" | "ride";

export default function SearchScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t } = useTranslation();
  const SCREEN_HEIGHT = Dimensions.get("window").height;
  const translateY = useRef(new Animated.Value(-SCREEN_HEIGHT)).current;
  const animating = useRef(false);

  const animateBack = useCallback(() => {
    if (animating.current) return;
    animating.current = true;
    Keyboard.dismiss();
    Animated.timing(translateY, {
      toValue: -SCREEN_HEIGHT,
      duration: 300,
      useNativeDriver: true,
    }).start(() => router.back());
  }, [translateY, SCREEN_HEIGHT, router]);

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: 0,
      damping: 20,
      stiffness: 120,
      mass: 0.8,
      useNativeDriver: true,
    }).start();
  }, [translateY]);

  // Handle Android hardware back button
  useEffect(() => {
    const handler = () => {
      animateBack();
      return true;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", handler);
    return () => sub.remove();
  }, [animateBack]);

  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const destination = useLocationPickerStore(
    (state) => state.selections["food-destination"],
  );
  useFocusEffect(
    useCallback(() => {
      if (useLocationPickerStore.getState().selections["food-destination"])
        return;
      let cancelled = false;
      void (async () => {
        const state = useLocationPickerStore.getState();
        const point =
          state.currentLocation ?? (await state.refreshCurrentLocation());
        if (cancelled || !point) return;
        useLocationPickerStore
          .getState()
          .setSelection("food-destination", point);
      })();
      return () => {
        cancelled = true;
      };
    }, []),
  );
  const productType =
    filter === "food" ? "food" : filter === "shopping" ? "goods" : undefined;
  const results = useQuery({
    queryKey: ["search", submitted, filter],
    queryFn: () => listNearbyProducts(1, submitted, productType),
    enabled: filter !== "ride" && submitted.length > 0,
  });
  const submit = (value = query) => {
    const term = value.trim();
    if (!term) return;
    setQuery(term);
    setSubmitted(term);
    Keyboard.dismiss();
  };
  const chooseFilter = (next: Filter) => {
    setFilter(next);
    if (next === "ride") setSubmitted("");
  };
  const openProduct = (merchantId: number, type: "food" | "goods") =>
    router.push({
      pathname: "/(customer)/food/merchant/[id]",
      params: {
        id: String(merchantId),
        service: type === "goods" ? "shopping" : "food",
      },
    });

  return (
    <View style={styles.container}>
    <Animated.View
      style={[styles.screen, { transform: [{ translateY }] }]}
    >
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.locationRow}>
          <Pressable onPress={animateBack} style={styles.back}>
            <AppIcon name="back" size={26} color={colors.text} />
          </Pressable>
          <Pressable
            style={styles.locationCopy}
            onPress={() =>
              router.push({
                pathname: "/(customer)/location-search",
                params: {
                  purpose: "food-destination",
                  returnTo: "/(customer)/search",
                },
              })
            }
          >
            <Text style={styles.locationLabel}>{t("search.deliverNow")}</Text>
            <Text numberOfLines={1} style={styles.locationValue}>
              {destination?.address || t("search.pickAddress")}
            </Text>
          </Pressable>
          <AppIcon name="down" size={22} color={colors.text} />
        </View>

        <View style={styles.searchBox}>
          <AppIcon name="search" size={23} color={colors.muted} />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => submit()}
            returnKeyType="search"
            placeholder={t("search.placeholder")}
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
          {query ? (
            <Pressable
              onPress={() => {
                setQuery("");
                setSubmitted("");
              }}
            >
              <AppIcon name="close" size={20} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          <FilterChip
            label={t("search.all")}
            selected={filter === "all"}
            onPress={() => chooseFilter("all")}
          />
          <FilterChip
            label={t("search.food")}
            icon="restaurant"
            selected={filter === "food"}
            onPress={() => chooseFilter("food")}
          />
          <FilterChip
            label={t("search.shopping")}
            icon="shopping_bag"
            selected={filter === "shopping"}
            onPress={() => chooseFilter("shopping")}
          />
          <FilterChip
            label={t("search.ride")}
            icon="directions_car"
            selected={filter === "ride"}
            onPress={() => chooseFilter("ride")}
          />
        </ScrollView>

        {filter === "ride" ? (
          <View style={styles.section}>
            <Text style={styles.heading}>{t("search.bookRide")}</Text>
            <Pressable
              style={styles.rideRow}
              onPress={() =>
                router.push({
                  pathname: "/(customer)/ride/create",
                  params: { service: "bike" },
                })
              }
            >
              <Image
                source={require("../../../assets/images/icon/bike.png")}
                style={styles.rideIcon}
                resizeMode="contain"
                accessibilityLabel="Motor"
              />
              <View style={styles.resultCopy}>
                <Text style={styles.resultTitle}>{t("service.motor")}</Text>
                <Text style={styles.resultMeta}>{t("search.bikeRide")}</Text>
              </View>
              <AppIcon name="forward" size={21} color={colors.text} />
            </Pressable>
            <Pressable
              style={styles.rideRow}
              onPress={() =>
                router.push({
                  pathname: "/(customer)/ride/create",
                  params: { service: "car" },
                })
              }
            >
              <Image
                source={require("../../../assets/images/icon/car.png")}
                style={styles.rideIcon}
                resizeMode="contain"
                accessibilityLabel="Mobil"
              />
              <View style={styles.resultCopy}>
                <Text style={styles.resultTitle}>{t("service.car")}</Text>
                <Text style={styles.resultMeta}>{t("search.carRide")}</Text>
              </View>
              <AppIcon name="forward" size={21} color={colors.text} />
            </Pressable>
          </View>
        ) : submitted ? (
          <View style={styles.section}>
            <Text style={styles.heading}>{t("search.results")}</Text>
            {results.isLoading ? (
              <Text style={styles.empty}>{t("search.searching")}</Text>
            ) : !results.data?.data.length ? (
              <Text style={styles.empty}>
                {t("search.noResults").replace("{query}", submitted)}
              </Text>
            ) : (
              results.data.data.map((product) => (
                <Pressable
                  key={product.id}
                  style={styles.resultRow}
                  onPress={() =>
                    openProduct(product.merchant_id, product.product_type)
                  }
                >
                  {product.image ? (
                    <Image
                      source={{ uri: product.image }}
                      style={styles.image}
                    />
                  ) : (
                    <View style={styles.imageFallback}>
                      <Text style={styles.fallbackEmoji}>
                        {product.product_type === "goods" ? "🛍️" : "🍜"}
                      </Text>
                    </View>
                  )}
                  <View style={styles.resultCopy}>
                    <Text numberOfLines={1} style={styles.resultTitle}>
                      {product.name}
                    </Text>
                    <Text numberOfLines={1} style={styles.resultMeta}>
                      {product.merchant?.name ?? t("home.defaultStore")}
                    </Text>
                    <Text style={styles.price}>
                      {formatRupiah(product.price)}
                    </Text>
                  </View>
                  <AppIcon name="forward" size={21} color={colors.text} />
                </Pressable>
              ))
            )}
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.heading}>{t("search.searchOnAnterGo")}</Text>
            <Text style={styles.empty}>
              {t("search.searchHint")}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
    </Animated.View>
    </View>
  );
}

function FilterChip({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon?: "restaurant" | "shopping_bag" | "directions_car";
  selected: boolean;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <Pressable
      onPress={onPress}
      style={[styles.filter, selected && styles.filterSelected]}
    >
      {icon ? (
        <AppIcon
          name={
            icon === "restaurant"
              ? "utensils"
              : icon === "shopping_bag"
                ? "bag"
                : "car"
          }
          size={18}
          color={selected ? Colors.onPrimary : colors.text}
        />
      ) : null}
      <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const createStyles = (colors: ReturnType<typeof useAppTheme>["colors"]) => StyleSheet.create({
  container: { flex: 1 },
  screen: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.background,
  },
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 30 },
  locationRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  back: {
    width: 40,
    height: 40,
    marginLeft: -12,
    alignItems: "center",
    justifyContent: "center",
  },
  locationCopy: { flex: 1, marginLeft: 4 },
  locationLabel: {
    color: colors.text,
    fontSize: 12,
    fontFamily: "Outfit_500Medium",
  },
  locationValue: {
    color: colors.text,
    fontSize: 18,
    fontFamily: "Outfit_700Bold",
  },
  searchBox: {
    minHeight: 48,
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontFamily: "Outfit_400Regular",
  },
  filters: { gap: 8, paddingVertical: 12 },
  filter: {
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterSelected: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  filterText: {
    color: colors.text,
    fontSize: 14,
    fontFamily: "Outfit_600SemiBold",
  },
  filterTextSelected: { color: Colors.onPrimary },
  section: { paddingTop: 5 },
  heading: {
    color: colors.text,
    fontSize: 20,
    fontFamily: "Outfit_700Bold",
    marginBottom: 20,
  },

  resultRow: {
    minHeight: 84,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  image: { width: 58, height: 58, borderRadius: 12 },
  imageFallback: {
    width: 58,
    height: 58,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primarySoft,
  },
  fallbackEmoji: { fontSize: 28 },
  resultCopy: { flex: 1, gap: 2 },
  resultTitle: {
    color: colors.text,
    fontSize: 17,
    fontFamily: "Outfit_600SemiBold",
  },
  resultMeta: {
    color: colors.muted,
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
  },
  price: {
    color: Colors.primaryDark,
    fontSize: 14,
    fontFamily: "Outfit_700Bold",
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: "Outfit_400Regular",
  },
  rideRow: {
    minHeight: 86,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rideIcon: { width: 56, height: 56 },
  rideEmoji: { width: 58, fontSize: 38, textAlign: "center" },
});
