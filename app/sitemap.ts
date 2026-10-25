import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/seo';
export default function sitemap(): MetadataRoute.Sitemap { return ['', '/how-it-works', '/privacy'].map(path=>({ url: new URL(path || '/', siteUrl).href, changeFrequency: 'monthly', priority: path ? 0.7 : 1 })); }
