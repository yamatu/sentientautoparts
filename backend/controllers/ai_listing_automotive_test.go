package controllers

import (
	"os"
	"strings"
	"testing"

	"fanuc-backend/models"
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

func TestParseAIListingOutputReadsAutomotiveBlock(t *testing.T) {
	t.Setenv("CATALOG_DOMAIN", "automotive")
	raw := `{"product_name":"AC Compressor for Mazda MX-5 Miata NC (2005–2015) 92600-00C33 | SAP-11430","sku":"SAP-11430","brand":"Calsonic Kansei","model":"CR08","part_number":"92600-00C33","part_type":"A/C Compressor","vehicle_make":"Mazda","category_path":["A/C Compressors","Mazda"],"existing_category_id":0,"weight_kg":"4.4 kg","short_description":"12V CR08 rotary vane A/C compressor (SKU: SAP-11430).","description":"The SAP-11430 (OE: 92600-00C33) is a direct-fit compressor.","meta_title":"Mazda MX-5 AC Compressor 92600-00C33 | SAP-11430","meta_description":"x","meta_keywords":"SAP-11430","compressor_type":"CR08","refrigerant":"R134a","voltage":"12V","pulley_grooves":"6","pulley_diameter":"118 mm","displacement":"80 cc/rev","oil_type":"PAG 100","oil_capacity":"130 ml","oe_numbers":["92600-00C33","NE51-61-450B"],"interchange_numbers":"NRF 320222\nWALKER WCP00542","fitments":[{"make":"Mazda","model":"MX-5 Mk III (NC)","engine":"1.8L","year_from":2005,"year_to":"2014","notes":"LHD/RHD"},{"make":"","model":"no make"}],"fitment_notes":"For reference only."}`
	output, err := parseAIListingOutput(raw)
	if err != nil {
		t.Fatal(err)
	}
	r := output.Record
	if r.CompressorType != "CR08" || r.Refrigerant != "R134a" || r.PulleyDiameter != "118 mm" || r.OilCapacity != "130 ml" {
		t.Errorf("specs = %+v", r)
	}
	if strings.Join(r.OENumbers, "|") != "92600-00C33|NE51-61-450B" || strings.Join(r.InterchangeNumbers, "|") != "NRF 320222|WALKER WCP00542" {
		t.Errorf("references = %v / %v", r.OENumbers, r.InterchangeNumbers)
	}
	// The make-less row falls back to the listing's vehicle make.
	if len(r.Fitments) != 2 || r.Fitments[0].YearTo == nil || *r.Fitments[0].YearTo != 2014 || r.Fitments[1].Make != "Mazda" {
		t.Errorf("fitments = %+v", r.Fitments)
	}
}

func TestListingAutomotiveUpdatesNeverReplaceVerifiedData(t *testing.T) {
	product := models.Product{}
	product.Refrigerant = "R1234yf"
	product.OENumbers = []string{"92600-00C33"}
	product.Fitments = []models.VehicleFitment{{Make: "Mazda", Model: "MX-5"}}
	record := services.ProductListingRecord{
		Refrigerant: "R134a", Voltage: "12V",
		OENumbers: []string{"92600-00C33", "NE51-61-450B"},
		Fitments:  []models.VehicleFitment{{Make: "Mazda", Model: "Other"}},
	}
	updates := map[string]any{}
	listingAutomotiveUpdates(product, record, updates)
	if _, ok := updates["refrigerant"]; ok {
		t.Error("a stored refrigerant was overwritten")
	}
	if updates["voltage"] != "12V" {
		t.Errorf("empty voltage was not filled: %v", updates)
	}
	if updates["oe_numbers"] != `["92600-00C33","NE51-61-450B"]` {
		t.Errorf("oe merge = %v", updates["oe_numbers"])
	}
	if _, ok := updates["fitments"]; ok {
		t.Error("stored fitment rows were replaced")
	}
}
