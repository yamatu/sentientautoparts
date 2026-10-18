package services

import (
	"strings"
	"testing"

	"fanuc-backend/models"
)

func listingIssueCodes(issues []ListingQualityIssue) string {
	codes := make([]string, 0, len(issues))
	for _, issue := range issues {
		codes = append(codes, issue.Code)
	}
	return strings.Join(codes, ",")
}

// A legacy import has SEO of a fine length, OE numbers and an imported fitment
// row, so presence checks alone passed it; the fixed format must not.
func TestListingQualityRejectsLegacySEOListing(t *testing.T) {
	t.Setenv("CATALOG_DOMAIN", "automotive")
	product := models.Product{
		SKU: "ST-40114", Name: "A/C Compressor for HYUNDAI TUCSON 2.0CRDI · 97701-D3000", Brand: "Aftermarket",
		Model: "ST-40114", PartNumber: "97701-D3000", CategoryID: 3, WarrantyPeriod: "12 Months", LeadTime: "7 days",
		ShortDescription: "A/C compressor for Hyundai Tucson 2.0 CRDi, OE reference 97701-D3000, new aftermarket unit.",
		Description:      strings.Repeat("The ST-40114 97701-D3000 compressor suits the Hyundai Tucson 2.0 CRDi diesel engine and is supplied new. ", 3),
		MetaTitle:        "Hyundai Tucson A/C Compressor 97701-D3000", MetaDescription: strings.Repeat("Hyundai Tucson compressor 97701-D3000. ", 4),
		MetaKeywords: "97701-D3000, Hyundai Tucson compressor, ST-40114",
	}
	product.PartType = "A/C Compressor"
	product.VehicleMake = "Hyundai"
	product.OENumbers = []string{"97701-D3000"}
	product.CompressorType = "VS16"
	product.Fitments = []models.VehicleFitment{{Make: "Hyundai", Model: "TUCSON 2.0CRDI", Notes: "Imported application text; verify before ordering."}}
	codes := listingIssueCodes(EvaluateListingQuality(product))
	for _, want := range []string{"description_format", "name_sku_missing", "meta_title_sku_missing", "meta_keywords_few", "fitment_unstructured", "specs_missing"} {
		if !strings.Contains(codes, want) {
			t.Errorf("missing %s in %s", want, codes)
		}
	}
}

func TestListingQualityAcceptsFixedFormatListing(t *testing.T) {
	t.Setenv("CATALOG_DOMAIN", "automotive")
	records := ParseProductListingText(automotiveListingSample)
	r := records[0]
	product := models.Product{
		SKU: r.SKU, Name: r.Name, Brand: r.Brand, Model: r.Model, PartNumber: r.PartNumber, CategoryID: 5,
		WarrantyPeriod: r.WarrantyPeriod, LeadTime: "7-15 days", ShortDescription: r.ShortDescription,
		Description: r.Description, MetaTitle: r.MetaTitle,
		MetaDescription: "Mazda MX-5 (NC) 1.8L 2.0L AC compressor SAP-11430. Replaces OE 92600-00C33, NE51-61-450B, NEY1-61-450. CR08, 12V, 6PK, 118mm pulley. Contact us for a quote.",
		MetaKeywords:    "SAP-11430, SAP11430, 92600-00C33, 9260000C33, NE51-61-450B, Mazda MX-5 AC compressor, CR08 compressor",
	}
	product.AutomotiveFields = *ListingAutomotiveFields(r, "A/C Compressor")
	if issues := EvaluateListingFormat(product); len(issues) > 0 {
		t.Fatalf("format issues: %s", listingIssueCodes(issues))
	}
	if issues := evaluateListingDataGaps(product); len(issues) > 0 {
		t.Fatalf("data gaps: %s", listingIssueCodes(issues))
	}
}
