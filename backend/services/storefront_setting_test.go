package services

import (
	"fanuc-backend/models"
	"gorm.io/datatypes"
	"testing"
	"time"
)

func TestSafePublicLinks(t *testing.T) {
	cases := []struct {
		value    string
		external bool
		want     bool
	}{
		{"/products", false, true}, {"/legacy/catalog%20one.pdf", false, true}, {"https://www.linkedin.com/company/example", true, true},
		{"javascript:alert(1)", true, false}, {"//evil.example", true, false}, {"/\\evil.example", true, false}, {"/%5cevil.example", true, false}, {"/%2fevil.example", true, false},
		{"https://user:secret@example.com", true, false}, {"/products%0aLocation:evil", true, false}, {"https://example.com", false, false}, {"data:text/html,hello", true, false},
	}
	for _, tc := range cases {
		if got := SafePublicURL(tc.value, tc.external); got != tc.want {
			t.Errorf("%q got %v want %v", tc.value, got, tc.want)
		}
	}
}
func TestStorefrontSettingsValidation(t *testing.T) {
	s := models.DefaultStorefrontSetting()
	if err := ValidateStorefrontSetting(s); err != nil {
		t.Fatal(err)
	}
	s.ContactEmail = "sales@example.com"
	s.CatalogEnabled = false
	s.CatalogURL = ""
	if err := ValidateStorefrontSetting(s); err != nil {
		t.Fatal(err)
	}
	s.LogoURL = "javascript:alert(1)"
	if ValidateStorefrontSetting(s) == nil {
		t.Fatal("unsafe logo accepted")
	}
	s.LogoURL = ""
	s.ContactEmail = "Name <sales@example.com>"
	if ValidateStorefrontSetting(s) == nil {
		t.Fatal("display name accepted as public email")
	}
}
func TestHomepageURLAndControls(t *testing.T) {
	section := models.HomepageContent{SectionKey: "featured_products", Title: "Test", ButtonURL: "/products", Data: datatypes.JSON(`{"limit":8,"mode":"featured"}`)}
	if e := ValidateHomepageContent(section); e != nil {
		t.Fatal(e)
	}
	section.Data = datatypes.JSON(`{"limit":1000}`)
	if ValidateHomepageContent(section) == nil {
		t.Fatal("unbounded product count accepted")
	}
	section.Data = datatypes.JSON(`{"secondary_url":"//evil.example"}`)
	if ValidateHomepageContent(section) == nil {
		t.Fatal("unsafe CTA accepted")
	}
}
func TestBannerScheduleAndLocalImage(t *testing.T) {
	b := models.Banner{Title: "Banner", Position: "home", ImageURL: "/legacy/uploads/banner.png", LinkURL: "/products"}
	if e := ValidateBanner(b); e != nil {
		t.Fatal(e)
	}
	now := time.Now()
	earlier := now.Add(-time.Hour)
	b.StartDate = &now
	b.EndDate = &earlier
	if ValidateBanner(b) == nil {
		t.Fatal("reversed schedule accepted")
	}
}
func TestSocialAddedPlatforms(t *testing.T) {
	for platform, link := range map[string]string{"WhatsApp": "https://wa.me/8612345678901", "YouTube": "https://www.youtube.com/@example"} {
		if _, e := NormalizeSocialMediaURL(platform, link); e != nil {
			t.Fatal(e)
		}
	}
	if _, e := NormalizeSocialMediaURL("WhatsApp", "https://wa.me.evil.example/123456"); e == nil {
		t.Fatal("host suffix attack accepted")
	}
}
