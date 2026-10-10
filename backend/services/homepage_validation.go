package services

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"unicode/utf8"

	"fanuc-backend/models"
)

func ValidateHomepageContent(c models.HomepageContent) error {
	for key, pair := range map[string]struct {
		value string
		max   int
	}{"title": {c.Title, 255}, "subtitle": {c.Subtitle, 255}, "description": {c.Description, 60000}, "image_url": {c.ImageURL, 1000}, "button_text": {c.ButtonText, 120}, "button_url": {c.ButtonURL, 1000}} {
		if utf8.RuneCountInString(pair.value) > pair.max {
			return fmt.Errorf("%s is too long", key)
		}
	}
	if !SafePublicURL(c.ImageURL, true) || !SafePublicURL(c.ButtonURL, true) {
		return errors.New("image/button URL must be a safe local path or http(s) URL")
	}
	if c.SortOrder < -10000 || c.SortOrder > 10000 {
		return errors.New("sort_order must be between -10000 and 10000")
	}
	if len(c.Data) > 64000 {
		return errors.New("section data exceeds limit")
	}
	if len(c.Data) == 0 || string(c.Data) == "null" {
		return nil
	}
	var data map[string]any
	if err := json.Unmarshal(c.Data, &data); err != nil {
		return errors.New("section data must be a JSON object")
	}
	if value, ok := data["secondary_url"]; ok {
		v, ok := value.(string)
		if !ok || !SafePublicURL(v, true) {
			return errors.New("invalid secondary_url")
		}
	}
	if value, ok := data["secondary_text"]; ok {
		v, ok := value.(string)
		if !ok || utf8.RuneCountInString(v) > 120 {
			return errors.New("secondary_text is too long")
		}
	}
	if value, ok := data["show_stats"]; ok {
		if _, ok := value.(bool); !ok {
			return errors.New("show_stats must be boolean")
		}
	}
	if c.SectionKey == "featured_products" || c.SectionKey == "home_news" {
		if raw, ok := data["limit"]; ok {
			n, ok := raw.(float64)
			max := 24.
			if c.SectionKey == "home_news" {
				max = 12
			}
			if !ok || n < 1 || n > max || n != float64(int(n)) {
				return fmt.Errorf("limit must be an integer from 1 to %d", int(max))
			}
		}
		if raw, ok := data["mode"]; ok {
			v, ok := raw.(string)
			if !ok || !strings.Contains("|latest|featured|", "|"+v+"|") {
				return errors.New("product mode must be latest or featured")
			}
		}
	}
	return nil
}
