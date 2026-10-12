-- Brand identity refresh: horizontal SENTIENT logo, header contact details,
-- "WHY SENTIENT?" advantages heading and a cleaned About page copy.
-- Every statement only fills blanks or replaces the untouched legacy default,
-- so operator edits made in the admin are preserved.

UPDATE storefront_settings
SET logo_url = '/images/sentient-logo-horizontal.png'
WHERE id = 1 AND (logo_url IS NULL OR logo_url = '');

UPDATE storefront_settings
SET contact_email = 'gzsentient@gmail.com'
WHERE id = 1 AND (contact_email IS NULL OR contact_email = '');

UPDATE storefront_settings
SET contact_phone = '+86 13828593365'
WHERE id = 1 AND (contact_phone IS NULL OR contact_phone = '');

UPDATE homepage_contents
SET title = 'WHY SENTIENT?'
WHERE section_key = 'advantages_section' AND title = 'A partner for your parts business';

UPDATE homepage_contents
SET title = 'About SENTIENT'
WHERE section_key = 'about_content' AND title = 'About sentientautoparts';

-- The imported legacy copy has a scrambled "What We Offer" sentence and a
-- control character inside "quality"; replace it only while still unedited.
UPDATE homepage_contents
SET description = '<div class="about_item">
<div class="item"><div class="name">Who We Are</div><div class="txt">SENTIENT Auto Part Co., Ltd. is a professional manufacturer and exporter of automotive air conditioning systems, headquartered in Guangzhou, China. With advanced in-house production facilities and a dedicated R&amp;D team, we design, develop, and deliver high-performance A/C solutions trusted by global clients.</div></div>
<div class="item"><div class="name">What We Offer</div><div class="txt">Our product line covers over <strong>1,000+ models</strong> of automotive A/C compressors for passenger cars, commercial vehicles, heavy-duty trucks, and construction equipment. In addition to compressors, we provide a full range of A/C components, including condensers, evaporators, expansion valves, and service accessories – ensuring a one-stop solution for B2B partners.</div></div>
</div>
<div class="about_item flex_start">
<div class="item"><div class="name">Our Commitment</div><div class="txt">At SENTIENT, we believe that true quality starts at the source. By focusing on factory-direct supply, strict quality control, and responsive support, we help our partners grow with confidence in a competitive marketplace.</div></div>
<div class="item"><div class="bigname">Partner with us today –</div><div class="bigtxt">your trusted source for automotive A/C solutions.</div><div class="send_box"><a href="/contact_us" class="send_btn">Send Inquiry</a></div></div>
</div>
<div class="about_item">
<div class="item"><div class="name">Why Choose SENTIENT</div><div class="you_list">
<div class="you_item"><div class="info"><div class="h4">OEM &amp; Aftermarket Solutions –</div><div class="desc">Designed to meet diverse global requirements.</div></div></div>
<div class="you_item"><div class="info"><div class="h4">Strict Quality Assurance –</div><div class="desc">100% brand-new products, rigorously tested before shipment.</div></div></div>
<div class="you_item"><div class="info"><div class="h4">Global Reach –</div><div class="desc">Trusted by long-term partners across the Middle East, Africa, Southeast Asia, Brazil, and South America.</div></div></div>
<div class="you_item"><div class="info"><div class="h4">Custom Branding –</div><div class="desc">Support for private-label packaging and customized carton design.</div></div></div>
</div></div>
</div>'
WHERE section_key = 'about_content'
  AND description LIKE '%heavy-duty%1,000+ models of automotive A/C%';
