package services

import (
	"regexp"
	"strconv"
	"strings"
	"unicode/utf8"

	"fanuc-backend/models"
)

const (
	listingFieldCompressorType     = "compressor_type"
	listingFieldRefrigerant        = "refrigerant"
	listingFieldVoltage            = "voltage"
	listingFieldPulleyGrooves      = "pulley_grooves"
	listingFieldPulleyDiameter     = "pulley_diameter"
	listingFieldDisplacement       = "displacement"
	listingFieldOilType            = "oil_type"
	listingFieldOilCapacity        = "oil_capacity"
	listingFieldOENumbers          = "oe_numbers"
	listingFieldInterchangeNumbers = "interchange_numbers"
	listingFieldFitmentNotes       = "fitment_notes"
	// listingFieldFitmentRow marks that the parser is inside a "Fitment N" block.
	listingFieldFitmentRow = "_fitment"

	listingMaxReferences = 100
	listingMaxFitments   = 100
)

var listingAutomotiveLabelAliases = map[string]string{
	"compressormodelseries": listingFieldCompressorType, "compressormodel": listingFieldCompressorType,
	"compressorseries": listingFieldCompressorType, "compressortype": listingFieldCompressorType,
	"压缩机型号系列": listingFieldCompressorType, "压缩机型号": listingFieldCompressorType, "压缩机系列": listingFieldCompressorType,
	"refrigerant": listingFieldRefrigerant, "refrigeranttype": listingFieldRefrigerant, "制冷剂": listingFieldRefrigerant,
	"voltage": listingFieldVoltage, "电压": listingFieldVoltage,
	"pulleygrooves": listingFieldPulleyGrooves, "grooves": listingFieldPulleyGrooves, "皮带轮槽数": listingFieldPulleyGrooves, "槽数": listingFieldPulleyGrooves,
	"pulleydiameter": listingFieldPulleyDiameter, "皮带轮直径": listingFieldPulleyDiameter,
	"displacement": listingFieldDisplacement, "排量": listingFieldDisplacement,
	"oiltype": listingFieldOilType, "冷冻油类型": listingFieldOilType,
	"oilcapacity": listingFieldOilCapacity, "冷冻油容量": listingFieldOilCapacity,
	"oeoemreferencenumbers": listingFieldOENumbers, "oereferencenumbers": listingFieldOENumbers, "oemreferencenumbers": listingFieldOENumbers,
	"oenumbers": listingFieldOENumbers, "oemnumbers": listingFieldOENumbers, "oeoemnumbers": listingFieldOENumbers,
	"oereferences": listingFieldOENumbers, "oeoemreferences": listingFieldOENumbers, "oeoemreferencenos": listingFieldOENumbers,
	"oe参考号": listingFieldOENumbers, "oeoem参考号": listingFieldOENumbers, "oem参考号": listingFieldOENumbers, "原厂号": listingFieldOENumbers,
	"crossinterchangereferencenumbers": listingFieldInterchangeNumbers, "interchangereferencenumbers": listingFieldInterchangeNumbers,
	"crossreferencenumbers": listingFieldInterchangeNumbers, "crossreferences": listingFieldInterchangeNumbers,
	"interchangenumbers": listingFieldInterchangeNumbers, "interchangereferences": listingFieldInterchangeNumbers,
	"crossinterchangereferences": listingFieldInterchangeNumbers,
	"交叉替换参考号":                    listingFieldInterchangeNumbers, "交叉参考号": listingFieldInterchangeNumbers, "替换参考号": listingFieldInterchangeNumbers,
	"fitmentverificationnoterawapplicationtext": listingFieldFitmentNotes, "fitmentverificationnote": listingFieldFitmentNotes,
	"rawapplicationtext": listingFieldFitmentNotes, "fitmentnotes": listingFieldFitmentNotes, "fitmentnote": listingFieldFitmentNotes,
	"applicationtext": listingFieldFitmentNotes, "适配核对说明原始应用文本": listingFieldFitmentNotes, "适配核对说明": listingFieldFitmentNotes,
	"适配说明": listingFieldFitmentNotes,
	// The spec header names the vehicle make "Applicable Vehicle Make".
	"applicablevehiclemake": listingFieldVehicleMake, "适用车厂": listingFieldVehicleMake,
	"partbrandmanufacturer": listingFieldBrand, "productbrandmanufacturer": listingFieldBrand, "brandmanufacturer": listingFieldBrand,
	"partbrand": listingFieldBrand, "配件品牌制造商": listingFieldBrand, "配件品牌": listingFieldBrand,
	"productmodelsuppliermodel": listingFieldModel, "suppliermodel": listingFieldModel, "productmodel": listingFieldModel,
	"产品型号供应商型号": listingFieldModel, "供应商型号": listingFieldModel,
	"primarypartreferenceno": listingFieldPartNumber, "primarypartreference": listingFieldPartNumber,
	"primarypartreferencenumber": listingFieldPartNumber, "primaryreference": listingFieldPartNumber, "主要零件参考号": listingFieldPartNumber,
}

