package controllers

import (
	"os"
	"strings"
	"testing"

	"fanuc-backend/services"
)

// The listing prompts are the only place the catalogue's taxonomy is described
// to the model, so they must be rendered for this catalogue: the part-type
// placeholder resolved, and no industrial wording left behind.
func TestAIListingPromptsRenderAutomotiveTaxonomy(t *testing.T) {
	system, category := aiListingPrompts()
	if strings.Contains(system, "PART_TYPE_OPTIONS") || strings.Contains(category, "PART_TYPE_OPTIONS") {
		t.Fatal("the part-type placeholder was not replaced")
	}
	for partType, root := range map[string]string{
		"A/C Compressor":  "A/C Compressors",
		"Condenser":       "Auto Condensers",
		"Evaporator Unit": "Evaporator Units",
		"Expansion Valve": "Expansion Valves",
	} {
		if !strings.Contains(system, partType+" -> "+root) {
			t.Fatalf("the listing prompt is missing the part type %q -> %q", partType, root)
		}
	}
	for _, banned := range []string{"FANUC", "Siemens", "Mitsubishi", "VIBOCNC"} {
		if strings.Contains(system, banned) || strings.Contains(category, banned) {
			t.Fatalf("the automotive listing prompt still names %q", banned)
		}
	}
	if !strings.Contains(system, "vehicle_make") {
		t.Fatal("the listing prompt must ask for vehicle_make")
	}
}

func TestListingFallbackPathFollowsCatalogueDomain(t *testing.T) {
	previous, had := os.LookupEnv("CATALOG_DOMAIN")
	t.Cleanup(func() {
		if had {
			os.Setenv("CATALOG_DOMAIN", previous)
			return
		}
		os.Unsetenv("CATALOG_DOMAIN")
	})

	record := services.ProductListingRecord{PartType: "A/C Compressor", VehicleMake: "Toyota"}

	os.Setenv("CATALOG_DOMAIN", "automotive")
	got := listingFallbackPath(record)
	want := []string{"A/C Compressors", "Toyota"}
	if strings.Join(got, ">") != strings.Join(want, ">") {
		t.Fatalf("automotive fallback path = %v, want %v", got, want)
	}

	// The industrial branch is brand-rooted; it must stay reachable so the
	// stored references remain valid for a non-automotive database.
	record.Brand = "Fanuc"
	os.Setenv("CATALOG_DOMAIN", "")
	got = listingFallbackPath(record)
	if len(got) == 0 || got[0] != "Fanuc" {
		t.Fatalf("non-automotive fallback path = %v, want a brand-rooted path", got)
	}
}
