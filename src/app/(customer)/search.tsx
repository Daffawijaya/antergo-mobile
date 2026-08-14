import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import {
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

type Filter = "all" | "food" | "shopping" | "ride";
const HISTORY_KEY = "antergo_search_history";

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [history, setHistory] = useState<string[]>([]);
  useEffect(() => {
    void AsyncStorage.getItem(HISTORY_KEY)
      .then((value) => {
        if (value) setHistory(JSON.parse(value) as string[]);
      })
      .catch(() => undefined);
  }, []);
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
    const next = [
      term,
      ...history.filter((item) => item.toLowerCase() !== term.toLowerCase()),
    ].slice(0, 6);
    setHistory(next);
    void AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(next));
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
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.locationRow}>
          <Pressable onPress={() => router.back()} style={styles.back}>
            <SymbolView
              name={{
                ios: "chevron.left",
                android: "arrow_back",
                web: "arrow_back",
              }}
              size={28}
              tintColor="#151515"
            />
          </Pressable>
          <Pressable
            style={styles.locationCopy}
            onPress={() =>
              router.push({
                pathname: "/(customer)/location-picker",
                params: { purpose: "ride-pickup" },
              })
            }
          >
            <Text style={styles.locationLabel}>Lokasimu</Text>
            <Text numberOfLines={1} style={styles.locationValue}>
              Pilih lokasi jemput
            </Text>
          </Pressable>
          <SymbolView
            name={{
              ios: "chevron.down",
              android: "keyboard_arrow_down",
              web: "keyboard_arrow_down",
            }}
            size={22}
            tintColor="#222222"
          />
        </View>

        <View style={styles.searchBox}>
          <SymbolView
            name={{ ios: "magnifyingglass", android: "search", web: "search" }}
            size={25}
            tintColor="#666666"
          />
          <TextInput
            autoFocus
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => submit()}
            returnKeyType="search"
            placeholder="Cari makanan atau produk"
            placeholderTextColor="#B8B8B8"
            style={styles.input}
          />
          {query ? (
            <Pressable
              onPress={() => {
                setQuery("");
                setSubmitted("");
              }}
            >
              <SymbolView
                name={{
                  ios: "xmark.circle.fill",
                  android: "cancel",
                  web: "cancel",
                }}
                size={21}
                tintColor="#9A9A9A"
              />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          <FilterChip
            label="Semua"
            selected={filter === "all"}
            onPress={() => chooseFilter("all")}
          />
          <FilterChip
            label="Food"
            icon="restaurant"
            selected={filter === "food"}
            onPress={() => chooseFilter("food")}
          />
          <FilterChip
            label="Shopping"
            icon="shopping_bag"
            selected={filter === "shopping"}
            onPress={() => chooseFilter("shopping")}
          />
          <FilterChip
            label="Bike/Car"
            icon="directions_car"
            selected={filter === "ride"}
            onPress={() => chooseFilter("ride")}
          />
        </ScrollView>

        {filter === "ride" ? (
          <View style={styles.section}>
            <Text style={styles.heading}>Pesan perjalanan</Text>
            <Pressable
              style={styles.rideRow}
              onPress={() =>
                router.push({
                  pathname: "/(customer)/ride/create",
                  params: { service: "bike" },
                })
              }
            >
              <Text style={styles.rideEmoji}>🛵</Text>
              <View style={styles.resultCopy}>
                <Text style={styles.resultTitle}>Bike</Text>
                <Text style={styles.resultMeta}>Perjalanan dengan motor</Text>
              </View>
              <SymbolView
                name={{
                  ios: "chevron.right",
                  android: "chevron_right",
                  web: "chevron_right",
                }}
                size={21}
                tintColor="#222222"
              />
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
              <Text style={styles.rideEmoji}>🚙</Text>
              <View style={styles.resultCopy}>
                <Text style={styles.resultTitle}>Car</Text>
                <Text style={styles.resultMeta}>Perjalanan dengan mobil</Text>
              </View>
              <SymbolView
                name={{
                  ios: "chevron.right",
                  android: "chevron_right",
                  web: "chevron_right",
                }}
                size={21}
                tintColor="#222222"
              />
            </Pressable>
          </View>
        ) : submitted ? (
          <View style={styles.section}>
            <Text style={styles.heading}>Hasil pencarian</Text>
            {results.isLoading ? (
              <Text style={styles.empty}>Mencari…</Text>
            ) : !results.data?.data.length ? (
              <Text style={styles.empty}>
                Tidak ada produk yang cocok dengan “{submitted}”.
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
                      {product.merchant?.name ?? "UMKM AnterGo"}
                    </Text>
                    <Text style={styles.price}>
                      {formatRupiah(product.price)}
                    </Text>
                  </View>
                  <SymbolView
                    name={{
                      ios: "chevron.right",
                      android: "chevron_right",
                      web: "chevron_right",
                    }}
                    size={21}
                    tintColor="#222222"
                  />
                </Pressable>
              ))
            )}
          </View>
        ) : (
          <View style={styles.section}>
            <Text style={styles.heading}>
              {history.length ? "Pencarian terakhir" : "Cari di AnterGo"}
            </Text>
            {history.length ? (
              <View style={styles.historyWrap}>
                {history.map((term) => (
                  <Pressable
                    key={term}
                    style={styles.historyChip}
                    onPress={() => submit(term)}
                  >
                    <SymbolView
                      name={{
                        ios: "clock.arrow.circlepath",
                        android: "history",
                        web: "history",
                      }}
                      size={19}
                      tintColor="#737373"
                    />
                    <Text style={styles.historyText}>{term}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Text style={styles.empty}>
                Cari makanan, minuman, atau produk dari UMKM AnterGo.
              </Text>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
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
  return (
    <Pressable
      onPress={onPress}
      style={[styles.filter, selected && styles.filterSelected]}
    >
      {icon ? (
        <SymbolView
          name={{
            ios:
              icon === "restaurant"
                ? "fork.knife"
                : icon === "shopping_bag"
                  ? "bag.fill"
                  : "car.fill",
            android: icon,
            web: icon,
          }}
          size={19}
          tintColor={selected ? "#FFFFFF" : "#174F49"}
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
  scroll: { paddingHorizontal: 18, paddingTop: 16, paddingBottom: 30 },
  locationRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  back: {
    width: 45,
    height: 45,
    alignItems: "center",
    justifyContent: "center",
  },
  locationCopy: { flex: 1 },
  locationLabel: {
    color: "#333333",
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
  },
  locationValue: {
    color: "#171717",
    fontSize: 19,
    fontFamily: "Outfit_700Bold",
  },
  searchBox: {
    height: 58,
    marginTop: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    borderRadius: 17,
    backgroundColor: "#F3F3F3",
  },
  input: {
    flex: 1,
    color: "#171717",
    fontSize: 17,
    fontFamily: "Outfit_400Regular",
  },
  filters: { gap: 10, paddingVertical: 28 },
  filter: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    borderRadius: 25,
    backgroundColor: "#EFFBFA",
  },
  filterSelected: { backgroundColor: "#174F49" },
  filterText: {
    color: "#174F49",
    fontSize: 15,
    fontFamily: "Outfit_600SemiBold",
  },
  filterTextSelected: { color: "#FFFFFF" },
  section: { paddingTop: 5 },
  heading: {
    color: "#171717",
    fontSize: 24,
    fontFamily: "Outfit_700Bold",
    marginBottom: 20,
  },
  historyWrap: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  historyChip: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 16,
    borderRadius: 22,
    backgroundColor: "#F3F3F3",
  },
  historyText: {
    color: "#333333",
    fontSize: 15,
    fontFamily: "Outfit_400Regular",
  },
  resultRow: {
    minHeight: 84,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#ECECEC",
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
    color: "#171717",
    fontSize: 17,
    fontFamily: "Outfit_600SemiBold",
  },
  resultMeta: {
    color: "#737373",
    fontSize: 13,
    fontFamily: "Outfit_400Regular",
  },
  price: {
    color: Colors.primaryDark,
    fontSize: 14,
    fontFamily: "Outfit_700Bold",
  },
  empty: {
    color: "#737373",
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
    borderBottomColor: "#ECECEC",
  },
  rideEmoji: { width: 58, fontSize: 38, textAlign: "center" },
});
