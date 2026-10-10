package models

// AutomotiveFields separates catalogue identifiers and fitment from SKU and
// supplier brand. Unknown values remain empty; a vehicle make is NOT the part
// manufacturer. OE/interchange references are not a compatibility guarantee.
type AutomotiveFields struct {
	PartType           string           `json:"part_type" gorm:"size:80;index"`
	VehicleMake        string           `json:"vehicle_make" gorm:"size:100;index"`
	OENumbers          []string         `json:"oe_numbers" gorm:"serializer:json;type:json"`
	InterchangeNumbers []string         `json:"interchange_numbers" gorm:"serializer:json;type:json"`
	Fitments           []VehicleFitment `json:"fitments" gorm:"serializer:json;type:json"`
	CompressorType     string           `json:"compressor_type" gorm:"size:100"`
	Refrigerant        string           `json:"refrigerant" gorm:"size:80"`
	Voltage            string           `json:"voltage" gorm:"size:40"`
	PulleyGrooves      string           `json:"pulley_grooves" gorm:"size:40"`
	PulleyDiameter     string           `json:"pulley_diameter" gorm:"size:80"`
	Displacement       string           `json:"displacement" gorm:"size:80"`
	OilType            string           `json:"oil_type" gorm:"size:80"`
	OilCapacity        string           `json:"oil_capacity" gorm:"size:80"`
	FitmentNotes       string           `json:"fitment_notes" gorm:"type:text"`
}

type VehicleFitment struct {
	Make     string `json:"make"`
	Model    string `json:"model"`
	YearFrom *int   `json:"year_from,omitempty"`
	YearTo   *int   `json:"year_to,omitempty"`
	Engine   string `json:"engine"`
	Notes    string `json:"notes"`
}
