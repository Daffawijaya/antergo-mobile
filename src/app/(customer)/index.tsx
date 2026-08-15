import { Screen, StatusState } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { listMerchants, listNearbyProducts } from "@/lib/api/food";
import { formatRupiah } from "@/lib/format";
import type { Merchant, Product, ServiceVariant } from "@/types/api";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Image, Pressable, Text, View } from "react-native";

type Service = {
  type: ServiceVariant;
  label: string;
  emoji: string;
  onPress: () => void;
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
  const router = useRouter();
  const foodMerchants = useQuery({
    queryKey: ["merchants", "home", "food"],
    queryFn: () => listMerchants(1, "food"),
  });
  const goods = useQuery({
    queryKey: ["products", "home", "goods"],
    queryFn: () => listNearbyProducts(1, undefined, "goods"),
  });
  const services: Service[] = [
    {
      type: "food",
      label: "Food",
      emoji: "🍳",
      onPress: () =>
        router.push({
          pathname: "/(customer)/food",
          params: { service: "food" },
        }),
    },
    {
      type: "delivery",
      label: "Delivery",
      emoji: "📦",
      onPress: () => router.push("/(customer)/send/create"),
    },
    {
      type: "shopping",
      label: "Shopping",
      emoji: "🛒",
      onPress: () =>
        router.push({
          pathname: "/(customer)/food",
          params: { service: "shopping" },
        }),
    },
    {
      type: "bike",
      label: "Bike",
      emoji: "🛵",
      onPress: () =>
        router.push({
          pathname: "/(customer)/ride/create",
          params: { service: "bike" },
        }),
    },
    {
      type: "car",
      label: "Car",
      emoji: "🚙",
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
        returnTo: "/(customer)",
      },
    });
  const openProduct = (product: Product) =>
    router.push({
      pathname: "/(customer)/food/merchant/[id]",
      params: {
        id: String(product.merchant_id),
        service: product.product_type === "goods" ? "shopping" : "food",
        returnTo: "/(customer)",
      },
    });
  return (
    <Screen
      padded={false}
      scrollBottomPadding={false}
      className="gap-0 bg-background"
    >
      <View className="flex-row items-center gap-2.5 bg-surface-muted px-4 py-2.5">
        <Pressable
          onPress={() => router.push("/(customer)/search")}
          className="h-12 flex-1 flex-row items-center gap-3 rounded-2xl bg-surface px-4"
        >
          <SymbolView
            name={{ ios: "magnifyingglass", android: "search", web: "search" }}
            size={24}
            tintColor="#737373"
          />
          <Text className="text-base text-muted">Cari item</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/(customer)/profile")}
          className="h-12 w-12 items-center justify-center rounded-full bg-surface"
        >
          <SymbolView
            name={{ ios: "person.fill", android: "person", web: "person" }}
            size={25}
            tintColor={Colors.primary}
          />
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
      <View className="flex-row gap-2.5 px-4 pb-5">
        <View className="min-h-[66px] flex-[0.8] flex-row items-center justify-between rounded-2xl border border-border bg-surface px-3">
          <View>
            <Text className="text-xs text-muted">Balance</Text>
            <Text className="font-bold text-base text-foreground">Rp0</Text>
          </View>
          <View className="h-7 w-7 items-center justify-center rounded-full border-2 border-brand bg-surface-muted">
            <Text className="font-extrabold text-brand">A</Text>
          </View>
        </View>
        <View className="min-h-[66px] flex-1 flex-row items-center justify-between rounded-2xl border border-border bg-surface px-3">
          <View>
            <Text className="text-xs text-muted">Bayar sekaligus</Text>
            <Text className="font-bold text-[15px] text-foreground">
              Top Up
            </Text>
          </View>
          <SymbolView
            name={{
              ios: "doc.text.fill",
              android: "receipt_long",
              web: "receipt_long",
            }}
            size={22}
            tintColor={Colors.primary}
          />
        </View>
      </View>
      <MerchantSection
        title="Makanan & Minuman"
        loading={foodMerchants.isLoading}
        merchants={foodMerchants.data?.data ?? []}
        onPress={openMerchant}
      />
      <ProductSection
        title="Shopping"
        loading={goods.isLoading}
        products={onePerMerchant(goods.data?.data)}
        onPress={openProduct}
      />
    </Screen>
  );
}
function ServiceButton({ label, emoji, onPress }: Service) {
  return (
    <Pressable
      onPress={onPress}
      className="w-[30%] items-center gap-1 active:opacity-70"
    >
      <Text className="text-[40px] leading-[48px]">{emoji}</Text>
      <Text className="font-medium text-sm text-foreground">{label}</Text>
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
  return (
    <View className="gap-3 px-4 pb-6">
      <Text className="font-bold text-lg text-foreground">{title}</Text>
      {loading ? (
        <StatusState type="loading" />
      ) : !merchants.length ? (
        <Text className="py-5 text-center text-sm text-muted">
          Belum ada merchant makanan tersedia.
        </Text>
      ) : (
        <View className="gap-2.5">
          {merchants.slice(0, 6).map((merchant) => (
            <Pressable
              key={merchant.id}
              onPress={() => onPress(merchant)}
              className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface p-3 active:opacity-75"
            >
              {merchant.logo ? (
                <Image
                  source={{ uri: merchant.logo }}
                  className="h-16 w-16 rounded-xl"
                />
              ) : (
                <View className="h-16 w-16 items-center justify-center rounded-xl bg-surface-muted">
                  <Text className="text-3xl">🍜</Text>
                </View>
              )}
              <View className="min-w-0 flex-1 gap-0.5">
                <Text
                  numberOfLines={1}
                  className="font-bold text-base text-foreground"
                >
                  {merchant.name}
                </Text>
                <Text numberOfLines={1} className="text-sm text-muted">
                  {merchant.category?.name ?? "UMKM kuliner"}
                </Text>
                <Text numberOfLines={1} className="text-xs text-muted">
                  {merchant.address}
                </Text>
              </View>
              <Text
                className={`font-semibold text-xs ${merchant.is_open ? "text-brand" : "text-muted"}`}
              >
                {merchant.is_open ? "Buka" : "Tutup"}
              </Text>
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
  return (
    <View className="gap-3 px-4 pb-6">
      <Text className="font-bold text-lg text-foreground">{title}</Text>
      {loading ? (
        <StatusState type="loading" />
      ) : !products.length ? (
        <Text className="py-5 text-center text-sm text-muted">
          Belum ada produk tersedia.
        </Text>
      ) : (
        <View className="flex-row flex-wrap gap-2.5">
          {products.map((product) => (
            <Pressable
              key={product.id}
              onPress={() => onPress(product)}
              className="w-[48%] grow overflow-hidden rounded-2xl border border-border bg-surface active:opacity-75"
            >
              {product.image ? (
                <Image
                  source={{ uri: product.image }}
                  className="h-32 w-full"
                />
              ) : (
                <View className="h-32 items-center justify-center bg-surface-muted">
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
                  {product.merchant?.name ?? "UMKM AnterGo"}
                </Text>
                <Text className="font-bold text-sm text-brand">
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
