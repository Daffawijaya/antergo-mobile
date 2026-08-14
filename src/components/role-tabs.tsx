import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Colors } from '@/constants/colors';
export function RoleTabs({ middle, hidden }: { middle: string; hidden?: string | string[] }) {
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: Colors.primary, tabBarInactiveTintColor: Colors.subtle, tabBarHideOnKeyboard: true, tabBarStyle: { height: 72, paddingTop: 8, paddingBottom: 9, borderTopColor: Colors.border, backgroundColor: Colors.surface }, tabBarLabelStyle: { fontSize: 11, fontWeight: '700' } }}>
    <Tabs.Screen name="index" options={{ title: 'Beranda', tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'house.fill', android: 'home', web: 'home' }} size={23} tintColor={String(color)} /> }} />
    <Tabs.Screen name={middle} options={{ title: 'Pesanan', tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'doc.text.fill', android: 'receipt_long', web: 'receipt_long' }} size={23} tintColor={String(color)} /> }} />
    <Tabs.Screen name="profile" options={{ title: 'Profil', tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'person.fill', android: 'person', web: 'person' }} size={23} tintColor={String(color)} /> }} />
    {hidden ? (Array.isArray(hidden) ? hidden : [hidden]).map((name) => <Tabs.Screen key={name} name={name} options={{ href: null }} />) : null}
  </Tabs>;
}
