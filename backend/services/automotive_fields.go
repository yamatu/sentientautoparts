package services

import (
	"encoding/json"
	"fmt"
	"strings"
	"unicode/utf8"

	"fanuc-backend/models"
	"gorm.io/gorm"
)

func ValidateAutomotiveFields(fields *models.AutomotiveFields) error {
	if fields == nil {
		return nil
	}
	for name, pair := range map[string]struct {
		value string
		limit int
	}{
		"part_type": {fields.PartType, 80}, "vehicle_make": {fields.VehicleMake, 100},
		"compressor_type": {fields.CompressorType, 100}, "refrigerant": {fields.Refrigerant, 80}, "voltage": {fields.Voltage, 40},
		"pulley_grooves": {fields.PulleyGrooves, 40}, "pulley_diameter": {fields.PulleyDiameter, 80}, "displacement": {fields.Displacement, 80},
		"oil_type": {fields.OilType, 80}, "oil_capacity": {fields.OilCapacity, 80}, "fitment_notes": {fields.FitmentNotes, 10000},
	} {
		if utf8.RuneCountInString(pair.value) > pair.limit {
			return fmt.Errorf("%s is too long", name)
		}
	}
	for _, list := range [][]string{fields.OENumbers, fields.InterchangeNumbers} {
		if len(list) > 100 {
			return fmt.Errorf("at most 100 part references are allowed")
		}
		for _, v := range list {
			if strings.TrimSpace(v) == "" || utf8.RuneCountInString(v) > 100 {
				return fmt.Errorf("invalid part reference")
			}
		}
	}
	if len(fields.Fitments) > 100 {
		return fmt.Errorf("at most 100 fitment rows are allowed")
	}
	for _, fitment := range fields.Fitments {
		if strings.TrimSpace(fitment.Make) == "" {
			return fmt.Errorf("fitment make is required")
		}
		if len(fitment.Make) > 100 || len(fitment.Model) > 200 || len(fitment.Engine) > 200 || len(fitment.Notes) > 2000 {
			return fmt.Errorf("fitment field is too long")
		}
		for _, year := range []*int{fitment.YearFrom, fitment.YearTo} {
			if year != nil && (*year < 1900 || *year > 2100) {
				return fmt.Errorf("fitment year must be 1900-2100")
			}
		}
		if fitment.YearFrom != nil && fitment.YearTo != nil && *fitment.YearFrom > *fitment.YearTo {
			return fmt.Errorf("fitment year range is reversed")
		}
	}
	return nil
}

func saveAutomotiveFields(tx *gorm.DB, productID uint, fields *models.AutomotiveFields) error {
	if fields == nil {
		return nil
	}
	jsonValue := func(v any) string {
		b, _ := json.Marshal(v)
		if string(b) == "null" {
			return "[]"
		}
		return string(b)
	}
	return tx.Model(&models.Product{}).Where("id = ?", productID).Updates(map[string]any{
		"part_type": strings.TrimSpace(fields.PartType), "vehicle_make": strings.TrimSpace(fields.VehicleMake),
		"oe_numbers": jsonValue(fields.OENumbers), "interchange_numbers": jsonValue(fields.InterchangeNumbers), "fitments": jsonValue(fields.Fitments),
		"compressor_type": strings.TrimSpace(fields.CompressorType), "refrigerant": strings.TrimSpace(fields.Refrigerant), "voltage": strings.TrimSpace(fields.Voltage),
		"pulley_grooves": strings.TrimSpace(fields.PulleyGrooves), "pulley_diameter": strings.TrimSpace(fields.PulleyDiameter), "displacement": strings.TrimSpace(fields.Displacement),
		"oil_type": strings.TrimSpace(fields.OilType), "oil_capacity": strings.TrimSpace(fields.OilCapacity), "fitment_notes": strings.TrimSpace(fields.FitmentNotes),
	}).Error
}
