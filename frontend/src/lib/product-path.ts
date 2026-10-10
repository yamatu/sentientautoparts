// Mirrors services.BuildProductPublicPath in the Go backend. A reserved prefix
// makes unusual SKUs reversible without slash routing or normalization collisions.
export function productPathID(input: string): string {
  const sku = input.trim();
  if (!sku) return '';
  if (/^[A-Za-z0-9_.-]+$/.test(sku) && sku !== '.' && sku !== '..') return sku;
  const binary = Array.from(new TextEncoder().encode(sku), b => String.fromCharCode(b)).join('');
  return '~' + btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
