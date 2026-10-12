'use client';
import { useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2 } from 'lucide-react';
import MediaPickerModal from '@/components/admin/MediaPickerModal';
import { publicLink } from '@/lib/public-links';

export type PartnerEntry = { country: string; flag: string; quote: string; author: string };
const input = 'mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm font-normal';
const blank: PartnerEntry = { country: '', flag: '', quote: '', author: '' };

export function toPartners(raw: unknown): PartnerEntry[] {
  if (!Array.isArray(raw)) return [];
  const text = (v: unknown) => (typeof v === 'string' ? v : '');
  return raw.map(p => ({ country: text(p?.country), flag: text(p?.flag), quote: text(p?.quote), author: text(p?.author) }));
}

export default function PartnersEditor({ value, onChange, zh }: { value: PartnerEntry[]; onChange: (next: PartnerEntry[]) => void; zh: boolean }) {
  const [pickerFor, setPickerFor] = useState<number | null>(null);
  const set = (i: number, patch: Partial<PartnerEntry>) => onChange(value.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const move = (i: number, d: number) => { const next = [...value]; [next[i], next[i + d]] = [next[i + d], next[i]]; onChange(next); };
  return (
    <div className="space-y-4 rounded bg-gray-50 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{zh ? '客户评价' : 'Partner testimonials'}</h3>
        <button type="button" disabled={value.length >= 24} onClick={() => onChange([...value, blank])} className="flex items-center gap-1 text-sm text-blue-700 disabled:opacity-40"><Plus size={16} />{zh ? '添加评价' : 'Add testimonial'}</button>
      </div>
      {value.length === 0 && <p className="text-sm text-gray-500">{zh ? '暂无评价，前台只显示地图。' : 'No testimonials yet; only the map is shown.'}</p>}
      {value.map((p, i) => (
        <fieldset key={i} className="space-y-3 rounded border bg-white p-4">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>#{i + 1}</span>
            <div className="flex gap-2">
              <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="disabled:opacity-30"><ArrowUp size={16} /></button>
              <button type="button" aria-label="Move down" disabled={i === value.length - 1} onClick={() => move(i, 1)} className="disabled:opacity-30"><ArrowDown size={16} /></button>
              <button type="button" aria-label="Remove" onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-red-600"><Trash2 size={16} /></button>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">{zh ? '国家 / 地区' : 'Country'}<input className={input} maxLength={80} value={p.country} onChange={e => set(i, { country: e.target.value })} /></label>
            <label className="text-sm font-medium">{zh ? '国旗图片' : 'Flag image'}
              <div className="flex items-center gap-2">
                {publicLink(p.flag) && <img src={publicLink(p.flag)!} alt="" className="mt-1 h-8 w-8 rounded-full object-cover" />}
                <input className={input} maxLength={1000} value={p.flag} onChange={e => set(i, { flag: e.target.value })} />
                <button type="button" aria-label="Choose flag" onClick={() => setPickerFor(i)} className="mt-1 px-2 text-blue-700"><ImagePlus size={18} /></button>
              </div>
            </label>
          </div>
          <label className="block text-sm font-medium">{zh ? '评价内容（无需加引号）' : 'Quote (no quotation marks needed)'}<textarea className={input} rows={3} maxLength={600} required value={p.quote} onChange={e => set(i, { quote: e.target.value })} /></label>
          <label className="block text-sm font-medium">{zh ? '署名' : 'Attribution'}<input className={input} maxLength={160} placeholder="Local Distributor, Riyadh" value={p.author} onChange={e => set(i, { author: e.target.value })} /></label>
        </fieldset>
      ))}
      <MediaPickerModal open={pickerFor !== null} onClose={() => setPickerFor(null)} multiple={false} onSelect={assets => { if (assets[0] && pickerFor !== null) set(pickerFor, { flag: assets[0].url }); setPickerFor(null); }} />
    </div>
  );
}
