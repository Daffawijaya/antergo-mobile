import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from "react-native-svg";
import { AppIcon } from "@/components/app-icon";
import { FaChevronRightIcon } from "@/components/brand-icons";
import { Screen, StatusState } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { listMerchants, listNearbyProducts } from "@/lib/api/food";
import { formatRupiah } from "@/lib/format";
import { useLocationPickerStore} from "@/stores/location-picker-store";
import { useAppTheme } from "@/stores/theme-store";
import { useTranslation } from "@/i18n";
import { LocationHeader } from "@/components/food-location-header";

type Sort = "latest" | "price-low" | "price-high";

// Per-service hero icon. Each require() must stay a static literal so
// Metro can bundle it; the selection happens on the resolved modules.
const SERVICE_ICONS = {
  food: require("../../../../assets/images/icon/food.png"),
  shopping: require("../../../../assets/images/icon/shopping.png"),
} as const;

// Per-service hero gradient: slightly darker shade on the left, vivid brand
// color on the right — same shape/contrast as the Bike hero gradient. Food
// is purple, Shopping is pink. The left side stays a bit darker for depth
// but is kept light enough for the white text to read well.
const SERVICE_GRADIENTS = {
  food: {
    light: { from: "#6D28D9", to: "#8B5CF6" },
    dark: { from: "#4C1D95", to: "#5B21B6" },
  },
  shopping: {
    light: { from: "#BE185D", to: "#EC4899" },
    dark: { from: "#9D174D", to: "#BE185D" },
  },
} as const;

// Bottom edge of the brand hero: a single smooth wave, mirroring the
// reference SVG `M0,100 C150,200 350,0 500,100` — one cubic curve across
// the full width that dips on the left, crosses the middle at the center
// and rises on the right, so the two halves stay symmetric.
// (Reference: https://stackoverflow.com/a/56012973, CC BY-SA 4.0)
function buildWavePath(
  width: number,
  heroHeight: number,
  fillBottom: number,
): string {
  const amplitude = Math.min(20, Math.max(12, width * 0.044));
  // Lift the wave a little above the hero's bottom edge so it floats
  // instead of touching the very bottom of the hero.
  const lift = 14;
  const middle = heroHeight - amplitude - lift;
  // The white fill runs from the wave all the way down to the bottom of
  // the hero so no purple shows below the wave.
  const bottom = fillBottom;
  // A single cubic only reaches ~29% of its control-point offset, so the
  // control points sit ~3.46× farther than the visible amplitude — the
  // reference does the same (its controls sit far outside the visible band).
  const controlAmplitude = amplitude * 3.464;
  return [
    `M 0,${bottom}`,
    `L ${width},${bottom}`,
    `L ${width},${middle}`,
    `C ${width * 0.7},${middle - controlAmplitude}, ${width * 0.3},${middle + controlAmplitude}, 0,${middle}`,
    "Z",
  ].join(" ");
}

