package legacy

import (
	"fmt"
	"regexp"
	"strconv"
	"strings"

	"fanuc-backend/models"
	"github.com/PuerkitoBio/goquery"
)

type ImportOptions struct{ Automotive bool }

func (o ImportOptions) source() string {
	if o.Automotive {
		return "yourphp-automotive-20260131"
	}
	return Source
}

var whitespaceRE = regexp.MustCompile(`\s+`)
var yearLineRE = regexp.MustCompile(`^((?:19|20)\d{2})?\s*[-–—~]\s*((?:19|20)\d{2})?$`)
var oneYearRE = regexp.MustCompile(`^(?:19|20)\d{2}$`)
var referencesRE = regexp.MustCompile(`[/,;\n，；]+`)
var partRefTokenRE = regexp.MustCompile(`^[A-Za-z0-9-]{5,100}$`)
var partRefDigitRE = regexp.MustCompile(`[0-9]`)
var oilCapacityRE = regexp.MustCompile(`(?i)\b(\d+(?:\.\d+)?\s*(?:ml|cc))\b`)
var refrigerantRE = regexp.MustCompile(`(?i)\bR(?:134a|1234yf|12)\b`)
var compressorSeriesRE = regexp.MustCompile(`(?i)^(?:\d{1,2}(?:S|SEU|SBU|SAS|PA|H|V|C)[A-Z0-9-]*|(?:DCS|CVC|VS|CR|HS|FS|QS|ES|ESP|DKS|MSC|SD|TM|SP|ATC)[A-Z0-9-]+)$`)
var makeNames = []string{"Mercedes-Benz", "Land Rover", "Volkswagen", "Mitsubishi", "Toyota", "Lexus", "Honda", "Acura", "Nissan", "Infiniti", "Hyundai", "Kia", "Mazda", "Suzuki", "Subaru", "Isuzu", "Volvo", "Peugeot", "Citroen", "Renault", "Jaguar", "BMW", "Audi", "GMC", "Chevrolet", "Cadillac", "Buick", "Ford", "Fiat", "BYD", "Geely", "Chery", "GWM", "Jinbei", "Daihatsu", "Dodge", "Jeep", "Opel", "Skoda", "Seat", "Saab", "Porsche", "Tesla"}

