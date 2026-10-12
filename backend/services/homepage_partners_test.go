package services

import (
	"testing"

	"fanuc-backend/models"
	"gorm.io/datatypes"
)

func TestDefaultAboutPartnersAreValid(t *testing.T) {
	for _, row := range models.B2BHomepageDefaults() {
		if err := ValidateHomepageContent(row); err != nil {
			t.Fatalf("%s: %v", row.SectionKey, err)
		}
	}
}

func TestPartnersRejectUnsafeFlagAndUnknownFields(t *testing.T) {
	for _, data := range []string{
		`{"partners":[{"flag":"javascript:alert(1)"}]}`,
		`{"partners":[{"onclick":"x"}]}`,
		`{"partners":"nope"}`,
	} {
		row := models.HomepageContent{SectionKey: "about_partners", Data: datatypes.JSON(data)}
		if ValidateHomepageContent(row) == nil {
			t.Fatalf("expected rejection for %s", data)
		}
	}
}
