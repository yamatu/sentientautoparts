package models

import "time"

// StorefrontSetting holds public B2B identity/contact/display configuration.
// It contains no provider credentials, SMTP secrets or commerce-policy defaults.
type StorefrontSetting struct {
	ID                  uint      `json:"id" gorm:"primaryKey"`
	BrandName           string    `json:"brand_name" gorm:"size:100"`
	CompanyName         string    `json:"company_name" gorm:"size:200"`
	Tagline             string    `json:"tagline" gorm:"size:200"`
	LogoURL             string    `json:"logo_url" gorm:"size:500"`
	ContactEmail        string    `json:"contact_email" gorm:"size:200"`
	ContactPhone        string    `json:"contact_phone" gorm:"size:80"`
	Address             string    `json:"address" gorm:"size:500"`
	BusinessHours       string    `json:"business_hours" gorm:"size:200"`
	FooterIntro         string    `json:"footer_intro" gorm:"type:text"`
	FooterNote          string    `json:"footer_note" gorm:"size:500"`
	CopyrightText       string    `json:"copyright_text" gorm:"size:250"`
	QuoteButtonText     string    `json:"quote_button_text" gorm:"size:80"`
	InquiryHeading      string    `json:"inquiry_heading" gorm:"size:200"`
	InquiryIntro        string    `json:"inquiry_intro" gorm:"size:1000"`
	InquirySuccess      string    `json:"inquiry_success" gorm:"size:500"`
	CatalogEnabled      bool      `json:"catalog_enabled"`
	CatalogURL          string    `json:"catalog_url" gorm:"size:500"`
	CatalogTitle        string    `json:"catalog_title" gorm:"size:200"`
	CatalogDescription  string    `json:"catalog_description" gorm:"size:1000"`
	NewsEnabled         bool      `json:"news_enabled"`
	DistributorEnabled  bool      `json:"distributor_enabled"`
	SocialHeader        bool      `json:"social_header"`
	SocialFooter        bool      `json:"social_footer"`
	WhatsAppFloating    bool      `json:"whatsapp_floating"`
	HomeMetaTitle       string    `json:"home_meta_title" gorm:"size:200"`
	HomeMetaDescription string    `json:"home_meta_description" gorm:"size:500"`
	HomeMetaKeywords    string    `json:"home_meta_keywords" gorm:"size:500"`
	UpdatedAt           time.Time `json:"updated_at"`
}

func DefaultStorefrontSetting() StorefrontSetting {
	return StorefrontSetting{ID: 1, BrandName: "sentientautoparts", Tagline: "Automotive air conditioning parts",
		LogoURL: "/images/sentient-logo-horizontal.png", ContactEmail: "gzsentient@gmail.com", ContactPhone: "+86 13828593365",
		FooterIntro: "Automotive air conditioning parts. Explore product references and vehicle applications in one catalog.",
		FooterNote:  "Always confirm vehicle fitment before ordering.", QuoteButtonText: "Get a quote", InquiryHeading: "Inquire today",
		InquiryIntro:   "Tell us the part you need. Include an OE reference or vehicle details to help us check fitment.",
		InquirySuccess: "Thank you. Your inquiry has been received.", CatalogEnabled: true,
		CatalogURL: "/legacy/theme/images/SENTIENT%20Official%20Catalogue%20-15m.pdf", CatalogTitle: "Get the product catalog",
		CatalogDescription: "Leave your details to request the automotive A/C parts catalog.", NewsEnabled: true, DistributorEnabled: true,
		SocialHeader: true, SocialFooter: true, WhatsAppFloating: false,
		HomeMetaTitle: "Automotive A/C Parts", HomeMetaDescription: "Automotive A/C compressors and air conditioning parts. Search OE references, ST codes and vehicle applications at sentientautoparts."}
}
