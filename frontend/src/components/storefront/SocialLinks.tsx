import { FaFacebookF, FaInstagram, FaLinkedinIn, FaXTwitter, FaYoutube, FaWhatsapp } from 'react-icons/fa6';
import type { SocialMediaSettings } from '@/types';
import { publicLink } from '@/lib/public-links';

const platforms = [
 { key:'x_url',        name:'X (Twitter)', Icon:FaXTwitter,  color:'#000000', hosts:['x.com','twitter.com'] },
 { key:'facebook_url', name:'Facebook',    Icon:FaFacebookF,  color:'#1877F2', hosts:['facebook.com','fb.com'] },
 { key:'instagram_url',name:'Instagram',  Icon:FaInstagram,  color:'#E1306C', hosts:['instagram.com'] },
 { key:'linkedin_url', name:'LinkedIn',   Icon:FaLinkedinIn, color:'#0A66C2', hosts:['linkedin.com'] },
 { key:'youtube_url',  name:'YouTube',    Icon:FaYoutube,    color:'#FF0000', hosts:['youtube.com','youtu.be'] },
 { key:'whatsapp_url', name:'WhatsApp',   Icon:FaWhatsapp,   color:'#25D366', hosts:['wa.me','api.whatsapp.com','www.whatsapp.com'] },
] as const;

export function configuredSocialLinks(settings: Partial<SocialMediaSettings>) {
 return platforms.flatMap(p => {
  const href = publicLink(settings[p.key]);
  if (!href || !/^https?:/.test(href)) return [];
  const host = new URL(href).hostname.toLowerCase().replace(/\.$/, '');
  return p.hosts.some(h => host === h || host.endsWith('.' + h)) ? [{ ...p, href }] : [];
 });
}

export default function SocialLinks({
 settings,
 location = 'footer',
}: {
 settings: Partial<SocialMediaSettings>;
 location?: string;
}) {
 const links = configuredSocialLinks(settings);
 if (!links.length) return null;
 const dark = location === 'footer' || location === 'header-topbar';
 return (
  <nav className="sap-social-links" aria-label={`Social media ${location}`}>
   {links.map(({ key, name, Icon, color, href }) => (
    <a
     key={key}
     href={href}
     target="_blank"
     rel="noopener noreferrer"
     aria-label={name}
     title={name}
     className={dark ? 'sap-social-link sap-social-link--dark' : 'sap-social-link'}
     style={{ '--brand-color': color } as React.CSSProperties}
    >
     <Icon aria-hidden="true" />
     <span className="sap-sr-only">{name}</span>
    </a>
   ))}
  </nav>
 );
}
