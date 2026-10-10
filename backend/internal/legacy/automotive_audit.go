package legacy

import (
	"fanuc-backend/services"
)

// AuditAutomotive checks structured mappings without a database connection.
func AuditAutomotive(d Dump) map[string]any {
	cats := map[uint]Row{}
	for _, c := range d["mqu_category"] {
		cats[number(c["id"])] = c
	}
	counts := map[string]int{}
	makes := map[string]int{}
	codes := map[string]int{}
	invalid := []map[string]string{}
	for _, row := range d["mqu_product"] {
		fields, code, _ := automotiveFields(row, cats[number(row["catid"])], cats)
		makes[fields.VehicleMake]++
		codes[code]++
		if len(fields.OENumbers) > 0 {
			counts["with_oe_references"]++
		}
		if len(fields.Fitments) > 0 {
			counts["with_fitments"]++
		}
		if fields.CompressorType != "" {
			counts["with_compressor_series"]++
		}
		if fields.Refrigerant != "" {
			counts["with_refrigerant"]++
		}
		if fields.Voltage != "" {
			counts["with_voltage"]++
		}
		if fields.OilCapacity != "" {
			counts["with_oil_capacity"]++
		}
		if e := services.ValidateAutomotiveFields(&fields); e != nil {
			invalid = append(invalid, map[string]string{"id": row["id"], "error": e.Error()})
		}
	}
	duplicates := map[string]int{}
	for code, n := range codes {
		if n > 1 || code == "" {
			duplicates[code] = n
		}
	}
	return map[string]any{"counts": counts, "vehicle_makes": makes, "duplicate_or_missing_supplier_codes": duplicates, "validation_issues": invalid}
}
