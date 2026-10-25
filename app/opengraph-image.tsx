import { ImageResponse } from 'next/og';
import { themeColors } from '@/tailwind.config';
export const alt = 'Sukoon Shia Matrimony — A shared faith. A beautiful beginning.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default function OpenGraphImage(){
  // The image renderer has its own Tailwind runtime; feed it the shared tokens.
  const accent = `text-[${themeColors['accent-light']}]`;
  return new ImageResponse(<div tw={`flex h-full w-full flex-col items-center justify-center bg-[${themeColors['primary-strong']}] text-[${themeColors.canvas}]`}><div tw={`mb-12 flex text-2xl tracking-widest ${accent}`}>SUKOON · SHIA MATRIMONY</div><div tw="flex text-7xl">A shared faith.</div><div tw={`mt-3 flex text-7xl ${accent}`}>A beautiful beginning.</div><div tw={`mt-12 flex text-2xl text-[${themeColors['on-primary-muted']}]`}>Faith · Family · A future together</div></div>,size);
}
