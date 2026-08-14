import { useState } from 'react';

import { getApiErrorMessage } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import { Button, Card, KeyValue, PageHeader, Screen } from './ui';

export function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const handleLogout = async () => {
    setLoading(true); setError(undefined);
    try { await logout(); } catch (cause) { setError(getApiErrorMessage(cause)); } finally { setLoading(false); }
  };

  return <Screen><PageHeader eyebrow="Akun" title={user?.name ?? 'Profil'} description="Informasi akun dari Laravel API." /><Card><KeyValue label="Email" value={user?.email ?? '-'} /><KeyValue label="Telepon" value={user?.phone ?? '-'} /><KeyValue label="Role" value={user?.role ?? '-'} /></Card>{error ? <Card><KeyValue label="Error" value={error} /></Card> : null}<Button variant="danger" title="Keluar" loading={loading} onPress={handleLogout} /></Screen>;
}