func textOfHTML(value string) string {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(value))
	if err != nil {
		return strings.TrimSpace(value)
	}
	doc.Find("script,style").Remove()
	return strings.TrimSpace(whitespaceRE.ReplaceAllString(doc.Text(), " "))
}
func tableFields(value string) map[string]string {
	fields := map[string]string{}
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(value))
	if err != nil {
		return fields
	}
	doc.Find("tr").Each(func(_ int, row *goquery.Selection) {
		cells := row.ChildrenFiltered("th,td")
		if cells.Length() < 2 {
			return
		}
		key := strings.ToLower(strings.Join(strings.Fields(cells.First().Text()), " "))
		val := strings.Join(strings.Fields(cells.Eq(1).Text()), " ")
		if val != "" {
			fields[key] = val
		}
	})
	return fields
}
func canonicalMake(value string) string {
	value = strings.TrimSpace(value)
	if strings.EqualFold(value, "Mercdes-benz") {
		return "Mercedes-Benz"
	}
	for _, m := range makeNames {
		if strings.EqualFold(value, m) {
			return m
		}
	}
	return ""
}
func makeInFitment(value string) string {
	words := strings.ToLower(value)
	for _, makeName := range makeNames {
		key := strings.ToLower(makeName)
		if strings.HasPrefix(words, key+" ") || words == key {
			return makeName
		}
	}
	if strings.HasPrefix(words, "mercedes ") {
		return "Mercedes-Benz"
	}
	return ""
}
func categoryLabel(row Row) string {
	if m := canonicalMake(row["catname"]); m != "" {
		return m
	}
	switch row["id"] {
	case "8":
		return "A/C Compressors"
	case "182":
		return "Auto Condensers"
	case "183":
		return "Evaporator Units"
	case "184":
		return "Expansion Valves"
	}
	switch strings.ToUpper(row["catname"]) {
	case "SANDEN":
		return "Sanden Compressors"
	case "BUS":
		return "Bus A/C Compressors"
	case "OTHERS":
		return "Other Applications"
	}
	return row["catname"]
}
func automotiveCategorySlug(row Row, categories map[uint]Row) string {
	parts := []string{}
	seen := map[uint]bool{}
	for id := number(row["id"]); id != 0 && id != 1 && !seen[id]; id = number(row["id"]) {
		seen[id] = true
		slug := strings.ToLower(strings.ReplaceAll(strings.ReplaceAll(categoryLabel(row), "A/C", "ac"), " ", "-"))
		slug = regexp.MustCompile(`[^a-z0-9-]+`).ReplaceAllString(slug, "")
		parts = append([]string{slug}, parts...)
		row = categories[number(row["parentid"])]
		if row == nil {
			break
		}
	}
	return strings.Join(parts, "-")
}
func automotivePartType(category Row, categories map[uint]Row) string {
	seen := map[uint]bool{}
	for category != nil && !seen[number(category["id"])] {
		seen[number(category["id"])] = true
		switch category["id"] {
		case "8":
			return "A/C Compressor"
		case "182":
			return "Condenser"
		case "183":
			return "Evaporator Unit"
		case "184":
			return "Expansion Valve"
		}
		category = categories[number(category["parentid"])]
	}
	return ""
}
func automotiveFields(row Row, category Row, categories map[uint]Row) (models.AutomotiveFields, string, string) {
	fields := tableFields(row["content"])
	result := models.AutomotiveFields{PartType: automotivePartType(category, categories), OENumbers: []string{}, InterchangeNumbers: []string{}, Fitments: []models.VehicleFitment{}}
	fitment := fields["fitment"]
	result.VehicleMake = makeInFitment(fitment)
	if result.VehicleMake == "" {
		result.VehicleMake = canonicalMake(category["catname"])
	}
	result.FitmentNotes = fitment
	// No manufacturer inferred from the vehicle category or an OE reference.
	refs := fields["part number"]
	references := []string{}
	for _, segment := range referencesRE.Split(refs, -1) {
		tokens := strings.Fields(segment)
		multiple := len(tokens) > 1
		for _, token := range tokens {
			if !partRefTokenRE.MatchString(token) || !partRefDigitRE.MatchString(token) {
				multiple = false
				break
			}
		}
		if multiple {
			references = append(references, tokens...)
		} else {
			references = append(references, segment)
		}
	}
	for _, ref := range references {
		ref = strings.TrimSpace(ref)
		if len(ref) < 3 || ref == "N/A" || ref == "NONE" {
			continue
		}
		duplicate := false
		for _, old := range result.OENumbers {
			if strings.EqualFold(ref, old) {
				duplicate = true
			}
		}
		if !duplicate {
			result.OENumbers = append(result.OENumbers, ref)
		}
	}
	result.Voltage = fields["voltage"]
	if result.Voltage == "0" || result.Voltage == "-" {
		result.Voltage = ""
	}
	result.PulleyGrooves = fields["pulley section"]
	result.PulleyDiameter = fields["pulley diameter(mm)"]
	if result.PulleyDiameter != "" && result.PulleyDiameter != "0" && !strings.Contains(strings.ToLower(result.PulleyDiameter), "mm") {
		result.PulleyDiameter += " mm"
	}
	if result.PulleyDiameter == "0" {
		result.PulleyDiameter = ""
	}
	oil := fields["oil type"]
	result.OilCapacity = oilCapacityRE.FindString(oil)
	result.Refrigerant = refrigerantRE.FindString(oil)
	result.OilType = strings.Trim(strings.TrimSpace(oilCapacityRE.ReplaceAllString(oil, "")), "/ ")
	if result.OilType == "0" {
		result.OilType = ""
	}
	raw := regexp.MustCompile(`(?i)<br\s*/?>`).ReplaceAllString(row["canshu"], "\n")
	lines := strings.Split(raw, "\n")
	application := models.VehicleFitment{Make: result.VehicleMake, Model: fitment, Notes: "Imported application text; verify before ordering."}
	if result.VehicleMake != "" && strings.HasPrefix(strings.ToLower(fitment), strings.ToLower(result.VehicleMake)+" ") {
		application.Model = strings.TrimSpace(fitment[len(result.VehicleMake):])
	}
	for _, line := range lines {
		line = textOfHTML(line)
		if match := yearLineRE.FindStringSubmatch(line); match != nil {
			if match[1] != "" {
				v, _ := strconv.Atoi(match[1])
				application.YearFrom = &v
			}
			if match[2] != "" {
				v, _ := strconv.Atoi(match[2])
				application.YearTo = &v
			}
		} else if oneYearRE.MatchString(line) {
			v, _ := strconv.Atoi(line)
			application.YearFrom = &v
			application.YearTo = &v
		}
		if result.CompressorType == "" && compressorSeriesRE.MatchString(line) && len(line) < 80 {
			result.CompressorType = line
		}
		if result.Refrigerant == "" {
			result.Refrigerant = refrigerantRE.FindString(line)
		}
	}
	if application.Make != "" && application.Model != "" {
		result.Fitments = append(result.Fitments, application)
	}
	partNumber := ""
	if len(result.OENumbers) > 0 {
		partNumber = result.OENumbers[0]
	}
	return result, fields["st- code"], partNumber
}
func sourceHero(row Row) models.HomepageContent {
	doc, _ := goquery.NewDocumentFromReader(strings.NewReader(Asset(row["content"])))
	image, _ := doc.Find("img").First().Attr("src")
	title := strings.Join(strings.Fields(doc.Find(".title").First().Text()), " ")
	text := strings.Join(strings.Fields(doc.Find(".txt").First().Text()), " ")
	return models.HomepageContent{SectionKey: "hero_section", Title: title, Description: text, ImageURL: image, ButtonText: "Find Your Part", ButtonURL: "/products", IsActive: true, SortOrder: 0}
}
func automotiveProductName(row Row, fields models.AutomotiveFields, code, reference string) string {
	name := row["title"]
	if strings.HasPrefix(strings.ToUpper(strings.TrimSpace(name)), "ST-") && !strings.Contains(strings.TrimSpace(name), " ") && fields.FitmentNotes != "" {
		name = fmt.Sprintf("%s for %s", fields.PartType, fields.FitmentNotes)
		if reference != "" {
			name += " · " + reference
		}
	}
	runes := []rune(name)
	if len(runes) > 250 {
		name = string(runes[:250])
	}
	return name
}