// listingSpecLabels are generic words ("Refrigerant: ...") that also appear as
// feature lines inside a description, so they never end a description block.
var listingSpecLabels = map[string]bool{
	listingFieldCompressorType: true, listingFieldRefrigerant: true, listingFieldVoltage: true,
	listingFieldPulleyGrooves: true, listingFieldPulleyDiameter: true, listingFieldDisplacement: true,
	listingFieldOilType: true, listingFieldOilCapacity: true,
}

var listingAutomotiveSectionHeaders = []string{
	"autopartspecsvehiclefitment", "autopartspecs", "partspecs", "specifications", "technicalspecifications",
	"vehiclefitment", "vehiclefitmentlist", "fitmentlist", "vehicleapplications",
	"汽配规格与车型适配", "汽配规格", "适配车辆清单", "车型适配",
}

var listingFitmentLabelAliases = map[string]string{
	"make": "make", "vehiclemake": "make", "车厂": "make", "品牌": "make",
	"model": "model", "vehiclemodel": "model", "车型": "model",
	"engine": "engine", "发动机": "engine",
	"sourcenotes": "notes", "notes": "notes", "source": "notes", "note": "notes", "来源备注": "notes", "备注": "notes",
	"startyear": "year_from", "yearfrom": "year_from", "fromyear": "year_from", "起始年份": "year_from",
	"endyear": "year_to", "yearto": "year_to", "toyear": "year_to", "结束年份": "year_to",
	"years": "years", "year": "years", "年份": "years",
}

var (
	listingFitmentHeaderPattern = regexp.MustCompile(`(?i)^\s*(?:[#*]+\s*)?(?:fitment|vehicle|application|适配|适配车型)\s*#?\s*\d{1,3}\s*[:：]?\s*(?:\*\*)?\s*$`)
	listingReferenceSplit       = regexp.MustCompile(`[\n,;，；]+`)
	listingYearPattern          = regexp.MustCompile(`(?:19|20)\d{2}`)
	listingCompactPattern       = regexp.MustCompile(`[\s\-./_]+`)
)

func init() {
	for key, value := range listingAutomotiveLabelAliases {
		listingLabelAliases[key] = value
	}
	for _, header := range listingAutomotiveSectionHeaders {
		listingSectionHeaders[header] = true
	}
}

func isListingListField(key string) bool {
	return key == listingFieldOENumbers || key == listingFieldInterchangeNumbers
}

// SanitizeListingReferences splits, trims and de-duplicates part references.
// Hyphenated and compact spellings are kept as separate entries on purpose:
// customers search for both.
func SanitizeListingReferences(values []string) []string {
	seen := map[string]bool{}
	result := make([]string, 0, len(values))
	for _, value := range values {
		for _, part := range listingReferenceSplit.Split(value, -1) {
			part = strings.TrimLeft(cleanListingInline(part), "-*•· ")
			if isListingPlaceholder(part) {
				continue
			}
			part = truncateListingText(part, 100)
			key := strings.ToUpper(part)
			if part == "" || seen[key] {
				continue
			}
			seen[key] = true
			result = append(result, part)
			if len(result) >= listingMaxReferences {
				return result
			}
		}
	}
	return result
}

