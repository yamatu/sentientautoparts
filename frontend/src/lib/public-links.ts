// Shared rendering guard for operator-supplied public links. No HTML, script
// schemes, protocol-relative URLs, userinfo or encoded separator tricks.
export function publicLink(input?: string, allowExternal = true): string | null {
 const value = String(input || '').trim();
 if (!value || /[\\\u0000-\u001f\u007f]/.test(value)) return null;
 let decoded: string; try { decoded = decodeURIComponent(value); } catch { return null; }
 if (/[\\\u0000-\u001f\u007f]/.test(decoded) || decoded.startsWith('//')) return null;
 if (value.startsWith('/')) return value;
 if (!allowExternal) return null;
 try { const u=new URL(value); if (!['https:','http:'].includes(u.protocol)||u.username||u.password) return null; return u.href; } catch { return null; }
}
export function phoneLink(value: string): string | null { const phone=value.replace(/[^+\d]/g,''); return phone.length>=5?`tel:${phone}`:null; }
