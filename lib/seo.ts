// Set NEXT_PUBLIC_SITE_URL to the canonical production origin before launch.
export const siteUrl = new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000');
