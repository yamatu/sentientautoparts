package services

import (
	"strings"
	"testing"

	"fanuc-backend/models"
)

const automotiveListingSample = `Basic Information
Product Name *: AC Compressor for Mazda MX-5 Miata NC (2005–2015) 92600-00C33 | SAP-11430
SKU *: SAP-11430
Category *: ac-compressors/ac-compressors-mazda
Weight (kg): 4.4
Part Brand / Manufacturer: Calsonic Kansei (OE Equivalent) / Aftermarket
Product Model / Supplier Model: CR08
Primary Part Reference No.: 92600-00C33
Warranty Period: 12 Months
Delivery Time: To be confirmed
Short Description:
12V CR08 rotary vane A/C compressor (SKU: SAP-11430) with 6PK 118mm clutch pulley, engineered for 2005–2015 Mazda MX-5 Miata (NC) 1.8L & 2.0L. Direct replacement for OE 92600-00C33, NE51-61-450B, and NEY1-61-450.
Description:
The SAP-11430 (OE: 92600-00C33 / NE51-61-450B) is a direct-fit Calsonic CR08 style automotive air conditioning compressor assembly designed for the third-generation Mazda MX-5 / Miata / Roadster (NC chassis, 2005–2015) equipped with 1.8L (L8) and 2.0L (LF) petrol engines.
Key Features & Technical Highlights:

Compressor Series: Calsonic CR08 (CR-08) rotary vane design for smooth, low-vibration cooling performance.

Refrigerant & Lubrication: Compatible with R134a (and R1234yf equivalent systems), utilizing PAG 100 refrigerant oil (standard oil fill capacity: 130–140 ml).

Fitment Verification: Always verify the OEM part number (92600-00C33, NE51-61-450B, NEY1-61-450) and physical pulley specifications on your original unit prior to ordering.

Auto Part Specs & Vehicle Fitment
Part Type: A/C Compressor
Applicable Vehicle Make: Mazda
Compressor Model / Series: CR08
Refrigerant: R134a
Voltage: 12V
Pulley Grooves: 6
Pulley Diameter (with unit): 118 mm
Displacement (with unit): 80 cc/rev
Oil Type: PAG 100
Oil Capacity (with unit): 130 ml

OE / OEM Reference Numbers (one per line):
92600-00C33
9260000C33
NE51-61-450B

Cross / Interchange Reference Numbers (one per line):
NRF 320222
ELSTOCK 51-1039

Vehicle Fitment List
Fitment 1
Make *: Mazda
Model: MX-5 Mk III (NC) / Miata / Roadster
Engine: 1.8L L4 (1798cc, L8-DE / L8-VE, 93 kW / 126 HP)
Source / Notes: OE 92600-00C33 / NE51-61-450B / NEY1-61-450; Left-/Right-hand drive
Start Year: 2005
End Year: 2014

Fitment 2
Make *: Mazda
Model: MX-5 Mk III (NC) / Miata / Roadster
Engine: 2.0L L4 (1999cc, LF-DE / LF-VE / MZR, 118 kW / 160 HP)
Start Year: 2005
End Year: 2015

Fitment Verification Note / Raw Application Text:
Applicable to Mazda MX-5 III (NC) / Miata / Roadster 1.8L (2005–2014) and 2.0L (2005–2015). Fitment data is for reference only.

SEO Basic Information
SEO Title: Mazda MX-5 AC Compressor 92600-00C33 NE51-61-450B | SAP-11430
SEO Description: Mazda MX-5 (NC) 1.8L 2.0L AC compressor SAP-11430. Replaces OE 92600-00C33, NE51-61-450B, NEY1-61-450. Contact us for a quote.
SEO Keywords: SAP-11430, SAP11430, 92600-00C33, 9260000C33`

