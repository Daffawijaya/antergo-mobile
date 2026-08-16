import { AppIcon } from "@/components/app-icon";
import { Screen, StatusState } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { listMerchants, listNearbyProducts } from "@/lib/api/food";
import { formatRupiah } from "@/lib/format";
import type { Merchant, Product, ServiceVariant } from "@/types/api";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { Image, Pressable, Text, View } from "react-native";

type Service = {
  type: ServiceVariant;
  label: string;
  icon: number;
  onPress: () => void;
};
const serviceIcons: Record<ServiceVariant, number> = {
  food: require("../../../assets/images/icon/food.png"),
  delivery: require("../../../assets/images/icon/delivery.png"),
  shopping: require("../../../assets/images/icon/shopping.png"),
  bike: require("../../../assets/images/icon/bike.png"),
  car: require("../../../assets/images/icon/car.png"),
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
      icon: serviceIcons.food,
      onPress: () =>
        router.push({
          pathname: "/(customer)/food",
          params: { service: "food" },
        }),
    },
    {
      type: "delivery",
      label: "Delivery",
      icon: serviceIcons.delivery,
      onPress: () => router.push("/(customer)/send/create"),
    },
    {
      type: "shopping",
      label: "Shopping",
      icon: serviceIcons.shopping,
      onPress: () =>
        router.push({
          pathname: "/(customer)/food",
          params: { service: "shopping" },
        }),
    },
    {
      type: "bike",
      label: "Bike",
      icon: serviceIcons.bike,
      onPress: () =>
        router.push({
          pathname: "/(customer)/ride/create",
          params: { service: "bike" },
        }),
    },
    {
      type: "car",
      label: "Car",
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
          <AppIcon name="search" size={24} color="#737373" />
          <Text className="text-base text-muted">Cari item</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push("/(customer)/profile")}
          className="h-12 w-12 items-center justify-center rounded-full bg-surface"
        >
          <AppIcon name="profile" size={25} color={Colors.primary} />
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
            <Text className="font-extrabold text-brand-dark">A</Text>
          </View>
        </View>
        <View className="min-h-[66px] flex-1 flex-row items-center justify-between rounded-2xl border border-border bg-surface px-3">
          <View>
            <Text className="text-xs text-muted">Bayar sekaligus</Text>
            <Text className="font-bold text-[15px] text-foreground">
              Top Up
            </Text>
          </View>
          <AppIcon name="orders" size={22} color={Colors.primary} />
        </View>
      </View>
      <MerchantSection
        title="Foods"
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
function ServiceButton({ label, icon, onPress }: Service) {
  return (
    <Pressable
      onPress={onPress}
      className="w-[30%] items-center gap-1.5 active:opacity-70"
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
        <View className="flex-row flex-wrap gap-2.5">
          {merchants.slice(0, 6).map((merchant) => (
            <Pressable
              key={merchant.id}
              onPress={() => onPress(merchant)}
              className="w-[48%] grow overflow-hidden rounded-2xl border border-border bg-surface active:opacity-75"
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
                  {merchant.category?.name ?? "UMKM kuliner"}
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
                  {product.merchant?.name ?? "UMKM AnterGo"}
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
