import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { GET } from '@/app/api/app/route';
import Matrimony from '@/app/matrimony';
import { memberTheme } from '@/lib/ui/tailwind';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Discover Your Connections', robots: { index: false, follow: false } };
export default async function Discover({searchParams}:{searchParams:Promise<{view?:string}>}){
  if(!await currentUser()) redirect('/auth');
  const response = await GET(new Request('http://internal/api/app'));
  if(!response.ok) throw new Error('Unable to load your account. Please try again.');
  const initialView = (await searchParams).view === 'profile' ? 'profile' : 'discover';
  return <div className={memberTheme}><Matrimony initialState={await response.json()} initialView={initialView}/></div>;
}