func TestParseAutomotiveListingFormat(t *testing.T) {
	t.Setenv("CATALOG_DOMAIN", "automotive")
	records := ParseProductListingText(automotiveListingSample)
	if len(records) != 1 {
		t.Fatalf("expected one record, got %d", len(records))
	}
	r := records[0]
	checks := map[string][2]string{
		"sku":             {r.SKU, "SAP-11430"},
		"model":           {r.Model, "CR08"},
		"part_number":     {r.PartNumber, "92600-00C33"},
		"part_type":       {r.PartType, "A/C Compressor"},
		"vehicle_make":    {r.VehicleMake, "Mazda"},
		"compressor_type": {r.CompressorType, "CR08"},
		"refrigerant":     {r.Refrigerant, "R134a"},
		"voltage":         {r.Voltage, "12V"},
		"pulley_grooves":  {r.PulleyGrooves, "6"},
		"pulley_diameter": {r.PulleyDiameter, "118 mm"},
		"displacement":    {r.Displacement, "80 cc/rev"},
		"oil_type":        {r.OilType, "PAG 100"},
		"oil_capacity":    {r.OilCapacity, "130 ml"},
		"warranty":        {r.WarrantyPeriod, "12 Months"},
		"lead_time":       {r.LeadTime, ""},
		"meta_title":      {r.MetaTitle, "Mazda MX-5 AC Compressor 92600-00C33 NE51-61-450B | SAP-11430"},
	}
	for name, pair := range checks {
		if pair[0] != pair[1] {
			t.Errorf("%s = %q, want %q", name, pair[0], pair[1])
		}
	}
	if r.WeightKg == nil || *r.WeightKg != 4.4 {
		t.Errorf("weight = %v", r.WeightKg)
	}
	if strings.Join(r.OENumbers, "|") != "92600-00C33|9260000C33|NE51-61-450B" {
		t.Errorf("oe numbers = %v", r.OENumbers)
	}
	if strings.Join(r.InterchangeNumbers, "|") != "NRF 320222|ELSTOCK 51-1039" {
		t.Errorf("interchange = %v", r.InterchangeNumbers)
	}
	if len(r.Fitments) != 2 {
		t.Fatalf("fitments = %+v", r.Fitments)
	}
	first := r.Fitments[0]
	if first.Make != "Mazda" || first.Model != "MX-5 Mk III (NC) / Miata / Roadster" || !strings.HasPrefix(first.Engine, "1.8L L4 (1798cc") ||
		first.YearFrom == nil || *first.YearFrom != 2005 || first.YearTo == nil || *first.YearTo != 2014 || !strings.Contains(first.Notes, "Left-/Right-hand drive") {
		t.Errorf("fitment 1 = %+v", first)
	}
	if r.Fitments[1].YearTo == nil || *r.Fitments[1].YearTo != 2015 {
		t.Errorf("fitment 2 = %+v", r.Fitments[1])
	}
	if !strings.HasPrefix(r.FitmentNotes, "Applicable to Mazda MX-5 III") {
		t.Errorf("fitment notes = %q", r.FitmentNotes)
	}
	// Feature lines inside the description stay in the description.
	for _, phrase := range []string{"Key Features & Technical Highlights:", "Compressor Series: Calsonic CR08", "Refrigerant & Lubrication:", "Fitment Verification: Always verify"} {
		if !strings.Contains(r.Description, phrase) {
			t.Errorf("description lost %q:\n%s", phrase, r.Description)
		}
	}
	if strings.Contains(r.Description, "Auto Part Specs") || strings.Contains(r.Description, "Part Type:") {
		t.Errorf("description swallowed the spec block:\n%s", r.Description)
	}
	if fields := ListingAutomotiveFields(r, "A/C Compressor"); fields == nil || ValidateAutomotiveFields(fields) != nil {
		t.Errorf("automotive fields do not validate: %v", ValidateAutomotiveFields(fields))
	}
}

func TestExpandListingOEVariants(t *testing.T) {
	got := ExpandListingOEVariants([]string{"92600-00C33", "NE51-61-450B", "NE5161450B", "A4201114B00100"})
	want := "92600-00C33|9260000C33|NE51-61-450B|NE5161450B|A4201114B00100"
	if strings.Join(got, "|") != want {
		t.Fatalf("got %v", got)
	}
}

func TestSanitizeListingFitmentsLimits(t *testing.T) {
	from, to := 2015, 2005
	bad := 1800
	rows := SanitizeListingFitments([]models.VehicleFitment{
		{Make: "", Model: "Corolla"},
		{Make: "Mazda", Model: strings.Repeat("–", 120), YearFrom: &from, YearTo: &to},
		{Make: "Toyota", YearFrom: &bad},
	}, "")
	if len(rows) != 2 {
		t.Fatalf("rows = %+v", rows)
	}
	if *rows[0].YearFrom != 2005 || *rows[0].YearTo != 2015 || len(rows[0].Model) > 200 {
		t.Errorf("row = %+v", rows[0])
	}
	if rows[1].YearFrom != nil {
		t.Errorf("invalid year kept: %+v", rows[1])
	}
	if err := ValidateAutomotiveFields(&models.AutomotiveFields{Fitments: rows}); err != nil {
		t.Errorf("validate: %v", err)
	}
}
