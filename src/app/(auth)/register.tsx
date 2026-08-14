import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';

import { Button, FormField, PageHeader, Screen } from '@/components/ui';
import { Colors } from '@/constants/colors';
import { getApiErrorMessage } from '@/lib/api/client';
import { type RegisterForm, registerSchema } from '@/schemas/auth';
import { useAuthStore } from '@/stores/auth-store';

export default function RegisterScreen() {
  const register = useAuthStore((state) => state.register);
  const [serverError, setServerError] = useState<string>();
  const { control, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema), defaultValues: { name: '', email: '', phone: '', password: '', password_confirmation: '' } });
  const submit = handleSubmit(async (values) => { setServerError(undefined); try { await register(values); } catch (error) { setServerError(getApiErrorMessage(error)); } });
  return <Screen><PageHeader eyebrow="Buat akun" title="Mulai dengan AnterGo" description="Registrasi API saat ini membuat akun customer." /><View style={styles.form}><Controller control={control} name="name" render={({ field }) => <FormField label="Nama" value={field.value} onBlur={field.onBlur} onChangeText={field.onChange} error={errors.name?.message} />} /><Controller control={control} name="email" render={({ field }) => <FormField label="Email" autoCapitalize="none" keyboardType="email-address" value={field.value} onBlur={field.onBlur} onChangeText={field.onChange} error={errors.email?.message} />} /><Controller control={control} name="phone" render={({ field }) => <FormField label="Nomor telepon" keyboardType="phone-pad" value={field.value} onBlur={field.onBlur} onChangeText={field.onChange} error={errors.phone?.message} />} /><Controller control={control} name="password" render={({ field }) => <FormField label="Password" secureTextEntry value={field.value} onBlur={field.onBlur} onChangeText={field.onChange} error={errors.password?.message} />} /><Controller control={control} name="password_confirmation" render={({ field }) => <FormField label="Konfirmasi password" secureTextEntry value={field.value} onBlur={field.onBlur} onChangeText={field.onChange} error={errors.password_confirmation?.message} />} />{serverError ? <Text style={styles.error}>{serverError}</Text> : null}<Button title="Daftar" loading={isSubmitting} onPress={submit} /></View><Text style={styles.footer}>Sudah punya akun? <Link href="./login" style={styles.link}>Masuk</Link></Text></Screen>;
}
const styles = StyleSheet.create({ form: { gap: 15 }, error: { color: Colors.danger, lineHeight: 20 }, footer: { textAlign: 'center', color: Colors.muted, paddingBottom: 10 }, link: { color: Colors.primary, fontWeight: '700' } });
