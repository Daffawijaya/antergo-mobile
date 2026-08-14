import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useMemo, useState } from "react";
import {
  Image,
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

type Sort = "latest" | "price-low" | "price-high";

export default function ProductCatalogScreen() {
  const router = useRouter();
  const { service: serviceParam } = useLocalSearchParams<{
    service?: string;
  }>();
  const service = serviceParam === "shopping" ? "shopping" : "food";
  const productType = service === "shopping" ? "goods" : "food";
  const destination = useLocationPickerStore(
    (state) => state.selections["food-destination"],
  );
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("latest");
  const [page, setPage] = useState(1);
  const products = useQuery({
    queryKey: ["catalog", service, search, page],
    queryFn: () => listNearbyProducts(page, search, productType),
    placeholderData: keepPreviousData,
  });
  const sorted = useMemo(() => {
    const data = [...(products.data?.data ?? [])];
    if (sort === "price-low")
      data.sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === "price-high")
      data.sort((a, b) => Number(b.price) - Number(a.price));
    return data;
  }, [products.data?.data, sort]);
  const submitSearch = () => {
    setSearch(query.trim());
    setPage(1);
  };
  const openProduct = (merchantId: number) =>
    router.push({
      pathname: "/(customer)/food/merchant/[id]",
      params: { id: String(merchantId), service },
    });

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.locationRow}>
          <Pressable style={styles.back} onPress={() => router.back()}>
            <SymbolView
              name={{
                ios: "chevron.left",
                android: "arrow_back",
                web: "arrow_back",
              }}
              size={29}
              tintColor="#151515"
            />
          </Pressable>
          <Pressable
            style={styles.locationCopy}
            onPress={() =>
              router.push({
                pathname: "/(customer)/location-picker",
                params: { purpose: "food-destination" },
              })
            }
          >
            <Text style={styles.locationLabel}>Antar sekarang</Text>
            <Text numberOfLines={1} style={styles.locationValue}>
              {destination?.address ?? "Pilih alamat pengantaran"}
            </Text>
          </Pressable>
          <SymbolView
            name={{
              ios: "chevron.down",
              android: "keyboard_arrow_down",
              web: "keyboard_arrow_down",
            }}
            size={24}
            tintColor="#161616"
          />
        </View>

        <View style={styles.searchBox}>
          <SymbolView
            name={{ ios: "magnifyingglass", android: "search", web: "search" }}
            size={27}
            tintColor="#8A8A8A"
          />
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={submitSearch}
            returnKeyType="search"
            placeholder={
              service === "shopping"
                ? "Cari produk apa nih?"
                : "Kamu pesan apa nih?"
            }
            placeholderTextColor="#9C9C9C"
            style={styles.searchInput}
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
                size={21}
                tintColor="#999999"
              />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          <Pressable
            style={styles.filterIcon}
            onPress={() => setSort("latest")}
          >
            <SymbolView
              name={{
                ios: "slider.horizontal.3",
                android: "tune",
                web: "tune",
              }}
              size={23}
              tintColor="#3F3F3F"
            />
          </Pressable>
          <Filter
            label="Terbaru"
            icon="swap_vert"
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

        <Text style={styles.heading}>
          {service === "shopping" ? "Produk untuk kamu" : "Makanan & minuman"}
        </Text>
        {products.isLoading ? (
          <Text style={styles.state}>Memuat produk…</Text>
        ) : products.isError ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>Produk gagal dimuat</Text>
            <Pressable onPress={() => products.refetch()}>
              <Text style={styles.retry}>Coba lagi</Text>
            </Pressable>
          </View>
        ) : !sorted.length ? (
          <View style={styles.stateCard}>
            <Text style={styles.stateTitle}>
              {search
                ? `Tidak ada hasil untuk “${search}”`
                : "Belum ada produk tersedia"}
            </Text>
            <Text style={styles.state}>
              Produk merchant akan muncul di halaman ini.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {sorted.map((product) => (
              <Pressable
                key={product.id}
                style={styles.productRow}
                onPress={() => openProduct(product.merchant_id)}
              >
                {product.image ? (
                  <Image
                    source={{ uri: product.image }}
                    style={styles.productImage}
                  />
                ) : (
                  <View style={styles.productFallback}>
                    <Text style={styles.fallbackEmoji}>
                      {product.product_type === "goods" ? "🛍️" : "🍜"}
                    </Text>
                  </View>
                )}
                <View style={styles.productCopy}>
                  <Text numberOfLines={2} style={styles.productName}>
                    {product.name}
                  </Text>
                  <Text numberOfLines={1} style={styles.merchant}>
                    {product.merchant?.name ?? "UMKM AnterGo"}
                  </Text>
                  {product.description ? (
                    <Text numberOfLines={1} style={styles.description}>
                      {product.description}
                    </Text>
                  ) : null}
                  <Text style={styles.price}>
                    {formatRupiah(product.price)}
                  </Text>
                  <Text
                    style={[
                      styles.stock,
                      product.stock <= 0 && styles.stockEmpty,
                    ]}
                  >
                    {product.stock > 0 ? `Stok ${product.stock}` : "Stok habis"}
                  </Text>
                </View>
                <SymbolView
                  name={{
                    ios: "ellipsis",
                    android: "more_vert",
                    web: "more_vert",
                  }}
                  size={23}
                  tintColor="#858585"
                />
              </Pressable>
            ))}
          </View>
        )}

        {products.data && products.data.last_page > 1 ? (
          <View style={styles.pagination}>
            <Pressable
              disabled={page <= 1}
              onPress={() => setPage((value) => value - 1)}
              style={[styles.pageButton, page <= 1 && styles.disabled]}
            >
              <Text style={styles.pageText}>Sebelumnya</Text>
            </Pressable>
            <Text style={styles.pageNumber}>
              {page}/{products.data.last_page}
            </Text>
            <Pressable
              disabled={page >= products.data.last_page}
              onPress={() => setPage((value) => value + 1)}
              style={[
                styles.pageButton,
                page >= products.data.last_page && styles.disabled,
              ]}
            >
              <Text style={styles.pageText}>Berikutnya</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Filter({
  label,
  icon,
  selected,
  onPress,
}: {
  label: string;
  icon?: "swap_vert";
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.filter, selected && styles.filterSelected]}
    >
      {icon ? (
        <SymbolView
          name={{ ios: "arrow.up.arrow.down", android: icon, web: icon }}
          size={20}
          tintColor={selected ? "#FFFFFF" : "#404040"}
        />
      ) : null}
      <Text style={[styles.filterText, selected && styles.filterTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  scroll: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 30 },
  locationRow: {
    minHeight: 84,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  back: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  locationCopy: { flex: 1 },
  locationLabel: {
    color: "#303030",
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
  },
  locationValue: {
    color: "#161616",
    fontSize: 21,
    fontFamily: "Outfit_700Bold",
  },
  searchBox: {
    height: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 17,
    borderRadius: 14,
    backgroundColor: "#F3F3F3",
  },
  searchInput: {
    flex: 1,
    color: "#171717",
    fontSize: 18,
    fontFamily: "Outfit_400Regular",
  },
  filters: { gap: 10, paddingVertical: 24 },
  filterIcon: {
    width: 54,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#CFCFCF",
    backgroundColor: "#FFFFFF",
  },
  filter: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 18,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#CFCFCF",
    backgroundColor: "#FFFFFF",
  },
  filterSelected: { borderColor: "#174F49", backgroundColor: "#174F49" },
  filterText: {
    color: "#383838",
    fontSize: 15,
    fontFamily: "Outfit_500Medium",
  },
  filterTextSelected: { color: "#FFFFFF" },
  heading: {
    color: "#171717",
    fontSize: 25,
    fontFamily: "Outfit_700Bold",
    marginBottom: 14,
  },
  list: { gap: 0 },
  productRow: {
    minHeight: 156,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E8E8E8",
  },
  productImage: {
    width: 118,
    height: 118,
    borderRadius: 17,
    resizeMode: "cover",
  },
  productFallback: {
    width: 118,
    height: 118,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primarySoft,
  },
  fallbackEmoji: { fontSize: 48 },
  productCopy: { flex: 1, minWidth: 0, gap: 3 },
  productName: {
    color: "#171717",
    fontSize: 19,
    lineHeight: 23,
    fontFamily: "Outfit_700Bold",
  },
  merchant: { color: "#4D4D4D", fontSize: 14, fontFamily: "Outfit_500Medium" },
  description: {
    color: "#777777",
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
  },
  price: {
    color: "#F27B35",
    fontSize: 17,
    fontFamily: "Outfit_700Bold",
    marginTop: 3,
  },
  stock: {
    color: Colors.primaryDark,
    fontSize: 12,
    fontFamily: "Outfit_600SemiBold",
  },
  stockEmpty: { color: Colors.danger },
  stateCard: { paddingVertical: 40, alignItems: "center", gap: 8 },
  stateTitle: {
    color: "#222222",
    fontSize: 17,
    fontFamily: "Outfit_600SemiBold",
    textAlign: "center",
  },
  state: {
    color: "#777777",
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    textAlign: "center",
  },
  retry: { color: Colors.primaryDark, fontFamily: "Outfit_700Bold" },
  pagination: {
    minHeight: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  pageButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.primarySoft,
  },
  pageText: {
    color: Colors.primaryDark,
    fontSize: 13,
    fontFamily: "Outfit_600SemiBold",
  },
  pageNumber: { color: "#555555", fontFamily: "Outfit_500Medium" },
  disabled: { opacity: 0.4 },
});
