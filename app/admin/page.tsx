import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import AdminDashboard from './admin-dashboard';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await currentUser();
  if (!user?.isAdmin) redirect('/admin/login');
  return <AdminDashboard/>;
}
