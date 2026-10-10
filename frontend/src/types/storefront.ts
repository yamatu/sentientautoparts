export interface StorefrontSettings {
 id: number;
 brand_name: string; company_name: string; tagline: string; logo_url: string;
 contact_email: string; contact_phone: string; address: string; business_hours: string;
 footer_intro: string; footer_note: string; copyright_text: string; quote_button_text: string;
 inquiry_heading: string; inquiry_intro: string; inquiry_success: string;
 catalog_enabled: boolean; catalog_url: string; catalog_title: string; catalog_description: string;
 news_enabled: boolean; distributor_enabled: boolean;
 social_header: boolean; social_footer: boolean; whatsapp_floating: boolean;
 home_meta_title: string; home_meta_description: string; home_meta_keywords: string;
 updated_at?: string;
}
export type StorefrontSettingsPatch = Partial<Omit<StorefrontSettings,'id'|'updated_at'>>;
export const B2B_MODE = process.env.NEXT_PUBLIC_B2B_MODE !== 'false';