export default function CommerceCatalogScreen() {
  const router = useRouter();
  const { mode, colors } = useAppTheme();
  const { service: rawService } = useLocalSearchParams<{ service?: string }>();
  const service = rawService === "shopping" ? "shopping" : "food";
  const { t } = useTranslation();
  const serviceLabel = service === "shopping" ? t("home.shopping") : t("home.food");
  const promoTitle = service === "shopping" ? t("food.cheapShopping") : t("food.cheapOrders");
  const promoSubtitle = t("food.driverReady");
  const promoSubtitle2 = t("food.toLocation");
  const destination = useLocationPickerStore(
    (state) => state.selections["food-destination"],
  );
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("latest");
  const [page, setPage] = useState(1);
  // Fill the delivery address instantly from the stored current location when
  // this screen gains focus with an empty address — the same concept as the
  // Delivery/Bike/Car create screens filling their pickup. The current
  // location is captured at app startup and refreshed whenever the user
  // leaves with a moved address, so re-entering shows it immediately.
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
  const merchants = useQuery({
    queryKey: ["merchants", "food", page],
    queryFn: () => listMerchants(page, "food"),
    placeholderData: keepPreviousData,
    enabled: service === "food",
  });
  const products = useQuery({
    queryKey: ["catalog", "shopping", search, page],
    queryFn: () => listNearbyProducts(page, search, "goods"),
    placeholderData: keepPreviousData,
    enabled: service === "shopping",
  });
  const merchantList = useMemo(() => {
    const term = search.toLowerCase();
    return (merchants.data?.data ?? []).filter(
      (merchant) =>
        !term ||
        merchant.name.toLowerCase().includes(term) ||
        merchant.category?.name.toLowerCase().includes(term),
    );
  }, [merchants.data?.data, search]);
  const productList = useMemo(() => {
    const data = [...(products.data?.data ?? [])];
    if (sort === "price-low")
      data.sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === "price-high")
      data.sort((a, b) => Number(b.price) - Number(a.price));
    return data;
  }, [products.data?.data, sort]);
  const activeQuery = service === "food" ? merchants : products;
  const paginator = service === "food" ? merchants.data : products.data;
  const submit = () => {
    setSearch(query.trim());
    setPage(1);
  };
  const openMerchant = (id: number) =>
    router.push({
      pathname: "/(customer)/food/merchant/[id]",
      params: {
        id: String(id),
        service,
        returnTo: `/(customer)/food?service=${service}`,
      },
    });
  const openPicker = () =>
    router.push({
      pathname: "/(customer)/location-search",
      params: {
        purpose: "food-destination",
        returnTo: `/(customer)/food?service=${service}`,
      },
    });
  // Sticky header: once the hero header has scrolled off the top, show a
  // bar that stays pinned to the top of the screen — white with black
  // text in light mode, theme-dark with white text in dark mode.
  const insets = useSafeAreaInsets();
  const [heroHeaderBottom, setHeroHeaderBottom] = useState(0);
  const [sticky, setSticky] = useState(false);
  const [heroWidth, setHeroWidth] = useState(0);
  const [heroHeight, setHeroHeight] = useState(0);
  const handleBack = () => {
    // Jika alamat pengantaran digeser/diubah user (bukan lagi lokasi terkini),
    // reset dan langsung ambil posisi terkini — jadi saat halaman dibuka lagi
    // alamat sudah terisi lokasi sekarang tanpa nunggu. Alamat yang masih
    // lokasi terkini (tidak digeser) tetap dipertahankan.
    const state = useLocationPickerStore.getState();
    const destination = state.selections["food-destination"];
    const current = state.currentLocation;
    const moved =
      !!destination &&
      (!current ||
        destination.coordinate.latitude !== current.coordinate.latitude ||
        destination.coordinate.longitude !== current.coordinate.longitude);
    if (moved) {
      state.clearSelection("food-destination");
      void state.refreshCurrentLocation();
    }
    router.back();
  };
  const gradient = SERVICE_GRADIENTS[service][mode];
  // White reads best on the (darker) purple hero.
  const heroColor = "#FFFFFF";



  return (
    <Screen
      padded={false}
      className="gap-0 bg-background"
      onScroll={(event) => {
        const y = event.nativeEvent.contentOffset.y;
        const shouldStick = heroHeaderBottom > 0 && y >= heroHeaderBottom;
        setSticky((prev) => (prev === shouldStick ? prev : shouldStick));
      }}
      header={
        sticky ? (
          <View
            className="px-5 py-5"
            style={{
              position: "absolute",
              top: insets.top,
              left: 0,
              right: 0,
              backgroundColor: colors.background,
            }}
          >
            <View className="flex-row items-center">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Kembali"
                onPress={handleBack}
                className="h-10 w-10 -ml-3 items-center justify-center rounded-full active:opacity-70"
              >
                <AppIcon
                  name="back"
                  size={26}
                  color={mode === "dark" ? "#FFFFFF" : "#000000"}
                />
              </Pressable>
              <Text
                className="font-bold text-[22px] leading-7"
                style={{ color: mode === "dark" ? "#FFFFFF" : "#000000" }}
              >
                {serviceLabel}
              </Text>
            </View>
          </View>
        ) : null
      }
    >
      <View
        className="px-4 pb-6"
        style={{ paddingTop: insets.top + 8 }}
        onLayout={(event) => {
          setHeroWidth(event.nativeEvent.layout.width);
          // The wave is the hero's bottom edge, so it must sit below all of
          // the hero's content (header, location card, search, promo).
          setHeroHeight(event.nativeEvent.layout.height);
        }}
      >
        <Svg
          width={heroWidth || 1}
          height={heroHeight || 300}
          style={{ position: "absolute", top: 0, left: 0, right: 0 }}
        >
          <Defs>
            <LinearGradient
              id="catalog-hero"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <Stop offset="0%" stopColor={gradient.from} />
              <Stop offset="100%" stopColor={gradient.to} />
            </LinearGradient>
          </Defs>
          {/* The purple only covers the hero itself; everything below the
              wave is the white fill running to the bottom of the hero. */}
          <Rect width="100%" height={heroHeight || 300} fill="url(#catalog-hero)" />
          {heroWidth > 0 ? (
            <Path
              d={buildWavePath(heroWidth, heroHeight || 300, heroHeight || 300)}
              fill={colors.background}
            />
          ) : null}
        </Svg>
        <View
          onLayout={(event) =>
            setHeroHeaderBottom(
              event.nativeEvent.layout.y + event.nativeEvent.layout.height,
            )
          }
        >
          <LocationHeader
            location={{
              value: destination?.address,
              placeholder: "Pilih alamat pengantaran",
              onPress: openPicker,
            }}
            onBack={handleBack}
          />
        </View>
        <View className="mt-4 flex-row items-center gap-2 rounded-xl bg-surface px-4 elevation-md">
          <AppIcon name="search" size={23} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={submit}
            returnKeyType="search"
            placeholder={
              service === "food" ? t("food.searchPlaceholderFood") : t("food.searchPlaceholderShopping")
            }
            placeholderTextColor={colors.muted}
            className="min-h-12 flex-1 text-base text-foreground"
          />
          {query ? (
            <Pressable
              onPress={() => {
                setQuery("");
                setSearch("");
                setPage(1);
              }}
            >
              <AppIcon name="close" size={20} color={colors.muted} />
            </Pressable>
          ) : null}
        </View>
        <View className="relative mt-3 min-h-[104px] justify-start pr-24">
          <Text
            className="mt-2 font-semibold text-[19px] leading-6"
            style={{ color: heroColor }}
          >
            {promoTitle}
          </Text>
          <View className="mt-1 flex-row items-center gap-2">
            <Text
              className="font-normal text-[15px] leading-5"
              style={{ color: heroColor }}
            >
              {promoSubtitle}
              {"\n"}
              {promoSubtitle2}
            </Text>
            <View className="h-[18px] w-[18px] items-center justify-center rounded-full bg-white">
              <FaChevronRightIcon size={10} color="#000000" />
            </View>
          </View>
          <View
            style={{
              position: "absolute",
              right: 0,
              top: 0,
              width: 88,
              height: 88,
              // Drop shadow follows the PNG's transparency, not the image box.
              filter: "drop-shadow(0 5px 12px rgba(0, 0, 0, 0.18))",
            }}
          >
            <Image
              source={SERVICE_ICONS[service]}
              style={{ width: 88, height: 88 }}
              resizeMode="contain"
              accessibilityLabel={serviceLabel}
            />
          </View>
        </View>
      </View>
      <View className="gap-4 px-4">
        {service === "shopping" ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2 py-3"
          >
            <Filter
              label={t("food.sortLatest")}
              selected={sort === "latest"}
              onPress={() => setSort("latest")}
            />
            <Filter
              label={t("food.sortPriceLow")}
              selected={sort === "price-low"}
              onPress={() => setSort("price-low")}
            />
            <Filter
              label={t("food.sortPriceHigh")}
              selected={sort === "price-high"}
              onPress={() => setSort("price-high")}
            />
          </ScrollView>
        ) : null}
        <Text className="font-extrabold text-[17px] text-foreground">
          {service === "food" ? t("food.umkmFood") : t("food.productsForYou")}
        </Text>
        {activeQuery.isLoading ? (
          <StatusState type="loading" />
        ) : activeQuery.isError ? (
          <StatusState type="error" message={t("food.dataLoadFailed")} />
        ) : service === "food" ? (
          !merchantList.length ? (
            <StatusState
              type="empty"
              message={
                search
                  ? t("food.noMerchantForSearch").replace("{query}", search)
                  : t("food.noMerchantAvailable")
              }
            />
          ) : (
            <View>
              {merchantList.map((merchant) => (
                <Pressable
                  key={merchant.id}
                  onPress={() => openMerchant(merchant.id)}
                  className="flex-row gap-3 border-b border-border py-3 active:opacity-75"
                >
                  {merchant.logo ? (
                    <Image
                      source={{ uri: merchant.logo }}
                      className="h-24 w-24 rounded-xl"
                    />
                  ) : (
                    <View className="h-24 w-24 items-center justify-center rounded-xl bg-surface-muted">
                      <AppIcon name="store" size={34} color={Colors.primary} />
                    </View>
                  )}
                  <View className="flex-1 justify-center gap-1">
                    <Text
                      numberOfLines={2}
                      className="font-bold text-lg text-foreground"
                    >
                      {merchant.name}
                    </Text>
                    <Text numberOfLines={1} className="text-sm text-muted">
                      {merchant.category?.name ?? t("food.foodDrink")}
                    </Text>
                    <Text
                      numberOfLines={2}
                      className="text-sm leading-5 text-muted"
                    >
                      {merchant.address}
                    </Text>
                    <Text
                      className={`font-semibold text-xs ${merchant.is_open && merchant.is_active ? "text-brand-dark" : "text-danger"}`}
                    >
                      {merchant.is_open && merchant.is_active
                        ? t("common.open")
                        : t("common.closed")}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )
        ) : !productList.length ? (
          <StatusState
            type="empty"
            message={
              search                  ? t("food.noProductForSearch").replace("{query}", search)
                  : t("food.noProductAvailable")
            }
          />
        ) : (
          <View>
            {productList.map((product) => (
              <Pressable
                key={product.id}
                onPress={() => openMerchant(product.merchant_id)}
                className="flex-row gap-3 border-b border-border py-3 active:opacity-75"
              >
                {product.image ? (
                  <Image
                    source={{ uri: product.image }}
                    className="h-24 w-24 rounded-xl"
                  />
                ) : (
                  <View className="h-24 w-24 items-center justify-center rounded-xl bg-surface-muted">
                    <Text className="text-4xl">🛍️</Text>
                  </View>
                )}
                <View className="flex-1 gap-1">
                  <Text
                    numberOfLines={2}
                    className="font-bold text-lg text-foreground"
                  >
                    {product.name}
                  </Text>
                  <Text numberOfLines={1} className="text-sm text-muted">
                    {product.merchant?.name ?? t("home.defaultStore")}
                  </Text>
                  <Text className="font-bold text-base text-brand-dark">
                    {formatRupiah(product.price)}
                  </Text>
                  <Text
                    className={`text-xs font-semibold ${product.stock > 0 ? "text-brand-dark" : "text-danger"}`}
                  >
                    {product.stock > 0 ? `Stok ${product.stock}` : "Stok habis"}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        )}
        {paginator && paginator.last_page > 1 ? (
          <View className="mt-4 flex-row items-center justify-between">
            <Pressable
              disabled={page <= 1}
              onPress={() => setPage((value) => value - 1)}
              className={`rounded-lg bg-brand-soft px-4 py-2.5 dark:bg-surface-muted ${page <= 1 ? "opacity-40" : ""}`}
            >
              <Text className="font-semibold text-brand-dark">{t("common.previous")}</Text>
            </Pressable>
            <Text className="text-sm text-muted">
              {page}/{paginator.last_page}
            </Text>
            <Pressable
              disabled={page >= paginator.last_page}
              onPress={() => setPage((value) => value + 1)}
              className={`rounded-lg bg-brand-soft px-4 py-2.5 dark:bg-surface-muted ${page >= paginator.last_page ? "opacity-40" : ""}`}
            >
              <Text className="font-semibold text-brand-dark">{t("common.next")}</Text>
            </Pressable>
          </View>
        ) : null}
      </View>


    </Screen>
  );
}

function Filter({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`min-h-9 justify-center rounded-full border px-4 ${selected ? "border-brand bg-brand" : "border-border bg-surface"}`}
    >
      <Text
        className={`font-semibold text-sm ${selected ? "text-on-brand" : "text-foreground"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
