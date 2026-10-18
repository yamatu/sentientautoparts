package services

import (
	"strings"
	"unicode/utf8"

	"fanuc-backend/models"
)

// ListingQualityIssue explains why a product still needs the full listing
// rewrite. An empty result means identity, taxonomy, content and SEO are all
// acceptable and the AI run can skip the product.
type ListingQualityIssue struct {
	Code   string `json:"code"`
	Detail string `json:"detail"`
}

// EvaluateListingQuality checks a product against the fixed listing format:
// legacy products without model/part number/brand, catch-all categories, thin
// copy and weak SEO are all reported.
func EvaluateListingQuality(product models.Product) []ListingQualityIssue {
	issues := make([]ListingQualityIssue, 0, 4)
	add := func(code, detail string) { issues = append(issues, ListingQualityIssue{Code: code, Detail: detail}) }

	if strings.TrimSpace(product.SKU) == "" {
		add("sku_missing", "SKU 为空")
	}
	if NormalizeBrandKey(product.Brand) == "" {
		add("brand_missing", "品牌为空")
	}
	if strings.TrimSpace(product.Model) == "" {
		add("model_missing", "型号为空（旧字段产品）")
	}
	if strings.TrimSpace(product.PartNumber) == "" {
		add("part_number_missing", "零件号为空（旧字段产品）")
	}
	if product.CategoryID == 0 {
		add("category_missing", "未分类")
	}
	if strings.TrimSpace(product.WarrantyPeriod) == "" || strings.TrimSpace(product.LeadTime) == "" {
		add("commerce_missing", "质保期或交货期为空")
	}

	identifier := compactModel(productClassificationModel(product))
	name := strings.TrimSpace(product.Name)
	switch {
	case name == "":
		add("name_missing", "产品名称为空")
	case compactModel(name) == identifier || compactModel(name) == compactModel(product.SKU):
		add("name_is_sku", "产品名称只有型号，缺少品牌与产品类型")
	case utf8.RuneCountInString(name) < 20:
		add("name_thin", "产品名称过短")
	case len(identifier) >= 5 && !strings.Contains(compactModel(name), identifier) && !strings.Contains(compactModel(name), compactModel(product.SKU)):
		add("name_identifier_missing", "产品名称不含型号/零件号")
	}

	if issue, detail := EvaluateProductContentQuality(product); issue != "" {
		add(issue, detail)
	}

	seoProduct := product
	seoProduct.IsActive = true
	if issue, detail := evaluateProductSEO(seoProduct); issue != "" && issue != SEOIssueNeverOptimized {
		add(issue, detail)
	}
	titleLength := utf8.RuneCountInString(strings.TrimSpace(product.MetaTitle))
	descriptionLength := utf8.RuneCountInString(strings.TrimSpace(product.MetaDescription))
	if titleLength > 0 && (titleLength < 25 || titleLength > 75) {
		add("meta_title_length", "SEO 标题长度不合适（建议 40-70 字符）")
	}
	if descriptionLength > 0 && (descriptionLength < 70 || descriptionLength > 200) {
		add("meta_description_length", "SEO 描述长度不合适（建议 120-160 字符）")
	}
	if strings.TrimSpace(product.MetaKeywords) == "" {
		add("meta_keywords_missing", "SEO 关键词为空")
	}
	if AutomotiveMode() {
		issues = append(issues, EvaluateListingFormat(product)...)
		issues = append(issues, evaluateListingDataGaps(product)...)
	}
	return issues
}

// EvaluateListingFormat checks the copy against the fixed automotive listing
// layout. Imported legacy listings usually have SEO of a reasonable length but
// none of this structure, so length checks alone pass them. These rules are
// also enforced on AI answers, because the model controls every one of them.
func EvaluateListingFormat(product models.Product) []ListingQualityIssue {
	issues := make([]ListingQualityIssue, 0, 5)
	add := func(code, detail string) { issues = append(issues, ListingQualityIssue{Code: code, Detail: detail}) }
	sku := compactModel(product.SKU)
	contains := func(text string) bool { return sku == "" || strings.Contains(compactModel(text), sku) }

	if !strings.Contains(strings.ToLower(product.Description), "key features") {
		add("description_format", "描述不是固定格式（缺少 Key Features & Technical Highlights 段）")
	}
	if !contains(product.Name) {
		add("name_sku_missing", "产品名称缺少 SKU（固定格式：… | SKU）")
	}
	if !contains(product.ShortDescription) {
		add("short_sku_missing", "简介缺少 SKU")
	}
	if !contains(product.MetaTitle) {
		add("meta_title_sku_missing", "SEO 标题缺少 SKU")
	}
	keywords := 0
	for _, keyword := range strings.Split(product.MetaKeywords, ",") {
		if strings.TrimSpace(keyword) != "" {
			keywords++
		}
	}
	if keywords > 0 && keywords < 6 {
		add("meta_keywords_few", "SEO 关键词少于 6 个")
	}
	return issues
}

// evaluateListingDataGaps reports missing automotive data. Unlike the format
// rules these depend on what research can find, so they are not enforced on AI
// answers.
func evaluateListingDataGaps(product models.Product) []ListingQualityIssue {
	issues := make([]ListingQualityIssue, 0, 3)
	add := func(code, detail string) { issues = append(issues, ListingQualityIssue{Code: code, Detail: detail}) }
	if len(product.OENumbers) == 0 {
		add("oe_missing", "缺少 OE / OEM 参考号")
	}
	structured := false
	for _, fitment := range product.Fitments {
		if fitment.YearFrom != nil || fitment.YearTo != nil || strings.TrimSpace(fitment.Engine) != "" {
			structured = true
			break
		}
	}
	switch {
	case len(product.Fitments) == 0 && strings.TrimSpace(product.FitmentNotes) == "":
		add("fitment_missing", "缺少适配车型清单")
	case !structured:
		add("fitment_unstructured", "适配车型没有年份/发动机（只有导入的原始文字）")
	}
	if CanonicalAutomotivePartType(product.PartType) == "A/C Compressor" {
		filled := 0
		for _, value := range []string{product.CompressorType, product.Refrigerant, product.Voltage, product.PulleyGrooves, product.PulleyDiameter} {
			if strings.TrimSpace(value) != "" {
				filled++
			}
		}
		if filled < 3 {
			add("specs_missing", "压缩机规格不全（系列/制冷剂/电压/皮带轮槽数/直径至少 3 项）")
		}
	}
	return issues
}

// ListingQualitySummary joins issue details for job logs.
func ListingQualitySummary(issues []ListingQualityIssue) string {
	parts := make([]string, 0, len(issues))
	for _, issue := range issues {
		parts = append(parts, issue.Detail)
	}
	return strings.Join(parts, "；")
}
