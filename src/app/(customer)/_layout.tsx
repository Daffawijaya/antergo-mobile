import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Colors } from '@/constants/colors';
const hidden = ['profile', 'location-picker', 'ride/create', 'ride/[id]', 'food/index', 'food/cart', 'food/checkout', 'food/merchant/[id]', 'food/order/[id]', 'send/create', 'send/[id]', 'chat/[id]'];
export default function CustomerLayout() {
 return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: Colors.primary, tabBarInactiveTintColor: Colors.subtle, tabBarHideOnKeyboard: true, tabBarStyle: { height: 72, paddingTop: 8, paddingBottom: 9, borderTopColor: Colors.border, backgroundColor: Colors.surface }, tabBarLabelStyle: { fontSize: 11, fontWeight: '700' } }}>
  <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'house.fill', android: 'home', web: 'home' }} size={23} tintColor={String(color)} /> }} />
  <Tabs.Screen name="orders" options={{ title: 'Orders', tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'doc.text.fill', android: 'receipt_long', web: 'receipt_long' }} size={23} tintColor={String(color)} /> }} />
  <Tabs.Screen name="chat/index" options={{ title: 'Chat', tabBarIcon: ({ color }) => <SymbolView name={{ ios: 'bubble.left.and.bubble.right.fill', android: 'chat_bubble', web: 'chat_bubble' }} size={23} tintColor={String(color)} /> }} />
  {hidden.map((name) => <Tabs.Screen key={name} name={name} options={{ href: null }} />)}
 </Tabs>;
}
