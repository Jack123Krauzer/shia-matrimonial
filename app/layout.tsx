import type { Metadata } from "next";
import "./globals.css";
import { baseTheme } from "@/lib/ui/tailwind";
import { siteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: { default: "Sukoon | Shia Matrimony with Faith & Intention", template: "%s | Sukoon" },
  description: "A thoughtful path to marriage. Explore compatibility, connect with consent, and share at your own pace.",
  openGraph: { type: "website", siteName: "Sukoon", locale: "en_IN", title: "Sukoon · Shia Matrimony", description: "Shared faith. Meaningful connections. A thoughtful path to marriage." },
  twitter: { card: "summary_large_image" },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${baseTheme} antialiased`}>{children}</body>
    </html>
  );
}
