import { apiClient } from '@/lib/api';
import type { APIResponse } from '@/types';
import type { StorefrontSettings, StorefrontSettingsPatch } from '@/types/storefront';
export async function loadStorefrontSettings(){const r=await apiClient.get<APIResponse<StorefrontSettings>>('/admin/storefront-settings');if(!r.data.success||!r.data.data)throw new Error(r.data.message||'Settings unavailable');return r.data.data;}
export async function saveStorefrontSettings(patch:StorefrontSettingsPatch){const r=await apiClient.put<APIResponse<StorefrontSettings>>('/admin/storefront-settings',patch);if(!r.data.success||!r.data.data)throw new Error(r.data.message||'Unable to save settings');return r.data.data;}
