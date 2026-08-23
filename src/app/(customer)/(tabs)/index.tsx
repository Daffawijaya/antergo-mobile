import { AppIcon } from "@/components/app-icon";
import { Screen, StatusState } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { listMerchants, listNearbyProducts } from "@/lib/api/food";
import { formatRupiah } from "@/lib/format";
import { roleAvatar } from "@/lib/user-avatar";
import { useAuthStore } from "@/stores/auth-store";
import { useTranslation } from "@/i18n";
import type { Merchant, Product, ServiceVariant } from "@/types/api";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { WarmGradientBg } from "@/components/warm-gradient-bg";
import { BalanceCardBg, TopupCardBg } from "@/components/card-bg";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Service = {
  type: ServiceVariant;
  label: string;
  icon: number;
  onPress: () => void;
};
const serviceIcons: Record<ServiceVariant | "jastip", number> = {
  food: require("../../../../assets/images/icon/food.png"),
  delivery: require("../../../../assets/images/icon/delivery.png"),
  shopping: require("../../../../assets/images/icon/shopping.png"),
  bike: require("../../../../assets/images/icon/bike.png"),
  car: require("../../../../assets/images/icon/car.png"),
  jastip: require("../../../../assets/images/icon/titip.png"),
};
const onePerMerchant = (products: Product[] = []) => {
  const seen = new Set<number>();
  return products
    .filter((product) => {
      if (seen.has(product.merchant_id)) return false;
      seen.add(product.merchant_id);
      return true;
    })
    .slice(0, 6);
};
export default function CustomerHome() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const activeRole = useAuthStore((state) => state.activeRole);
  const avatar = roleAvatar(user, activeRole);
  const foodMerchants = useQuery({
    queryKey: ["merchants", "home", "food"],
    queryFn: () => listMerchants(1, "food"),
  });
  const goods = useQuery({
    queryKey: ["products", "home", "goods"],
    queryFn: () => listNearbyProducts(1, undefined, "goods"),
  });
  const { t } = useTranslation();
  const services: Service[] = [
    {
      type: "food",
      label: t("home.food"),
      icon: serviceIcons.food,
      onPress: () =>
        router.push({
          pathname: "/(customer)/food",
          params: { service: "food" },
        }),
    },
    {
      type: "shopping",
      label: t("home.shopping"),
      icon: serviceIcons.shopping,
      onPress: () =>
        router.push({
          pathname: "/(customer)/food",
          params: { service: "shopping" },
        }),
    },
    {
      type: "jastip" as ServiceVariant,
      label: t("jastip.title"),
      icon: serviceIcons.jastip,
      onPress: () => router.push("/(customer)/jastip/create"),
    },
    {
      type: "delivery",
      label: t("home.delivery"),
      icon: serviceIcons.delivery,
      onPress: () => router.push("/(customer)/send/create"),
    },
    {
      type: "bike",
      label: t("home.bike"),
      icon: serviceIcons.bike,
      onPress: () =>
        router.push({
          pathname: "/(customer)/ride/create",
          params: { service: "bike" },
        }),
    },
    {
      type: "car",
      label: t("home.car"),
      icon: serviceIcons.car,
      onPress: () =>
        router.push({
          pathname: "/(customer)/ride/create",
          params: { service: "car" },
        }),
    },
  ];
  const openMerchant = (merchant: Merchant) =>
    router.push({
      pathname: "/(customer)/food/merchant/[id]",
      params: {
        id: String(merchant.id),
        service: "food",
        returnTo: "/(customer)/(tabs)",
      },
    });
  const openProduct = (product: Product) =>
    router.push({
      pathname: "/(customer)/food/merchant/[id]",
      params: {
        id: String(product.merchant_id),
        service: product.product_type === "goods" ? "shopping" : "food",
        returnTo: "/(customer)/(tabs)",
      },
    });
  return (
    <Screen
      padded={false}
      scrollBottomPadding={false}
      className="gap-0 bg-background"
    >
      <WarmGradientBg height={520} />
      <View className="flex-row items-center gap-2.5 px-4" style={{ paddingTop: insets.top + 16 }}>
        <Pressable
          onPress={() => router.push("/(customer)/search")}
          className="min-h-12 flex-1 flex-row items-center gap-2 rounded-xl bg-surface-muted px-4"
        >
          <AppIcon name="search" size={24} color="#737373" />
          <TypingPlaceholder />
        </Pressable>
        <Pressable
          onPress={() => router.push("/(customer)/profile-view")}
          className="h-12 w-12 items-center justify-center overflow-hidden rounded-full active:opacity-70"
        >
          {avatar ? (
            <Image
              source={{ uri: avatar }}
              className="h-full w-full"
              resizeMode="cover"
            />
          ) : (
            <Image
              source={require("../../../../assets/images/noimages.jpg")}
              className="h-full w-full"
              resizeMode="cover"
            />
          )}
        </Pressable>
      </View>
      <View className="gap-4 px-4 py-5">
        <View className="flex-row justify-center">
          {services.slice(0, 3).map((service) => (
            <ServiceButton key={service.type} {...service} />
          ))}
        </View>
        <View className="flex-row justify-center">
          {services.slice(3).map((service) => (
            <ServiceButton key={service.type} {...service} />
          ))}
        </View>
      </View>
      <View className="flex-row gap-2.5 px-4 pb-2.5">
        <BalanceCardBg className="flex-1 rounded-xl">
          <View>
            <Text className="text-xs text-white">{t("home.balance")}</Text>
            <Text className="font-bold text-base text-white">Rp0</Text>
          </View>
          <View className="h-7 w-7 items-center justify-center rounded-full border-2 border-white/30 bg-white/20">
            <Text className="font-extrabold text-white">A</Text>
          </View>
        </BalanceCardBg>
        <TopupCardBg className="flex-1 rounded-xl">
          <View>
            <Text className="text-xs text-on-brand">{t("home.payAll")}</Text>
            <Text className="font-bold text-[15px] text-on-brand">
              Top Up
            </Text>
          </View>
          <AppIcon name="orders" size={22} color={Colors.onPrimary} />
        </TopupCardBg>
      </View>
      <MerchantSection
        title={t("home.food")}
        loading={foodMerchants.isLoading}
        merchants={foodMerchants.data?.data ?? []}
        onPress={openMerchant}
      />
      <ProductSection
        title={t("home.shopping")}
        loading={goods.isLoading}
        products={onePerMerchant(goods.data?.data)}
        onPress={openProduct}
      />
    </Screen>
  );
}
function ServiceButton({ label, icon, onPress }: Service) {
  return (
    <Pressable
      onPress={onPress}
      className="w-[30%] items-center gap-0.5 active:opacity-70"
    >
      <Image
        source={icon}
        style={{ width: 56, height: 56 }}
        resizeMode="contain"
        accessibilityLabel={label}
      />
      <Text className="font-sans text-sm text-foreground">{label}</Text>
    </Pressable>
  );
}
function MerchantSection({
  title,
  merchants,
  loading,
  onPress,
}: {
  title: string;
  merchants: Merchant[];
  loading: boolean;
  onPress: (merchant: Merchant) => void;
}) {
  const { t } = useTranslation();
  return (
    <View className="gap-3 px-4 pb-3">
      <Text className="font-bold text-lg text-foreground">{title}</Text>
      {loading ? (
        <StatusState type="loading" />
      ) : !merchants.length ? (
        <Text className="py-5 text-center text-sm text-muted">
          {t("home.noMerchantFood")}
        </Text>
      ) : (
        <View className="flex-row flex-wrap gap-4">
          {merchants.slice(0, 6).map((merchant) => (
            <Pressable
              key={merchant.id}
              onPress={() => onPress(merchant)}
              className="w-[48%] grow overflow-hidden rounded-xl border border-border bg-surface active:opacity-75"
            >
              {merchant.logo ? (
                <Image
                  source={{ uri: merchant.logo }}
                  className="aspect-square w-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="aspect-square w-full items-center justify-center bg-surface-muted">
                  <Text className="text-5xl">🍜</Text>
                </View>
              )}
              <View className="gap-0.5 p-2.5">
                <Text
                  numberOfLines={1}
                  className="font-bold text-[15px] text-foreground"
                >
                  {merchant.name}
                </Text>
                <Text numberOfLines={1} className="text-xs text-muted">
                  {merchant.category?.name ?? t("home.umkmKuliner")}
                </Text>
                <Text
                  className={`font-semibold text-xs ${merchant.is_open ? "text-brand-dark" : "text-muted"}`}
                >
                  {merchant.is_open ? "Buka" : "Tutup"}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}
function ProductSection({
  title,
  products,
  loading,
  onPress,
}: {
  title: string;
  products: Product[];
  loading: boolean;
  onPress: (product: Product) => void;
}) {
  const { t } = useTranslation();
  return (
    <View className="gap-3 px-4 pb-6">
      <Text className="font-bold text-lg text-foreground">{title}</Text>
      {loading ? (
        <StatusState type="loading" />
      ) : !products.length ? (
        <Text className="py-5 text-center text-sm text-muted">
          {t("home.noProducts")}
        </Text>
      ) : (
        <View className="flex-row flex-wrap gap-4">
          {products.map((product) => (
            <Pressable
              key={product.id}
              onPress={() => onPress(product)}
              className="w-[48%] grow overflow-hidden rounded-xl border border-border bg-surface active:opacity-75"
            >
              {product.image ? (
                <Image
                  source={{ uri: product.image }}
                  className="aspect-square w-full"
                  resizeMode="cover"
                />
              ) : (
                <View className="aspect-square w-full items-center justify-center bg-surface-muted">
                  <Text className="text-5xl">
                    {product.product_type === "goods" ? "🛍️" : "🍜"}
                  </Text>
                </View>
              )}
              <View className="gap-0.5 p-2.5">
                <Text
                  numberOfLines={2}
                  className="min-h-[38px] font-bold text-[15px] leading-[19px] text-foreground"
                >
                  {product.name}
                </Text>
                <Text numberOfLines={1} className="text-xs text-muted">
                  {product.merchant?.name ?? t("home.defaultStore")}
                </Text>
                <Text className="font-bold text-sm text-brand-dark">
                  {formatRupiah(product.price)}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const SEARCH_PLACEHOLDERS = [
  "Mau makan apa?",
  "Mau beli apa?",
  "Mau cari apa?",
];

function TypingPlaceholder() {
  const [textIndex, setTextIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentFull = SEARCH_PLACEHOLDERS[textIndex];
    let timeout: ReturnType<typeof setTimeout>;

    if (!isDeleting && displayText === currentFull) {
      // Pause before deleting (~7s to read)
      timeout = setTimeout(() => setIsDeleting(true), 7000);
    } else if (isDeleting && displayText === "") {
      // Move to next placeholder
      setIsDeleting(false);
      setTextIndex((prev) => (prev + 1) % SEARCH_PLACEHOLDERS.length);
    } else if (isDeleting) {
      // Delete one character
      timeout = setTimeout(
        () => setDisplayText(currentFull.slice(0, displayText.length - 1)),
        40,
      );
    } else {
      // Type one character
      timeout = setTimeout(
        () => setDisplayText(currentFull.slice(0, displayText.length + 1)),
        70,
      );
    }

    return () => clearTimeout(timeout);
  }, [displayText, isDeleting, textIndex]);

  return (
    <Text className="text-base text-muted">
      {displayText}
    </Text>
  );
}
