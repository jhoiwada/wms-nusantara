import { redirect } from 'next/navigation';
import { requireAuth } from '@/server/auth/rbac';
import { AppShell } from '@/components/features/app-shell';
import type { SessionUser } from '@/server/auth/session';

export const instant = false;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  let user: SessionUser;
  try {
    user = await requireAuth();
  } catch {
    redirect('/login');
  }

  return <AppShell user={user}>{children}</AppShell>;
}
