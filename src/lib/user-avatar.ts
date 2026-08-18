import type { AppRole, User } from "@/types/api";

// Each role keeps its own photo; show the one matching the active role so a
// driver/customer/merchant avatar doesn't leak into another role's view.
export function roleAvatar(
  user: User | null,
  activeRole: AppRole | null,
): string | null {
  if (!user) return null;
  if (activeRole === "driver") return user.driver_photo;
  if (activeRole === "merchant") return user.merchant_photo;
  return user.customer_photo;
}
