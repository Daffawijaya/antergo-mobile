import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Screen } from "@/components/ui";
import { Colors } from "@/constants/colors";
import { listNearbyProducts } from "@/lib/api/food";
import { formatRupiah } from "@/lib/format";
import type { ServiceVariant } from "@/types/api";

type Service = {
  type: ServiceVariant;
  label: string;
  emoji: string;
  onPress: () => void;
};

export default function CustomerHome() {
  const router = useRouter();
  const products = useQuery({
    queryKey: ["products", "nearby"],
    queryFn: () => listNearbyProducts(1),
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

  return (
    <Screen contentStyle={styles.screen}>
      <View style={styles.header}>
        <Pressable
          style={styles.search}
          onPress={() => router.push("/(customer)/search")}
        >
          <SymbolView
            name={{ ios: "magnifyingglass", android: "search", web: "search" }}
            size={27}
            tintColor="#292929"
          />
          <Text style={styles.searchText}>Cari item</Text>
        </Pressable>
        <Pressable
          style={styles.avatar}
          onPress={() => router.push("/(customer)/profile")}
        >
          <SymbolView
            name={{ ios: "person.fill", android: "person", web: "person" }}
            size={28}
            tintColor={Colors.primaryDark}
          />
        </Pressable>
      </View>

      <View style={styles.serviceArea}>
        <View style={styles.serviceGrid}>
          <View style={styles.serviceRow}>
            {services.slice(0, 3).map((service) => (
              <Pressable
                key={service.type}
                style={styles.service}
                onPress={service.onPress}
              >
                <Text style={styles.emoji}>{service.emoji}</Text>
                <Text style={styles.serviceLabel}>{service.label}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.serviceRowBottom}>
            {services.slice(3).map((service) => (
              <Pressable
                key={service.type}
                style={styles.service}
                onPress={service.onPress}
              >
                <Text style={styles.emoji}>{service.emoji}</Text>
                <Text style={styles.serviceLabel}>{service.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.walletScroller}>
        <Pressable
          style={[styles.wallet, styles.balanceCard]}
          onPress={() => undefined}
        >
          <View>
            <Text style={styles.walletCaption}>Balance</Text>
            <Text style={styles.walletTitle}>Rp0</Text>
          </View>
          <View style={styles.balanceIcon}>
            <Text style={styles.balanceMark}>A</Text>
          </View>
        </Pressable>
        <Pressable
          style={[styles.wallet, styles.topupCard]}
          onPress={() => undefined}
        >
          <View>
            <Text style={styles.walletCaption}>Bayar sekaligus</Text>
            <Text style={styles.walletTitle}>Top up & tagihan</Text>
          </View>
          <View style={styles.billIcon}>
            <SymbolView
              name={{
                ios: "doc.text.fill",
                android: "receipt_long",
                web: "receipt_long",
              }}
              size={24}
              tintColor={Colors.primaryDark}
            />
          </View>
        </Pressable>
      </View>

      <Pressable
        style={styles.banner}
        onPress={() =>
          router.push({
            pathname: "/(customer)/ride/create",
            params: { service: "car" },
          })
        }
      >
        <View style={styles.bannerCopy}>
          <Text style={styles.bannerTitle}>Mau santai di perjalanan?</Text>
          <View style={styles.bannerButton}>
            <Text style={styles.bannerButtonText}>Pesan AnterGo Car</Text>
          </View>
        </View>
        <Text style={styles.bannerEmoji}>🚙</Text>
      </Pressable>

      <View style={styles.productGrid}>
        {products.data?.data.slice(0, 4).map((product) => (
          <Pressable
            key={product.id}
            style={styles.productCard}
            onPress={() =>
              router.push({
                pathname: "/(customer)/food/merchant/[id]",
                params: {
                  id: String(product.merchant_id),
                  service:
                    product.product_type === "goods" ? "shopping" : "food",
                },
              })
            }
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
            <View style={styles.discount}>
              <Text style={styles.discountText}>
                {product.product_type === "goods"
                  ? "Produk terdekat"
                  : "Kuliner terdekat"}
              </Text>
            </View>
            <View style={styles.productInfo}>
              <Text numberOfLines={1} style={styles.productName}>
                {product.name}
              </Text>
              <Text style={styles.price}>{formatRupiah(product.price)}</Text>
            </View>
          </Pressable>
        ))}
        {!products.isLoading && !products.data?.data.length ? (
          <>
            <View style={styles.demoCard}>
              <View style={styles.demoFood}>
                <Text style={styles.fallbackEmoji}>🍛</Text>
              </View>
              <View style={styles.discount}>
                <Text style={styles.discountText}>Kuliner terdekat</Text>
              </View>
            </View>
            <View style={styles.demoCard}>
              <View style={styles.demoShop}>
                <Text style={styles.fallbackEmoji}>🛍️</Text>
              </View>
              <View style={styles.discount}>
                <Text style={styles.discountText}>Produk terdekat</Text>
              </View>
            </View>
          </>
        ) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingHorizontal: 0,
    paddingTop: 0,
    gap: 0,
    backgroundColor: "#FFFFFF",
  },
  header: {
    minHeight: 82,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#A7EFD2",
  },
  search: {
    flex: 1,
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 13,
    paddingHorizontal: 18,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
  },
  searchText: {
    color: "#9A9A9A",
    fontSize: 18,
    fontFamily: "Outfit_400Regular",
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8FFF7",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  avatarText: {
    color: Colors.primaryDark,
    fontSize: 20,
    fontWeight: "800",
    fontFamily: "Outfit_800ExtraBold",
  },
  serviceArea: {
    paddingTop: 28,
    paddingBottom: 25,
    backgroundColor: "#FFFFFF",
  },
  serviceGrid: { paddingHorizontal: 20, gap: 28 },
  serviceRow: { flexDirection: "row", justifyContent: "center" },
  serviceRowBottom: { flexDirection: "row", justifyContent: "center" },
  service: { width: "30%", alignItems: "center", gap: 7 },
  emoji: { fontSize: 44, lineHeight: 54 },
  serviceLabel: {
    color: "#222222",
    fontSize: 15,
    fontFamily: "Outfit_400Regular",
    textAlign: "center",
  },
  walletScroller: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 28,
    backgroundColor: "#FFFFFF",
  },
  wallet: {
    minHeight: 92,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D8D8D8",
  },
  balanceCard: { width: "41%" },
  topupCard: { flex: 1 },
  walletCaption: {
    color: "#757575",
    fontSize: 14,
    fontFamily: "Outfit_400Regular",
    marginBottom: 5,
  },
  walletTitle: {
    color: "#171717",
    fontSize: 17,
    fontWeight: "800",
    fontFamily: "Outfit_800ExtraBold",
  },
  balanceIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primarySoft,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  balanceMark: { color: Colors.primaryDark, fontWeight: "900" },
  billIcon: {
    width: 37,
    height: 37,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DDF8EE",
  },
  banner: {
    minHeight: 150,
    marginHorizontal: 16,
    marginBottom: 28,
    overflow: "hidden",
    flexDirection: "row",
    borderRadius: 19,
    backgroundColor: "#DEDEDE",
  },
  bannerCopy: {
    flex: 1,
    zIndex: 1,
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 18,
    paddingLeft: 18,
  },
  bannerTitle: {
    color: "#2B2B2B",
    fontSize: 20,
    fontWeight: "800",
    fontFamily: "Outfit_800ExtraBold",
  },
  bannerButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: "#FFFFFF",
  },
  bannerButtonText: {
    color: "#202020",
    fontSize: 15,
    fontWeight: "800",
    fontFamily: "Outfit_800ExtraBold",
  },
  bannerEmoji: {
    alignSelf: "flex-end",
    marginRight: 10,
    marginBottom: 17,
    fontSize: 68,
  },
  productGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 16,
  },
  productCard: {
    width: "48%",
    flexGrow: 1,
    overflow: "hidden",
    borderRadius: 18,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  productImage: { width: "100%", height: 180, resizeMode: "cover" },
  productFallback: {
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F8F1",
  },
  fallbackEmoji: { fontSize: 70 },
  discount: {
    marginTop: -35,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderTopRightRadius: 18,
    backgroundColor: Colors.primary,
  },
  discountText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    fontFamily: "Outfit_700Bold",
  },
  productInfo: { padding: 12, gap: 4 },
  productName: {
    color: "#222222",
    fontSize: 15,
    fontWeight: "700",
    fontFamily: "Outfit_700Bold",
  },
  price: {
    color: Colors.primaryDark,
    fontSize: 14,
    fontWeight: "800",
    fontFamily: "Outfit_800ExtraBold",
  },
  demoCard: {
    width: "48%",
    flexGrow: 1,
    height: 220,
    overflow: "hidden",
    borderRadius: 18,
    backgroundColor: "#F2F2F2",
  },
  demoFood: {
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5E3D7",
  },
  demoShop: {
    height: 220,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#DDF6EE",
  },
});
