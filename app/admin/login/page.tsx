import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import AdminLoginForm from './login-form';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title:'Admin Sign In', robots:{index:false,follow:false} };

export default async function AdminLogin() {
  if ((await currentUser())?.isAdmin) redirect('/admin');
  return <AdminLoginForm/>;
}
