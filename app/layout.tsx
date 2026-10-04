import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sukoon · Shia Matrimony",
  description: "A thoughtful path to marriage. Explore compatibility, connect with consent, and share at your own pace.",
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
      <body className="antialiased">{children}</body>
    </html>
  );
}
