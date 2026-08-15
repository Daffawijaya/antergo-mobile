import { useMemo as useThemeMemo , useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StyleSheet, Text, View } from "react-native";
import {
  Button,
  Card,
  FormField,
  KeyValue,
  Notice,
  PageHeader,
  Screen,
  SectionHeader,
  StatusState,
} from "@/components/ui";
import { Colors, Spacing, Typography } from "@/constants/colors";
import { getApiErrorMessage } from "@/lib/api/client";
import { createMerchantProduct, getMerchantProfile } from "@/lib/api/resources";
import { useAppTheme } from "@/stores/theme-store";
export default function MerchantProducts() {
  const { styles } = useScreenStyles();
  const client = useQueryClient();
  const query = useQuery({
    queryKey: ["merchant", "profile"],
    queryFn: getMerchantProfile,
  });
  const [showForm, setShowForm] = useState(false);
  const [type, setType] = useState<"food" | "goods">("food");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [validation, setValidation] = useState("");
  const mutation = useMutation({
    mutationFn: createMerchantProduct,
    onSuccess: async () => {
      setName("");
      setDescription("");
      setPrice("");
      setStock("");
      setShowForm(false);
      await client.invalidateQueries({ queryKey: ["merchant", "profile"] });
    },
  });
  const submit = () => {
    const numericPrice = Number(price);
    const numericStock = Number(stock);
    if (
      name.trim().length < 2 ||
      !Number.isFinite(numericPrice) ||
      numericPrice < 0 ||
      !Number.isInteger(numericStock) ||
      numericStock < 0
    ) {
      setValidation("Lengkapi nama, harga, dan stok dengan benar.");
      return;
    }
    setValidation("");
    mutation.mutate({
      name: name.trim(),
      description: description.trim() || null,
      price: numericPrice,
      stock: numericStock,
      product_type: type,
    });
  };
  const products = query.data?.products ?? [];
  return (
    <Screen>
      <PageHeader
        eyebrow="MERCHANT"
        title="Produk"
        description="Kelola makanan, minuman, dan barang toko."
        action={
          <Button
            compact
            title={showForm ? "Tutup" : "Tambah"}
            variant="secondary"
            onPress={() => setShowForm((value) => !value)}
          />
        }
      />
      {showForm ? (
        <Card>
          <SectionHeader title="Produk baru" />
          <Text style={styles.label}>Jenis produk</Text>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Button
                compact
                title="Food & Drink"
                variant={type === "food" ? "primary" : "secondary"}
                onPress={() => setType("food")}
              />
            </View>
            <View style={styles.flex}>
              <Button
                compact
                title="Goods"
                variant={type === "goods" ? "primary" : "secondary"}
                onPress={() => setType("goods")}
              />
            </View>
          </View>
          <FormField label="Nama produk" value={name} onChangeText={setName} />
          <FormField
            label="Deskripsi (opsional)"
            value={description}
            onChangeText={setDescription}
            multiline
          />
          <FormField
            label="Harga"
            value={price}
            onChangeText={setPrice}
            keyboardType="numeric"
          />
          <FormField
            label="Stok"
            value={stock}
            onChangeText={setStock}
            keyboardType="number-pad"
          />
          {validation ? <Notice tone="danger">{validation}</Notice> : null}
          {mutation.isError ? (
            <Notice tone="danger">{getApiErrorMessage(mutation.error)}</Notice>
          ) : null}
          <Button
            title="Simpan produk"
            loading={mutation.isPending}
            onPress={submit}
          />
        </Card>
      ) : null}
      {query.isLoading ? (
        <StatusState type="loading" />
      ) : query.isError ? (
        <StatusState
          type="error"
          message={getApiErrorMessage(query.error)}
          action={
            <Button
              title="Coba lagi"
              variant="secondary"
              onPress={() => query.refetch()}
            />
          }
        />
      ) : !products.length ? (
        <StatusState type="empty" message="Belum ada produk di katalog." />
      ) : (
        products.map((product) => (
          <Card key={product.id}>
            <View style={styles.heading}>
              <Text style={styles.title}>{product.name}</Text>
              <Text style={styles.badge}>
                {product.product_type === "goods" ? "Goods" : "Food & Drink"}
              </Text>
            </View>
            <KeyValue
              label="Harga"
              value={`Rp ${Number(product.price).toLocaleString("id-ID")}`}
            />
            <KeyValue label="Stok" value={product.stock} />
            <KeyValue
              label="Status"
              value={product.is_available ? "Tersedia" : "Tidak tersedia"}
            />
          </Card>
        ))
      )}
    </Screen>
  );
}
function useScreenStyles() {
  const { colors } = useAppTheme();
  return { styles: useThemeMemo(() => createStyles(colors), [colors]) };
}
const createStyles = (colors: ReturnType<typeof useAppTheme>["colors"]) => StyleSheet.create({
  row: { flexDirection: "row", gap: Spacing.sm },
  flex: { flex: 1 },
  label: { color: colors.text, ...Typography.metadata, fontWeight: "700" },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  title: { flex: 1, color: colors.text, ...Typography.cardTitle },
  badge: {
    color: Colors.primaryDark,
    backgroundColor: Colors.primarySoft,
    overflow: "hidden",
    borderRadius: 99,
    paddingHorizontal: 9,
    paddingVertical: 5,
    ...Typography.caption,
  },
});
