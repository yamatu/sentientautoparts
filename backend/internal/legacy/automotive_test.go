package legacy

import "testing"

func TestAutomotiveCategorySlugsKeepThePartType(t *testing.T) {
	categories := map[uint]Row{1: {"id": "1", "catname": "Products"}, 8: {"id": "8", "parentid": "1", "catname": "A/C COMPRESSORS"}, 182: {"id": "182", "parentid": "1", "catname": "AUTO CONDENSERS"}, 180: {"id": "180", "parentid": "8", "catname": "TOYOTA"}, 214: {"id": "214", "parentid": "182", "catname": "TOYOTA"}}
	if got := automotiveCategorySlug(categories[180], categories); got != "ac-compressors-toyota" {
		t.Fatalf("lost ancestor: %s", got)
	}
	if got := automotiveCategorySlug(categories[214], categories); got != "auto-condensers-toyota" {
		t.Fatalf("category collision: %s", got)
	}
}

func TestAutomotiveExtractionPreservesKnownFacts(t *testing.T) {
	row := Row{"title": "ST-10025", "content": `<table><tr><th>ST- Code</th><td>ST-10025</td></tr><tr><th>Fitment</th><td>Toyota Land Cruiser V8</td></tr><tr><th>Part Number</th><td>88320-0C010/447260-8231</td></tr><tr><th>Pulley Diameter(mm)</th><td>120</td></tr><tr><th>Voltage</th><td>12V</td></tr><tr><th>Oil Type</th><td>PAG 46/200ml</td></tr></table>`, "canshu": "Toyota Land Cruiser<br>2001-2006<br>10S17C<br>120mm/6PK/12V"}
	categories := map[uint]Row{8: {"id": "8", "parentid": "1"}, 180: {"id": "180", "parentid": "8", "catname": "TOYOTA"}}
	fields, sku, part := automotiveFields(row, categories[180], categories)
	if sku != "ST-10025" || part != "88320-0C010" || fields.PartType != "A/C Compressor" || fields.VehicleMake != "Toyota" || fields.CompressorType != "10S17C" {
		t.Fatalf("unexpected parsed data: %#v %s %s", fields, sku, part)
	}
	if len(fields.OENumbers) != 2 || len(fields.Fitments) != 1 || *fields.Fitments[0].YearFrom != 2001 || *fields.Fitments[0].YearTo != 2006 {
		t.Fatalf("references/fitment lost: %#v", fields)
	}
	if fields.OilCapacity != "200ml" || fields.OilType != "PAG 46" || fields.PulleyDiameter != "120 mm" {
		t.Fatalf("specifications lost: %#v", fields)
	}
	if fields.Refrigerant != "" || fields.Fitments[0].Engine != "" {
		t.Fatal("unknown specifications must remain blank")
	}
}
func TestAutomotiveSpaceDelimitedOEReferences(t *testing.T) {
	fields, _, part := automotiveFields(Row{"content": "<table><tr><th>Part Number</th><td>CC2961K00 CC2961K00A H12A1AJ4EX CC2961K00</td></tr></table>"}, Row{}, map[uint]Row{})
	if len(fields.OENumbers) != 3 || part != "CC2961K00" {
		t.Fatalf("space-separated source references not preserved: %#v", fields.OENumbers)
	}
}

func TestAutomotiveExplicitFitmentOverridesSourceCategory(t *testing.T) {
	fields, _, _ := automotiveFields(Row{"content": "<table><tr><th>Fitment</th><td>Hyundai Accent 1.6</td></tr><tr><th>Part Number</th><td>0</td></tr></table>"}, Row{"id": "186", "parentid": "8", "catname": "NISSAN"}, map[uint]Row{8: {"id": "8"}})
	if fields.VehicleMake != "Hyundai" || len(fields.OENumbers) != 0 || len(fields.Fitments) != 1 || fields.Fitments[0].YearFrom != nil {
		t.Fatalf("guessed fitment/reference: %#v", fields)
	}
}
