'use client';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAdminI18n } from '@/lib/admin-i18n';
import { queryKeys } from '@/lib/react-query';
import { SocialMediaService } from '@/services/social-media.service';
import type { SocialMediaSettingsRequest } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaFacebookF, FaInstagram, FaLinkedinIn, FaXTwitter, FaYoutube, FaWhatsapp } from 'react-icons/fa6';
import { toast } from 'react-hot-toast';
import { publicLink } from '@/lib/public-links';
const EMPTY:SocialMediaSettingsRequest={x_url:'',facebook_url:'',instagram_url:'',linkedin_url:'',youtube_url:'',whatsapp_url:''};
const platforms=[
 {key:'x_url',name:'X',placeholder:'https://x.com/your-account',Icon:FaXTwitter},
 {key:'facebook_url',name:'Facebook',placeholder:'https://www.facebook.com/your-page',Icon:FaFacebookF},
 {key:'instagram_url',name:'Instagram',placeholder:'https://www.instagram.com/your-account',Icon:FaInstagram},
 {key:'linkedin_url',name:'LinkedIn',placeholder:'https://www.linkedin.com/company/your-company',Icon:FaLinkedinIn},
 {key:'youtube_url',name:'YouTube',placeholder:'https://www.youtube.com/@your-channel',Icon:FaYoutube},
 {key:'whatsapp_url',name:'WhatsApp',placeholder:'https://wa.me/8612345678901',Icon:FaWhatsapp},
] as const;
function errorMessage(error:unknown){return (error as {response?:{data?:{error?:string}}})?.response?.data?.error||(error instanceof Error?error.message:'Save failed');}
export default function Page(){
 const {locale}=useAdminI18n();const zh=locale==='zh';const qc=useQueryClient();const [form,setForm]=useState(EMPTY);const [dirty,setDirty]=useState(false);
 const query=useQuery({queryKey:queryKeys.socialMedia.admin(),queryFn:()=>SocialMediaService.getAdmin(),refetchOnWindowFocus:false});
 useEffect(()=>{if(query.data&&!dirty){const saved=query.data;setForm(Object.fromEntries(platforms.map(p=>[p.key,saved[p.key]||''])) as SocialMediaSettingsRequest);}},[query.data,dirty]);
 const save=useMutation({mutationFn:()=>SocialMediaService.update(form),onSuccess:async value=>{qc.setQueryData(queryKeys.socialMedia.admin(),value);setDirty(false);await qc.invalidateQueries({queryKey:queryKeys.socialMedia.all()});toast.success(zh?'社媒已保存，前台下次刷新立即显示':'Saved. Public pages update on the next request.');},onError:e=>toast.error(errorMessage(e))});
 return <AdminLayout><div className="max-w-4xl space-y-5"><div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold">{zh?'社媒与 WhatsApp':'Social media & WhatsApp'}</h1><p className="mt-2 text-sm text-gray-500">{zh?'留空即隐藏，不显示空图标。保存后的链接进入页头、页脚、联系页与组织结构化数据。':'Blank links are hidden. Saved links appear in the header, footer, contact page and Organization data.'}</p></div><a href="/" target="_blank" rel="noreferrer" className="whitespace-nowrap text-sm text-blue-700">{zh?'预览网站 ↗':'View website ↗'}</a></div>
 <p className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">{zh?'显示位置与 WhatsApp 悬浮按钮在“网站资料 / B2B 设置”中控制；请只填写你自己的账号。':'Display positions and the floating WhatsApp button are controlled in Website / B2B Settings. Use only your own profiles.'} <Link className="underline" href="/admin/storefront">{zh?'前往设置':'Open settings'}</Link></p>
 {query.isLoading?<p>Loading…</p>:query.isError?<p role="alert">{errorMessage(query.error)}</p>:<form onSubmit={e=>{e.preventDefault();save.mutate();}} className="space-y-5"><div className="divide-y overflow-hidden rounded-lg border bg-white">{platforms.map(({key,name,placeholder,Icon})=><div key={key} className="grid gap-3 p-5 sm:grid-cols-[160px_minmax(0,1fr)_30px] sm:items-center"><label htmlFor={key} className="flex items-center gap-3 font-medium"><Icon aria-hidden="true"/>{name}</label><input id={key} type="url" maxLength={500} value={form[key]} onChange={e=>{setDirty(true);setForm({...form,[key]:e.target.value});}} placeholder={placeholder} className="min-w-0 rounded-md border px-3 py-2 text-sm"/>{publicLink(form[key])?<a href={publicLink(form[key])!} target="_blank" rel="noopener noreferrer" aria-label={`Open ${name}`}><ExternalLink size={18}/></a>:<span/>}</div>)}</div><div className="flex items-center justify-between"><span className="text-sm text-gray-500">{platforms.filter(p=>form[p.key].trim()).length}/6 {zh?'已填写':'configured'}{dirty?zh?' · 未保存':' · Unsaved':''}</span><button type="submit" disabled={save.isPending} className="flex items-center gap-2 rounded bg-blue-700 px-5 py-2 text-white disabled:opacity-50"><Save size={18}/>{save.isPending?(zh?'保存中…':'Saving…'):(zh?'保存社媒':'Save social links')}</button></div></form>}</div></AdminLayout>;
}