// ExpandListingOEVariants adds the compact spelling ("92600-00C33" ->
// "9260000C33") right after every separated OE number that lacks it.
func ExpandListingOEVariants(values []string) []string {
	present := map[string]bool{}
	for _, value := range values {
		present[strings.ToUpper(value)] = true
	}
	result := make([]string, 0, len(values)*2)
	for _, value := range values {
		result = append(result, value)
		compact := strings.ToUpper(listingCompactPattern.ReplaceAllString(value, ""))
		if compact != "" && compact != strings.ToUpper(value) && !present[compact] && len(compact) >= 5 {
			present[compact] = true
			result = append(result, compact)
		}
	}
	if len(result) > listingMaxReferences {
		result = result[:listingMaxReferences]
	}
	return result
}

// MergeListingReferences appends incoming references that are not already
// stored (compared without separators), keeping the stored order first.
func MergeListingReferences(current, incoming []string) ([]string, bool) {
	seen := map[string]bool{}
	merged := make([]string, 0, len(current)+len(incoming))
	for _, value := range current {
		if strings.TrimSpace(value) == "" {
			continue
		}
		seen[strings.ToUpper(strings.TrimSpace(value))] = true
		merged = append(merged, strings.TrimSpace(value))
	}
	changed := false
	for _, value := range incoming {
		key := strings.ToUpper(strings.TrimSpace(value))
		if key == "" || seen[key] || len(merged) >= listingMaxReferences {
			continue
		}
		seen[key] = true
		merged = append(merged, strings.TrimSpace(value))
		changed = true
	}
	return merged, changed
}

func truncateListingBytes(value string, max int) string {
	value = strings.TrimSpace(value)
	for len(value) > max {
		_, size := utf8.DecodeLastRuneInString(value)
		value = value[:len(value)-size]
	}
	return strings.TrimSpace(value)
}

func parseListingYear(value string) *int {
	match := listingYearPattern.FindString(value)
	if match == "" {
		return nil
	}
	year, err := strconv.Atoi(match)
	if err != nil || year < 1900 || year > 2100 {
		return nil
	}
	return &year
}

func validListingYear(year *int) *int {
	if year == nil || *year < 1900 || *year > 2100 {
		return nil
	}
	value := *year
	return &value
}

// SanitizeListingFitments cleans fitment rows to the limits
// ValidateAutomotiveFields enforces. A row without a make falls back to the
// listing's vehicle make and is dropped when that is unknown too.
func SanitizeListingFitments(fitments []models.VehicleFitment, defaultMake string) []models.VehicleFitment {
	result := make([]models.VehicleFitment, 0, len(fitments))
	for _, fitment := range fitments {
		make_ := truncateListingBytes(cleanListingInline(listingFirstNonEmpty(fitment.Make, defaultMake)), 100)
		if make_ == "" || isListingPlaceholder(make_) {
			continue
		}
		row := models.VehicleFitment{
			Make:     make_,
			Model:    truncateListingBytes(cleanListingInline(fitment.Model), 200),
			Engine:   truncateListingBytes(cleanListingInline(fitment.Engine), 200),
			Notes:    truncateListingBytes(cleanListingInline(fitment.Notes), 2000),
			YearFrom: validListingYear(fitment.YearFrom),
			YearTo:   validListingYear(fitment.YearTo),
		}
		if row.YearFrom != nil && row.YearTo != nil && *row.YearFrom > *row.YearTo {
			row.YearFrom, row.YearTo = row.YearTo, row.YearFrom
		}
		result = append(result, row)
		if len(result) >= listingMaxFitments {
			break
		}
	}
	return result
}

func listingFirstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return value
		}
	}
	return ""
}

func listingFitmentFromValues(values map[string]string) models.VehicleFitment {
	fitment := models.VehicleFitment{
		Make:   values["make"],
		Model:  values["model"],
		Engine: values["engine"],
		Notes:  values["notes"],
	}
	fitment.YearFrom = parseListingYear(values["year_from"])
	fitment.YearTo = parseListingYear(values["year_to"])
	if years := listingYearPattern.FindAllString(values["years"], 2); len(years) > 0 {
		if fitment.YearFrom == nil {
			fitment.YearFrom = parseListingYear(years[0])
		}
		if fitment.YearTo == nil && len(years) > 1 {
			fitment.YearTo = parseListingYear(years[1])
		}
	}
	return fitment
}

