'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { Save, ImagePlus, ExternalLink } from 'lucide-react';
import AdminLayout from '@/components/admin/AdminLayout';
import MediaPickerModal from '@/components/admin/MediaPickerModal';
import { useAdminI18n } from '@/lib/admin-i18n';
import { loadStorefrontSettings, saveStorefrontSettings } from '@/services/storefront-setting.service';
import type { StorefrontSettings, StorefrontSettingsPatch } from '@/types/storefront';
import { publicLink } from '@/lib/public-links';

type TextKey={ [K in keyof StorefrontSettings]-?:StorefrontSettings[K] extends string?K:never }[keyof StorefrontSettings];
const groups:[string,string,[TextKey,string,string,number,boolean?][]][]=[
 ['品牌与页脚','Brand & footer',[
  ['brand_name','显示品牌 *','Brand name *',100],['company_name','公司正式名称','Legal company name',200],['tagline','页头简介','Header tagline',200],['logo_url','Logo 图片地址','Logo URL',500],['footer_intro','页脚介绍','Footer introduction',2000,true],['footer_note','页脚提示','Footer note',500],['copyright_text','版权文字（留空自动生成年份）','Copyright (blank = automatic year)',250],['quote_button_text','页头询价按钮','Header quote button',80],
 ]],
 ['联系信息','Contact details',[
  ['contact_email','公开联系邮箱','Public email',200],['contact_phone','公开电话','Public phone',80],['address','办公 / 工厂地址','Office / factory address',500,true],['business_hours','营业时间与时区','Business hours & timezone',200],
 ]],
 ['询盘与目录','Inquiries & catalog',[
  ['inquiry_heading','询盘表单标题','Inquiry heading',200],['inquiry_intro','询盘填写说明','Inquiry instructions',1000,true],['inquiry_success','提交成功提示','Success message',500],['catalog_url','PDF 目录链接','Catalog PDF URL',500],['catalog_title','目录页标题','Catalog page title',200],['catalog_description','目录请求说明','Catalog instructions',1000,true],
 ]],
 ['首页 SEO','Homepage SEO',[
  ['home_meta_title','SEO 标题','SEO title',200],['home_meta_description','SEO 描述','SEO description',500,true],['home_meta_keywords','SEO 关键词','SEO keywords',500],
 ]],
];
const switches:[keyof StorefrontSettings,string,string][]=[['catalog_enabled','显示目录下载入口','Show catalog request'],['news_enabled','显示新闻导航与首页新闻区','Show news navigation/section'],['distributor_enabled','显示经销商申请入口','Show distributor application'],['social_header','页头显示社媒','Social links in header'],['social_footer','页脚显示社媒','Social links in footer'],['whatsapp_floating','显示 WhatsApp 悬浮入口（需配置链接）','Floating WhatsApp (requires configured link)']];
export default function Page(){
 const {locale}=useAdminI18n();const zh=locale==='zh';const qc=useQueryClient();const [form,setForm]=useState<StorefrontSettings|null>(null);const [dirty,setDirty]=useState(false);const [picker,setPicker]=useState(false);
 const query=useQuery({queryKey:['storefront-settings'],queryFn:loadStorefrontSettings,refetchOnWindowFocus:false});
 useEffect(()=>{if(query.data&&!dirty)setForm(query.data);},[query.data,dirty]);
 const save=useMutation({mutationFn:async()=>{if(!form)throw new Error('Settings not loaded');const {id,updated_at,...patch}=form;return saveStorefrontSettings(patch as StorefrontSettingsPatch);},onSuccess:value=>{qc.setQueryData(['storefront-settings'],value);setForm(value);setDirty(false);toast.success(zh?'已保存，前台刷新即生效':'Saved. Refresh the public page to see changes.');},onError:(e:unknown)=>toast.error((e as {response?:{data?:{message:string}}})?.response?.data?.message||(e instanceof Error?e.message:'Save failed'))});
 const update=(key:keyof StorefrontSettings,value:string|boolean)=>{if(form){setDirty(true);setForm({...form,[key]:value});}};
 return <AdminLayout><div className="max-w-5xl space-y-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">{zh?'网站资料 / B2B 设置':'Website / B2B Settings'}</h1><p className="mt-2 text-sm text-gray-500">{zh?'这些字段直接控制前台；未知公司事实请留空，不自动补造。':'These fields control the live site. Leave unknown company facts blank.'}</p></div><a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-blue-700"><ExternalLink size={17}/>{zh?'预览网站':'View site'}</a></div><div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">{zh?'B2B 询盘模式：隐藏订单、支付、购物账户、优惠券、零售运费与相应仪表盘按钮，保留询盘、邮件、产品、媒体和 SEO。隐藏不是权限控制，原数据/API 未删除。':'B2B inquiry mode hides retail orders, payments, shopping accounts, coupons and shipping UI. Inquiries, email, products, media and SEO remain. Hidden UI is not access control; data/APIs are retained.'}</div>
 {query.isLoading?<p>Loading…</p>:query.isError?<p role="alert" className="text-red-700">{zh?'无法读取设置，请重试':'Unable to load settings. Please retry.'}</p>:form&&<form className="space-y-6" onSubmit={e=>{e.preventDefault();save.mutate();}}>{groups.map(([cn,en,fields])=><section key={en} className="rounded-lg border bg-white p-6"><h2 className="mb-5 text-lg font-semibold">{zh?cn:en}</h2><div className="grid gap-5 sm:grid-cols-2">{fields.map(([key,cn,en,max,multi])=><label key={key} className={`block text-sm font-medium text-gray-700 ${multi?'sm:col-span-2':''}`}>{zh?cn:en}{multi?<textarea rows={3} maxLength={max} value={String(form[key]||'')} onChange={e=>update(key!,e.target.value)} className="mt-1 w-full rounded border px-3 py-2 font-normal"/>:<input required={key==='brand_name'||(key==='catalog_url'&&form.catalog_enabled)} type={key==='contact_email'?'email':'text'} maxLength={max} value={String(form[key]||'')} onChange={e=>update(key!,e.target.value)} className="mt-1 w-full rounded border px-3 py-2 font-normal"/>}{key==='logo_url'&&<><button type="button" className="mt-2 flex items-center gap-2 text-blue-700" onClick={()=>setPicker(true)}><ImagePlus size={16}/>{zh?'从图库选择':'Choose from media'}</button>{publicLink(form.logo_url)&&<img src={publicLink(form.logo_url)!} alt="Logo preview" className="mt-3 max-h-20 max-w-56 object-contain"/>}</>}{key==='catalog_url'&&<span className="mt-1 block text-xs text-gray-500">{zh?'支持站内路径或 HTTPS 链接；更换后下载按钮即使用新文件。':'Local path or HTTPS URL; the download button uses this file.'}</span>}</label>)}</div></section>)}
 <section className="rounded-lg border bg-white p-6"><h2 className="mb-4 text-lg font-semibold">{zh?'前台功能与社媒位置':'Public features & social placement'}</h2><div className="grid gap-4 sm:grid-cols-2">{switches.map(([key,cn,en])=><label key={key} className="flex items-start gap-3 text-sm"><input type="checkbox" checked={Boolean(form[key])} onChange={e=>update(key,e.target.checked)} className="mt-1"/>{zh?cn:en}</label>)}</div><p className="mt-5 text-sm"><Link href="/admin/social-media" className="text-blue-700 underline">{zh?'配置社媒 / WhatsApp 链接':'Configure social / WhatsApp links'}</Link></p></section>
 <div className="sticky bottom-0 flex items-center justify-between rounded-lg border bg-white p-4 shadow"><span className="text-sm text-gray-500">{dirty?(zh?'有未保存修改':'Unsaved changes'):(zh?'已与后台同步':'Up to date')}{form.updated_at&&` · ${new Date(form.updated_at).toLocaleString()}`}</span><button type="submit" disabled={save.isPending} className="flex items-center gap-2 rounded bg-blue-700 px-5 py-2 text-white disabled:opacity-50"><Save size={18}/>{save.isPending?(zh?'保存中…':'Saving…'):(zh?'保存网站设置':'Save website settings')}</button></div></form>}
 <MediaPickerModal open={picker} onClose={()=>setPicker(false)} multiple={false} onSelect={assets=>{if(assets[0])update('logo_url',assets[0].url);setPicker(false);}}/>
 </div></AdminLayout>;
}
