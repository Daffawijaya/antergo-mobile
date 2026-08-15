import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useMemo, useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BackButton, StatusState } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { listMerchants, listNearbyProducts } from "@/lib/api/food";
import { formatRupiah } from "@/lib/format";
import { useLocationPickerStore } from "@/stores/location-picker-store";
import { useAppTheme } from "@/stores/theme-store";

type Sort = "latest" | "price-low" | "price-high";
export default function CommerceCatalogScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { service: rawService } = useLocalSearchParams<{ service?: string }>();
  const service = rawService === "shopping" ? "shopping" : "food";
  const destination = useLocationPickerStore(
    (state) => state.selections["food-destination"],
  );
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("latest");
  const [page, setPage] = useState(1);
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
  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={["top", "left", "right"]}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-4 pb-8 pt-2"
      >
        <View className="flex-row items-center gap-2">
          <BackButton onPress={() => router.replace("/(customer)" as never)} />
          <Pressable
            className="flex-1"
            onPress={() =>
              router.push({
                pathname: "/(customer)/location-search" as never,
                params: {
                  purpose: "food-destination",
                  returnTo: `/(customer)/food?service=${service}`,
                },
              })
            }
          >
            <Text className="text-xs text-muted">Antar sekarang</Text>
            <Text
              numberOfLines={1}
              className="font-bold text-lg text-foreground"
            >
              {destination?.address ?? "Pilih alamat pengantaran"}
            </Text>
          </Pressable>
          <SymbolView
            name={{
              ios: "chevron.down",
              android: "keyboard_arrow_down",
              web: "keyboard_arrow_down",
            }}
            size={20}
            tintColor={colors.text}
          />
        </View>
        <View className="mt-3 flex-row items-center gap-2 rounded-2xl bg-surface-muted px-4">
          <SymbolView
            name={{ ios: "magnifyingglass", android: "search", web: "search" }}
            size={23}
            tintColor={colors.muted}
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={submit}
            returnKeyType="search"
            placeholder={
              service === "food" ? "Cari UMKM atau makanan" : "Cari produk"
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
              <SymbolView
                name={{
                  ios: "xmark.circle.fill",
                  android: "cancel",
                  web: "cancel",
                }}
                size={20}
                tintColor={colors.muted}
              />
            </Pressable>
          ) : null}
        </View>
        {service === "shopping" ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerClassName="gap-2 py-3"
          >
            <Filter
              label="Terbaru"
              selected={sort === "latest"}
              onPress={() => setSort("latest")}
            />
            <Filter
              label="Harga terendah"
              selected={sort === "price-low"}
              onPress={() => setSort("price-low")}
            />
            <Filter
              label="Harga tertinggi"
              selected={sort === "price-high"}
              onPress={() => setSort("price-high")}
            />
          </ScrollView>
        ) : (
          <View className="h-4" />
        )}
        <Text className="mb-2 font-bold text-xl text-foreground">
          {service === "food" ? "UMKM makanan & minuman" : "Produk untuk kamu"}
        </Text>
        {activeQuery.isLoading ? (
          <StatusState type="loading" />
        ) : activeQuery.isError ? (
          <StatusState type="error" message="Data gagal dimuat." />
        ) : service === "food" ? (
          !merchantList.length ? (
            <StatusState
              type="empty"
              message={
                search
                  ? `Tidak ada UMKM untuk “${search}”.`
                  : "Belum ada UMKM tersedia."
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
                      className="h-24 w-24 rounded-2xl"
                    />
                  ) : (
                    <View className="h-24 w-24 items-center justify-center rounded-2xl bg-surface-muted">
                      <SymbolView
                        name={{
                          ios: "storefront.fill",
                          android: "storefront",
                          web: "storefront",
                        }}
                        size={34}
                        tintColor={Colors.primary}
                      />
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
                      {merchant.category?.name ?? "Makanan & Minuman"}
                    </Text>
                    <Text
                      numberOfLines={2}
                      className="text-sm leading-5 text-muted"
                    >
                      {merchant.address}
                    </Text>
                    <Text
                      className={`font-semibold text-xs ${merchant.is_open && merchant.is_active ? "text-brand" : "text-danger"}`}
                    >
                      {merchant.is_open && merchant.is_active
                        ? "Buka"
                        : "Tutup"}
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
              search
                ? `Tidak ada produk untuk “${search}”.`
                : "Belum ada produk tersedia."
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
                    className="h-24 w-24 rounded-2xl"
                  />
                ) : (
                  <View className="h-24 w-24 items-center justify-center rounded-2xl bg-surface-muted">
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
                    {product.merchant?.name ?? "UMKM AnterGo"}
                  </Text>
                  <Text className="font-bold text-base text-brand">
                    {formatRupiah(product.price)}
                  </Text>
                  <Text
                    className={`text-xs font-semibold ${product.stock > 0 ? "text-brand" : "text-danger"}`}
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
              className={`rounded-xl bg-emerald-50 px-4 py-2.5 dark:bg-emerald-950/40 ${page <= 1 ? "opacity-40" : ""}`}
            >
              <Text className="font-semibold text-brand">Sebelumnya</Text>
            </Pressable>
            <Text className="text-sm text-muted">
              {page}/{paginator.last_page}
            </Text>
            <Pressable
              disabled={page >= paginator.last_page}
              onPress={() => setPage((value) => value + 1)}
              className={`rounded-xl bg-emerald-50 px-4 py-2.5 dark:bg-emerald-950/40 ${page >= paginator.last_page ? "opacity-40" : ""}`}
            >
              <Text className="font-semibold text-brand">Berikutnya</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
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
        className={`font-semibold text-sm ${selected ? "text-white" : "text-foreground"}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
