import { DriverLocationTracker } from '@/components/driver-location-tracker';
import { RoleTabs } from '@/components/role-tabs';

export default function DriverLayout() {
  return <><DriverLocationTracker /><RoleTabs middle="orders" hidden={["ride", "food"]} /></>;
}