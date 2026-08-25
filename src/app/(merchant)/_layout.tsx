import { RoleTabs } from "@/components/role-tabs";
export default function MerchantLayout() {
  return <RoleTabs middle="orders" store="store" hidden={["products", "hours"]} />;
}
