package services

import (
	"errors"
	"fmt"
	"net/mail"
	"net/url"
	"reflect"
	"strings"
	"unicode"
	"unicode/utf8"

	"fanuc-backend/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// SafePublicURL permits local paths and HTTP(S) links, but rejects URL parser
// ambiguities, protocol-relative targets, userinfo and control characters.
func SafePublicURL(value string, allowExternal bool) bool {
	if value == "" {
		return true
	}
	if len(value) > 2000 || strings.TrimSpace(value) != value || strings.ContainsRune(value, '\\') {
		return false
	}
	for _, r := range value {
		if unicode.IsControl(r) {
			return false
		}
	}
	decoded, err := url.PathUnescape(value)
	if err != nil {
		return false
	}
	if strings.ContainsRune(decoded, '\\') {
		return false
	}
	for _, r := range decoded {
		if unicode.IsControl(r) {
			return false
		}
	}
	if strings.HasPrefix(value, "/") {
		return !strings.HasPrefix(decoded, "//") && !strings.HasPrefix(value, "//")
	}
	if !allowExternal {
		return false
	}
	parsed, err := url.ParseRequestURI(value)
	return err == nil && (parsed.Scheme == "https" || parsed.Scheme == "http") && parsed.Hostname() != "" && parsed.User == nil
}

func GetStorefrontSetting(db *gorm.DB) (*models.StorefrontSetting, error) {
	var value models.StorefrontSetting
	if err := db.First(&value, 1).Error; err != nil {
		if !errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, err
		}
		value = models.DefaultStorefrontSetting()
	}
	return &value, nil
}

// Patch semantics protect settings unknown to an older admin client. Validate
// inside a row-locked transaction so partial concurrent saves do not lose data.
func PatchStorefrontSetting(db *gorm.DB, patch map[string]any) (*models.StorefrontSetting, error) {
	var result models.StorefrontSetting
	err := db.Transaction(func(tx *gorm.DB) error {
		initial := models.DefaultStorefrontSetting()
		if err := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&initial).Error; err != nil {
			return err
		}
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&result, 1).Error; err != nil {
			return err
		}
		value := reflect.ValueOf(&result).Elem()
		typ := value.Type()
		fields := map[string]int{}
		for i := 0; i < typ.NumField(); i++ {
			key := typ.Field(i).Tag.Get("json")
			if key != "id" && key != "updated_at" {
				fields[key] = i
			}
		}
		for key, raw := range patch {
			idx, ok := fields[key]
			if !ok {
				return fmt.Errorf("unsupported storefront setting: %s", key)
			}
			field := value.Field(idx)
			if field.Kind() == reflect.Bool {
				v, ok := raw.(bool)
				if !ok {
					return fmt.Errorf("%s must be boolean", key)
				}
				field.SetBool(v)
			} else {
				v, ok := raw.(string)
				if !ok {
					return fmt.Errorf("%s must be text", key)
				}
				field.SetString(strings.TrimSpace(v))
			}
		}
		if err := ValidateStorefrontSetting(result); err != nil {
			return err
		}
		return tx.Save(&result).Error
	})
	return &result, err
}

func ValidateStorefrontSetting(s models.StorefrontSetting) error {
	if strings.TrimSpace(s.BrandName) == "" {
		return errors.New("brand_name is required")
	}
	limits := map[string]int{"brand_name": 100, "company_name": 200, "tagline": 200, "logo_url": 500, "contact_email": 200, "contact_phone": 80, "address": 500, "business_hours": 200, "footer_intro": 2000, "footer_note": 500, "copyright_text": 250, "quote_button_text": 80, "inquiry_heading": 200, "inquiry_intro": 1000, "inquiry_success": 500, "catalog_url": 500, "catalog_title": 200, "catalog_description": 1000, "home_meta_title": 200, "home_meta_description": 500, "home_meta_keywords": 500}
	value := reflect.ValueOf(s)
	typ := value.Type()
	for i := 0; i < typ.NumField(); i++ {
		if max, ok := limits[typ.Field(i).Tag.Get("json")]; ok && utf8.RuneCountInString(value.Field(i).String()) > max {
			return fmt.Errorf("%s is too long", typ.Field(i).Tag.Get("json"))
		}
	}
	if !SafePublicURL(s.LogoURL, true) || !SafePublicURL(s.CatalogURL, true) {
		return errors.New("logo/catalog URL must be a safe local path or http(s) URL")
	}
	if s.CatalogEnabled && s.CatalogURL == "" {
		return errors.New("catalog_url is required while catalog is enabled")
	}
	if s.ContactEmail != "" {
		addr, err := mail.ParseAddress(s.ContactEmail)
		if err != nil || addr.Address != s.ContactEmail {
			return errors.New("contact_email must be a single email address")
		}
	}
	if strings.ContainsAny(s.ContactPhone, "\r\n<>") {
		return errors.New("invalid contact_phone")
	}
	return nil
}
