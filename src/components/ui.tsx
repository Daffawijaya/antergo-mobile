import type { PropsWithChildren, ReactNode } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, type TextInputProps, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/colors';

export function Screen({ children, scroll = true }: PropsWithChildren<{ scroll?: boolean }>) {
  const content = <View style={styles.content}>{children}</View>;
  return <SafeAreaView style={styles.safe}>{scroll ? <ScrollView contentContainerStyle={styles.scroll}>{content}</ScrollView> : content}</SafeAreaView>;
}

export function PageHeader({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return <View style={styles.header}>{eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}<Text style={styles.title}>{title}</Text>{description ? <Text style={styles.description}>{description}</Text> : null}</View>;
}

export function Card({ children }: PropsWithChildren) { return <View style={styles.card}>{children}</View>; }

export function FormField({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput placeholderTextColor="#929C98" style={[styles.input, error && styles.inputError]} {...props} />{error ? <Text style={styles.errorText}>{error}</Text> : null}</View>;
}

export function Button({ title, onPress, loading, variant = 'primary', disabled }: { title: string; onPress: () => void; loading?: boolean; variant?: 'primary' | 'secondary' | 'danger'; disabled?: boolean }) {
  const inactive = disabled || loading;
  return <Pressable accessibilityRole="button" disabled={inactive} onPress={onPress} style={({ pressed }) => [styles.button, styles[`${variant}Button`], inactive && styles.disabled, pressed && styles.pressed]}>{loading ? <ActivityIndicator color={variant === 'primary' ? '#fff' : Colors.primary} /> : <Text style={[styles.buttonText, variant !== 'primary' && styles.secondaryButtonText, variant === 'danger' && styles.dangerText]}>{title}</Text>}</Pressable>;
}

export function StatusState({ type, title, message, action }: { type: 'loading' | 'empty' | 'error'; title?: string; message?: string; action?: ReactNode }) {
  return <View style={styles.state}>{type === 'loading' ? <ActivityIndicator color={Colors.primary} size="large" /> : <Text style={styles.stateIcon}>{type === 'error' ? '!' : '—'}</Text>}<Text style={styles.stateTitle}>{title ?? (type === 'loading' ? 'Memuat…' : type === 'empty' ? 'Belum ada data' : 'Terjadi kesalahan')}</Text>{message ? <Text style={styles.stateMessage}>{message}</Text> : null}{action}</View>;
}

export function KeyValue({ label, value }: { label: string; value: string | number }) {
  return <View style={styles.keyValue}><Text style={styles.keyLabel}>{label}</Text><Text style={styles.keyValueText}>{value}</Text></View>;
}

export const uiStyles = StyleSheet.create({ sectionTitle: { color: Colors.text, fontSize: 18, fontWeight: '700' }, row: { flexDirection: 'row', gap: 12 }, gap: { gap: 12 }, muted: { color: Colors.muted, lineHeight: 21 }, badge: { alignSelf: 'flex-start', backgroundColor: Colors.primarySoft, color: Colors.primary, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, fontWeight: '700' } });

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background }, scroll: { flexGrow: 1 }, content: { flex: 1, padding: 20, gap: 20 },
  header: { gap: 6, paddingVertical: 8 }, eyebrow: { color: Colors.primary, fontWeight: '800', fontSize: 12, letterSpacing: 1, textTransform: 'uppercase' }, title: { color: Colors.text, fontSize: 28, lineHeight: 34, fontWeight: '800' }, description: { color: Colors.muted, lineHeight: 21 },
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, gap: 12, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.border },
  field: { gap: 7 }, label: { color: Colors.text, fontWeight: '600' }, input: { minHeight: 50, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface, borderRadius: 12, paddingHorizontal: 14, color: Colors.text, fontSize: 16 }, inputError: { borderColor: Colors.danger }, errorText: { color: Colors.danger, fontSize: 13 },
  button: { minHeight: 50, borderRadius: 12, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' }, primaryButton: { backgroundColor: Colors.primary }, secondaryButton: { backgroundColor: Colors.primarySoft }, dangerButton: { backgroundColor: '#FEECEB' }, buttonText: { color: '#fff', fontWeight: '800', fontSize: 15 }, secondaryButtonText: { color: Colors.primary }, dangerText: { color: Colors.danger }, disabled: { opacity: .55 }, pressed: { opacity: .8 },
  state: { minHeight: 180, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 }, stateIcon: { color: Colors.muted, fontSize: 28 }, stateTitle: { color: Colors.text, fontWeight: '700', fontSize: 17, textAlign: 'center' }, stateMessage: { color: Colors.muted, textAlign: 'center', lineHeight: 20 },
  keyValue: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 3 }, keyLabel: { color: Colors.muted }, keyValueText: { color: Colors.text, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
});
