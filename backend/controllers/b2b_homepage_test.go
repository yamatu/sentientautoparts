package controllers

import (
	"encoding/json"
	"fanuc-backend/models"
	"testing"
	"time"
)

func TestB2BSectionsRespectSavedValuesAndOrder(t *testing.T) {
	sections := mergeB2BHomepage([]models.HomepageContent{{SectionKey: "hero_section", Title: "", IsActive: false, SortOrder: 500}, {SectionKey: "product_range", Title: "Operator title", SortOrder: 1, IsActive: true}, {SectionKey: "custom_services", Title: "Custom", IsActive: true, SortOrder: 0}, {SectionKey: "repair_capabilities", Title: "Legacy archive", IsActive: true}})
	if sections[0].SectionKey != "custom_services" || sections[1].Title != "Operator title" {
		t.Fatal("saved order ignored")
	}
	for _, s := range sections {
		if s.SectionKey == "hero_section" && (s.IsActive || s.Title != "") {
			t.Fatal("disabled/cleared hero overwritten by default")
		}
		if s.SectionKey == "repair_capabilities" {
			t.Fatal("unsupported section leaked into public home")
		}
	}
}
func TestBannerPatchPreservesOmittedFieldsAndClearsDates(t *testing.T) {
	date := time.Now()
	b := models.Banner{Title: "Original", ImageURL: "/images/banner.png", Position: "home", Description: "Preserve", StartDate: &date, IsActive: true}
	if e := patchBanner(&b, map[string]json.RawMessage{"is_active": json.RawMessage("false"), "start_date": json.RawMessage("null"), "link_url": json.RawMessage(`""`)}); e != nil {
		t.Fatal(e)
	}
	if b.IsActive || b.StartDate != nil || b.Description != "Preserve" {
		t.Fatal("banner patch clobbered omitted fields")
	}
}
