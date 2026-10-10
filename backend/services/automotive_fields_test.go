package services

import (
	"encoding/json"
	"fanuc-backend/models"
	"testing"
)

func TestAutomotiveRequestPresenceAndValidation(t *testing.T) {
	var legacy models.ProductCreateRequest
	if err := json.Unmarshal([]byte(`{"sku":"AUTO-1","name":"Compressor"}`), &legacy); err != nil {
		t.Fatal(err)
	}
	if legacy.AutomotiveFields != nil {
		t.Fatal("omitted automotive fields must preserve stored values")
	}
	var req models.ProductCreateRequest
	if err := json.Unmarshal([]byte(`{"sku":"AUTO-1","oe_numbers":["88320-0C010"],"vehicle_make":"Toyota","fitments":[{"make":"Toyota","model":"Land Cruiser","year_from":2008,"year_to":2015}]}`), &req); err != nil {
		t.Fatal(err)
	}
	if req.AutomotiveFields == nil || req.OENumbers[0] != "88320-0C010" {
		t.Fatal("flattened fields not decoded")
	}
	if err := ValidateAutomotiveFields(req.AutomotiveFields); err != nil {
		t.Fatal(err)
	}
	x, y := 2020, 2010
	req.Fitments[0].YearFrom = &x
	req.Fitments[0].YearTo = &y
	if ValidateAutomotiveFields(req.AutomotiveFields) == nil {
		t.Fatal("reversed fitment accepted")
	}
}
