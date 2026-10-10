package services

import (
	"errors"
	"fanuc-backend/models"
	"strings"
	"unicode/utf8"
)

func ValidateBanner(b models.Banner) error {
	if strings.TrimSpace(b.Title) == "" || utf8.RuneCountInString(b.Title) > 255 {
		return errors.New("banner title is required (max 255 characters)")
	}
	if b.ImageURL == "" || len(b.ImageURL) > 1000 || !SafePublicURL(b.ImageURL, true) {
		return errors.New("image must be a safe local path or http(s) URL")
	}
	if len(b.LinkURL) > 500 || !SafePublicURL(b.LinkURL, true) {
		return errors.New("invalid banner link")
	}
	if b.Position != "home" && b.Position != "products" && b.Position != "about" && b.Position != "contact" {
		return errors.New("invalid banner position")
	}
	if b.StartDate != nil && b.EndDate != nil && !b.EndDate.After(*b.StartDate) {
		return errors.New("banner end time must be after start time")
	}
	if b.SortOrder < -10000 || b.SortOrder > 10000 {
		return errors.New("sort order is out of range")
	}
	if utf8.RuneCountInString(b.Subtitle) > 500 || utf8.RuneCountInString(b.Description) > 10000 || utf8.RuneCountInString(b.LinkText) > 100 {
		return errors.New("banner text is too long")
	}
	return nil
}
