'use client';
import { useState } from 'react';
import SafeImage from './SafeImage';
import type { HomeData } from '@/services/storefront.server';
import { publicLink } from '@/lib/public-links';

export default function BannerCarousel({ banners }: { banners: HomeData['banners'] }) {
  const [index, setIndex] = useState(0);
  if (!banners.length) return null;
  const banner = banners[index % banners.length];
  const href = publicLink(banner.link_url);
  const image=<SafeImage src={banner.image_url} alt={banner.title || 'Featured products'} loading="lazy"/>;
  return <section className="sap-banner-carousel" aria-label="Homepage banners" aria-roledescription="carousel">
    {href?<a href={href} {...(/^https?:/.test(href)?{target:'_blank',rel:'noopener noreferrer'}:{})}>{image}</a>:image}
    {banner.title&&<h3>{banner.title}</h3>}
    {banner.description&&<p>{banner.description}</p>}
    {banners.length > 1 && <div className="legacy-banner-controls">
      <button type="button" aria-label="Previous banner" onClick={() => setIndex((index - 1 + banners.length) % banners.length)}>←</button>
      <span aria-live="polite">{index + 1} / {banners.length}</span>
      <button type="button" aria-label="Next banner" onClick={() => setIndex((index + 1) % banners.length)}>→</button>
    </div>}
  </section>;
}
