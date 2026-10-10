'use client';
import { useEffect, useRef, useState } from 'react';
import type { ImgHTMLAttributes } from 'react';
import fallbacks from '@/lib/legacy-image-fallbacks.json';
export default function SafeImage({ src, alt, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [failedURL, setFailedURL] = useState('');
  const image = useRef<HTMLImageElement>(null);
  const safe = typeof src === 'string' && !/[\\\r\n]/.test(src) && (/^https?:\/\//i.test(src) || (src.startsWith('/') && !src.startsWith('//')));
  const candidate = safe ? (fallbacks as Record<string, string>)[String(src)] || String(src) : '/images/placeholder.svg';
  const resolved = failedURL === candidate ? '/images/placeholder.svg' : candidate;
  useEffect(() => {
    // An SSR image can fail before React attaches onError during hydration.
    if (image.current?.complete && image.current.naturalWidth === 0) setFailedURL(candidate);
  }, [candidate]);
  return <img {...props} ref={image} src={resolved} alt={alt || ''} onError={() => setFailedURL(candidate)} />;
}
