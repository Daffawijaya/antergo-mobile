import { Tabs } from 'expo-router';

import { Colors } from '@/constants/colors';

export function RoleTabs({ middle, hidden }: { middle: string; hidden?: string | string[] }) {
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: Colors.primary, tabBarInactiveTintColor: Colors.muted, tabBarStyle: { height: 62, paddingTop: 7, paddingBottom: 7, borderTopColor: Colors.border }, tabBarLabelStyle: { fontWeight: '600' } }}>
    <Tabs.Screen name="index" options={{ title: 'Home' }} />
    <Tabs.Screen name={middle} options={{ title: middle.charAt(0).toUpperCase() + middle.slice(1) }} />
    <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    {hidden ? (Array.isArray(hidden) ? hidden : [hidden]).map((name) => <Tabs.Screen key={name} name={name} options={{ href: null }} />) : null}
  </Tabs>;
}
