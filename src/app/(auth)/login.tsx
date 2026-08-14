import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { Button, FormField, PageHeader, Screen } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { getApiErrorMessage } from '@/lib/api/client';
import { type LoginForm, loginSchema } from '@/schemas/auth';
import { useAuthStore } from '@/stores/auth-store';

export default function LoginScreen() {
  const login = useAuthStore((state) => state.login);
  const [serverError, setServerError] = useState<string>();
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });
  const submit = handleSubmit(async (values) => { setServerError(undefined); try { await login(values); } catch (error) { setServerError(getApiErrorMessage(error)); } });
  return <Screen><View style={styles.spacer} /><PageHeader eyebrow="AnterGo" title="Selamat datang" description="Masuk untuk melanjutkan sesuai peran akun Anda." /><View style={styles.form}><Controller control={control} name="email" render={({ field }) => <FormField label="Email" autoCapitalize="none" keyboardType="email-address" value={field.value} onBlur={field.onBlur} onChangeText={field.onChange} error={errors.email?.message} />} /><Controller control={control} name="password" render={({ field }) => <FormField label="Password" secureTextEntry value={field.value} onBlur={field.onBlur} onChangeText={field.onChange} error={errors.password?.message} />} />{serverError ? <Text style={styles.error}>{serverError}</Text> : null}<Button title="Masuk" loading={isSubmitting} onPress={submit} /></View><Text style={styles.footer}>Belum punya akun? <Link href="./register" style={styles.link}>Daftar sebagai customer</Link></Text></Screen>;
}
const styles = StyleSheet.create({ spacer: { flex: 1, minHeight: 30 }, form: { gap: 15 }, error: { color: Colors.danger, lineHeight: 20 }, footer: { textAlign: 'center', color: Colors.muted }, link: { color: Colors.primary, fontWeight: '700' } });