func sanitizeListingAutomotive(record *ProductListingRecord) {
	record.CompressorType = truncateListingText(cleanListingShort(record.CompressorType), 100)
	record.Refrigerant = truncateListingText(cleanListingShort(record.Refrigerant), 80)
	record.Voltage = truncateListingText(cleanListingShort(record.Voltage), 40)
	record.PulleyGrooves = truncateListingText(cleanListingShort(record.PulleyGrooves), 40)
	record.PulleyDiameter = truncateListingText(cleanListingShort(record.PulleyDiameter), 80)
	record.Displacement = truncateListingText(cleanListingShort(record.Displacement), 80)
	record.OilType = truncateListingText(cleanListingShort(record.OilType), 80)
	record.OilCapacity = truncateListingText(cleanListingShort(record.OilCapacity), 80)
	record.OENumbers = SanitizeListingReferences(record.OENumbers)
	record.InterchangeNumbers = SanitizeListingReferences(record.InterchangeNumbers)
	record.Fitments = SanitizeListingFitments(record.Fitments, record.VehicleMake)
	record.FitmentNotes = truncateListingText(cleanListingDescription(record.FitmentNotes), 10000)
}

// ListingAutomotiveFields converts the automotive part of a listing into the
// product column set. It returns nil when the listing states none of it.
func ListingAutomotiveFields(record ProductListingRecord, partType string) *models.AutomotiveFields {
	fields := models.AutomotiveFields{
		PartType:           partType,
		VehicleMake:        strings.TrimSpace(record.VehicleMake),
		OENumbers:          append([]string{}, record.OENumbers...),
		InterchangeNumbers: append([]string{}, record.InterchangeNumbers...),
		Fitments:           append([]models.VehicleFitment{}, record.Fitments...),
		CompressorType:     record.CompressorType,
		Refrigerant:        record.Refrigerant,
		Voltage:            record.Voltage,
		PulleyGrooves:      record.PulleyGrooves,
		PulleyDiameter:     record.PulleyDiameter,
		Displacement:       record.Displacement,
		OilType:            record.OilType,
		OilCapacity:        record.OilCapacity,
		FitmentNotes:       record.FitmentNotes,
	}
	if fields.PartType == "" && fields.VehicleMake == "" && len(fields.OENumbers) == 0 && len(fields.InterchangeNumbers) == 0 &&
		len(fields.Fitments) == 0 && fields.FitmentNotes == "" && ListingSpecText(record) == "" {
		return nil
	}
	return &fields
}

// ListingSpecText joins the spec values; empty means the listing has no specs.
func ListingSpecText(record ProductListingRecord) string {
	return strings.TrimSpace(strings.Join([]string{record.CompressorType, record.Refrigerant, record.Voltage, record.PulleyGrooves,
		record.PulleyDiameter, record.Displacement, record.OilType, record.OilCapacity}, " "))
}

// FormatListingFitments renders fitment rows one per line for diffs and logs.
func FormatListingFitments(fitments []models.VehicleFitment) string {
	lines := make([]string, 0, len(fitments))
	for _, fitment := range fitments {
		parts := []string{fitment.Make, fitment.Model, fitment.Engine}
		years := ""
		switch {
		case fitment.YearFrom != nil && fitment.YearTo != nil:
			years = strconv.Itoa(*fitment.YearFrom) + "-" + strconv.Itoa(*fitment.YearTo)
		case fitment.YearFrom != nil:
			years = strconv.Itoa(*fitment.YearFrom) + "-"
		case fitment.YearTo != nil:
			years = "-" + strconv.Itoa(*fitment.YearTo)
		}
		parts = append(parts, years)
		line := strings.Join(strings.Fields(strings.Join(parts, " ")), " ")
		if line != "" {
			lines = append(lines, line)
		}
	}
	return strings.Join(lines, "\n")
}
