import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import {
  Button,
  Card,
  KeyValue,
  PageHeader,
  Screen,
  StatusState,
} from "@/components/ui";
import { Colors } from "@/constants/colors";
import { formatRupiah } from "@/lib/format";
import { useCartStore } from "@/stores/cart-store";

export default function CartScreen() {
  const router = useRouter();
  const merchant = useCartStore((s) => s.merchant);
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const clear = useCartStore((s) => s.clear);
  const service =
    items[0]?.product.product_type === "goods" ? "shopping" : "food";
  const title = service === "shopping" ? "Shopping Cart" : "Food Cart";
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0,
  );
  return (
    <Screen>
      <Button
        title="Kembali"
        variant="secondary"
        onPress={() => router.back()}
      />
      <PageHeader
        eyebrow={title}
        title={merchant?.name ?? "Cart"}
        description="Subtotal hanya preview. Harga dan stok final divalidasi backend."
      />
      {!merchant || !items.length ? (
        <StatusState
          type="empty"
          message="Cart masih kosong."
          action={
            <Button
              title="Cari Merchant"
              onPress={() =>
                router.replace({
                  pathname: "/(customer)/food",
                  params: { service },
                })
              }
            />
          }
        />
      ) : (
        <>
          {items.map((item) => (
            <Card key={item.product.id}>
              <Text style={styles.title}>{item.product.name}</Text>
              <KeyValue
                label="Harga preview"
                value={formatRupiah(item.product.price)}
              />
              <KeyValue label="Stok diketahui" value={item.product.stock} />
              <View style={styles.row}>
                <View style={styles.flex}>
                  <Button
                    title="−"
                    variant="secondary"
                    onPress={() =>
                      setQuantity(item.product.id, item.quantity - 1)
                    }
                  />
                </View>
                <Text style={styles.quantity}>{item.quantity}</Text>
                <View style={styles.flex}>
                  <Button
                    title="+"
                    variant="secondary"
                    disabled={item.quantity >= item.product.stock}
                    onPress={() =>
                      setQuantity(item.product.id, item.quantity + 1)
                    }
                  />
                </View>
              </View>
            </Card>
          ))}
          <Card>
            <KeyValue label="Subtotal preview" value={formatRupiah(subtotal)} />
            <Text style={styles.muted}>
              Delivery fee, service fee, harga, dan total final dihitung Laravel
              saat checkout.
            </Text>
          </Card>
          <Button
            title="Lanjut Checkout"
            onPress={() =>
              router.push({
                pathname: "/(customer)/food/checkout",
                params: { service },
              })
            }
          />
          <Button title="Kosongkan Cart" variant="danger" onPress={clear} />
        </>
      )}
    </Screen>
  );
}
const styles = StyleSheet.create({
  title: { color: Colors.text, fontWeight: "800", fontSize: 17 },
  muted: { color: Colors.muted, lineHeight: 20 },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  flex: { flex: 1 },
  quantity: {
    minWidth: 32,
    textAlign: "center",
    color: Colors.text,
    fontWeight: "800",
    fontSize: 18,
  },
});
