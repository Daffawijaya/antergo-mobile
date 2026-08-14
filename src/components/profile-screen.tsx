import { useState } from 'react';

import { getApiErrorMessage } from '@/lib/api/client';
import { useAuthStore } from '@/stores/auth-store';
import type { AppRole } from '@/types/api';
import { Button, Card, KeyValue, PageHeader, Screen } from './ui';

const ROLE_LABELS: Record<AppRole, string> = {
  customer: 'Customer',
  driver: 'Driver',
  merchant: 'Merchant',
};

export function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const activeRole = useAuthStore((state) => state.activeRole);
  const setActiveRole = useAuthStore((state) => state.setActiveRole);
  const logout = useAuthStore((state) => state.logout);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const availableRoles = (['customer', 'driver', 'merchant'] as AppRole[])
    .filter((role) => user?.roles.includes(role));

  const handleRoleChange = async (role: AppRole) => {
    await setActiveRole(role);
  };

  const handleLogout = async () => {
    setLoading(true); setError(undefined);
    try { await logout(); } catch (cause) { setError(getApiErrorMessage(cause)); } finally { setLoading(false); }
  };

  return <Screen>
    <PageHeader eyebrow="Akun" title={user?.name ?? 'Profil'} description="Informasi akun dari Laravel API." />
    <Card>
      <KeyValue label="Email" value={user?.email ?? '-'} />
      <KeyValue label="Telepon" value={user?.phone ?? '-'} />
      <KeyValue label="Roles" value={user?.roles.join(', ') ?? '-'} />
    </Card>
    {availableRoles.length > 1 ? <Card>
      <KeyValue label="Mode aktif" value={activeRole ? ROLE_LABELS[activeRole] : '-'} />
      {availableRoles.map((role) => <Button
        key={role}
        variant={activeRole === role ? 'primary' : 'secondary'}
        title={ROLE_LABELS[role]}
        disabled={activeRole === role}
        onPress={() => { void handleRoleChange(role); }}
      />)}
    </Card> : null}
    {error ? <Card><KeyValue label="Error" value={error} /></Card> : null}
    <Button variant="danger" title="Keluar" loading={loading} onPress={handleLogout} />
  </Screen>;
}
