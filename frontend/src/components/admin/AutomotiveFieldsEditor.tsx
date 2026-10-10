'use client';
import type { AutomotiveFields } from '@/types/automotive';
import { useAdminI18n } from '@/lib/admin-i18n';

const inputClass = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none';
const specs: [keyof AutomotiveFields, string, string, string][] = [
  ['part_type', '配件类型', 'Part type', 'A/C Compressor'],
  ['vehicle_make', '适用车厂（非供应商品牌）', 'Vehicle make (not supplier brand)', 'Toyota'],
  ['compressor_type', '压缩机型号 / 系列', 'Compressor type / series', '10S20C'],
  ['refrigerant', '制冷剂', 'Refrigerant', 'R134a'],
  ['voltage', '电压', 'Voltage', '12 V'],
  ['pulley_grooves', '皮带轮槽数', 'Pulley grooves', '6PK'],
  ['pulley_diameter', '皮带轮直径（带单位）', 'Pulley diameter (with unit)', '120 mm'],
  ['displacement', '排量（带单位）', 'Displacement (with unit)', ''],
  ['oil_type', '冷冻油类型', 'Oil type', ''],
  ['oil_capacity', '冷冻油容量（带单位）', 'Oil capacity (with unit)', ''],
];
export default function AutomotiveFieldsEditor({ value, onChange }: { value: AutomotiveFields; onChange: (next: AutomotiveFields) => void }) {
  const { locale } = useAdminI18n(); const zh = locale === 'zh';
  const update = (key: keyof AutomotiveFields, next: unknown) => onChange({ ...value, [key]: next });
  return <section className="space-y-5 rounded-lg bg-white p-6 shadow" aria-label="Automotive product fields">
    <div><h3 className="text-lg font-semibold">{zh ? '汽配规格与车型适配' : 'Automotive specifications & fitment'}</h3><p className="mt-1 text-sm text-gray-500">{zh ? '仅录入来源可核实的数据；未知留空。OE 参考号不等于适配保证，车厂与配件制造商分开维护。' : 'Enter verified source data only; leave unknown values blank. OE references do not guarantee fitment. Keep vehicle makes separate from part manufacturers.'}</p></div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{specs.map(([key, cn, en, placeholder]) => <label key={key} className="block text-sm font-medium">{zh ? cn : en}<input className={inputClass + ' mt-1'} value={String(value[key] || '')} placeholder={placeholder} maxLength={key === 'voltage' || key === 'pulley_grooves' ? 40 : 80} onChange={e => update(key, e.target.value)} /></label>)}</div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{(['oe_numbers', 'interchange_numbers'] as const).map(key => <label key={key} className="block text-sm font-medium">{key === 'oe_numbers' ? (zh ? 'OE / OEM 参考号（每行一个）' : 'OE / OEM references (one per line)') : (zh ? '交叉 / 替换参考号（每行一个）' : 'Interchange references (one per line)')}<textarea className={inputClass + ' mt-1 font-mono'} rows={4} value={value[key].join('\n')} onChange={e => update(key, e.target.value.split('\n'))} onBlur={() => update(key, [...new Set(value[key].map(v => v.trim()).filter(Boolean))])} /></label>)}</div>
    <div className="flex items-center justify-between"><h4 className="font-semibold">{zh ? '适配车辆清单' : 'Vehicle applications'}</h4><button type="button" className="rounded border border-blue-200 px-3 py-2 text-sm text-blue-700" onClick={() => update('fitments', [...value.fitments, { make: value.vehicle_make, model: '', engine: '', notes: '' }])}>{zh ? '添加车型' : 'Add vehicle'}</button></div>
    {value.fitments.map((fitment, index) => <fieldset key={index} className="grid grid-cols-2 gap-3 rounded border border-gray-200 p-4"><legend className="px-1 text-xs text-gray-500">{zh ? '适配' : 'Fitment'} {index + 1}</legend>
      {(['make', 'model', 'engine', 'notes'] as const).map(key => <label key={key} className="text-sm">{{ make: zh ? '车厂 *' : 'Make *', model: zh ? '车型' : 'Model', engine: zh ? '发动机' : 'Engine', notes: zh ? '来源 / 备注' : 'Source / notes' }[key]}<input className={inputClass} required={key === 'make'} value={fitment[key]} onChange={e => update('fitments', value.fitments.map((v, i) => i === index ? { ...v, [key]: e.target.value } : v))} /></label>)}
      {(['year_from', 'year_to'] as const).map(key => <label key={key} className="text-sm">{key === 'year_from' ? (zh ? '起始年份' : 'Year from') : (zh ? '结束年份' : 'Year to')}<input className={inputClass} type="number" min={1900} max={2100} value={fitment[key] ?? ''} onChange={e => update('fitments', value.fitments.map((v, i) => i === index ? { ...v, [key]: e.target.value ? Number(e.target.value) : undefined } : v))} /></label>)}
      <button type="button" className="text-left text-sm text-red-600" onClick={() => update('fitments', value.fitments.filter((_, i) => i !== index))}>{zh ? '删除此车型' : 'Remove vehicle'}</button>
    </fieldset>)}
    <label className="block text-sm font-medium">{zh ? '适配核对说明 / 原始应用文本' : 'Fitment verification / original application text'}<textarea className={inputClass + ' mt-1'} rows={3} value={value.fitment_notes} onChange={e => update('fitment_notes', e.target.value)} /></label>
  </section>;
}
