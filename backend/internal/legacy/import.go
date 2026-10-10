package legacy

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"sort"
	"strconv"
	"strings"
	"time"

	"fanuc-backend/models"
	"fanuc-backend/services"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

const Source = "yourphp"

type Report struct {
	Source   string         `json:"source"`
	Tables   map[string]int `json:"tables"`
	Created  map[string]int `json:"created"`
	Skipped  map[string]int `json:"skipped"`
	Warnings []string       `json:"warnings"`
}

func Inspect(d Dump) Report {
	r := Report{Source: Source, Tables: map[string]int{}, Created: map[string]int{}, Skipped: map[string]int{}, Warnings: []string{}}
	for _, t := range []string{"category", "product", "article", "page", "picture", "block", "slide_data"} {
		r.Tables[t] = len(d["mqu_"+t])
	}
	if len(d["mqu_product"]) == 0 {
		r.Warnings = append(r.Warnings, "No products in source dump")
	}
	hasHome := false
	for _, b := range d["mqu_block"] {
		if b["pos"] == "homeAbout" {
			hasHome = true
		}
	}
	if !hasHome {
		r.Warnings = append(r.Warnings, "Template block homeAbout is absent; homepage uses editable banners. Export may predate current theme.")
	}
	for _, p := range d["mqu_product"] {
		if !ValidPath(p["url"]) {
			r.Warnings = append(r.Warnings, "product "+p["id"]+": invalid old URL "+strconv.Quote(p["url"])+"; no guessed redirect created")
		}
	}
	return r
}
func number(s string) uint     { n, _ := strconv.ParseUint(s, 10, 64); return uint(n) }
func integer(s string) int     { n, _ := strconv.Atoi(s); return n }
func decimal(s string) float64 { n, _ := strconv.ParseFloat(s, 64); return n }
func timestamp(s string) time.Time {
	n, _ := strconv.ParseInt(s, 10, 64)
	if n <= 0 {
		return time.Now().UTC()
	}
	return time.Unix(n, 0).UTC()
}
func jsonString(v any) string { b, _ := json.Marshal(v); return string(b) }
func Asset(s string) string {
	s = strings.TrimSpace(s)
	s = strings.ReplaceAll(s, "/Apps/Tpl/Home/Default/Public/", "/legacy/theme/")
	s = strings.ReplaceAll(s, "../Public/", "/legacy/theme/")
	return strings.ReplaceAll(s, "/Uploads/", "/legacy/uploads/")
}
func ValidPath(s string) bool {
	if len(s) > 500 || !strings.HasPrefix(s, "/") || strings.HasPrefix(s, "//") || strings.ContainsAny(s, "\\\r\n?#") || strings.Contains(s, "//") || strings.Contains(s, "..") || s == "/" || s == "/.html" {
		return false
	}
	u, e := url.Parse(s)
	return e == nil && u.IsAbs() == false && u.Host == ""
}
func Images(row Row) []string {
	out := []string{}
	seen := map[string]bool{}
	add := func(s string) {
		s = Asset(strings.SplitN(s, "|", 2)[0])
		if s != "" && !seen[s] {
			seen[s] = true
			out = append(out, s)
		}
	}
	add(row["thumb"])
	for _, s := range strings.Split(row["pics"], ":::") {
		add(s)
	}
	return out
}

// Import performs one transaction. Previously imported records are NEVER
// overwritten: administrator edits and AI SEO work survive repeat imports.
func Import(db *gorm.DB, d Dump, authorID uint) (Report, error) {
	return ImportWithOptions(db, d, authorID, ImportOptions{})
}

func ImportWithOptions(db *gorm.DB, d Dump, authorID uint, opts ImportOptions) (Report, error) {
	report := Inspect(d)
	report.Source = opts.source()
	categoryRows := map[uint]Row{}
	for _, row := range d["mqu_category"] {
		categoryRows[number(row["id"])] = row
	}
	includeCategory := func(row Row) bool {
		return row["module"] == "Product" && (!opts.Automotive || (row["lang"] == "2" && row["id"] != "1"))
	}
	codeCounts := map[string]int{}
	if opts.Automotive {
		for _, row := range d["mqu_product"] {
			code := tableFields(row["content"])["st- code"]
			if code != "" {
				codeCounts[strings.ToLower(code)]++
			}
		}
	}
	makeCategories := map[string]uint{}
	if authorID == 0 {
		return report, fmt.Errorf("author id is required")
	}
	err := db.Transaction(func(tx *gorm.DB) error {
		var author models.AdminUser
		if err := tx.First(&author, authorID).Error; err != nil {
			return fmt.Errorf("import author: %w", err)
		}
		ids := map[string]map[uint]uint{}
		newCategories := map[uint]bool{}
		lookup := func(entity string, id uint) (uint, error) {
			if ids[entity] == nil {
				ids[entity] = map[uint]uint{}
			}
			if n := ids[entity][id]; n != 0 {
				return n, nil
			}
			var m models.LegacyImport
			err := tx.Where("source = ? AND entity = ? AND legacy_id = ?", opts.source(), entity, id).First(&m).Error
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return 0, nil
			}
			if err != nil {
				return 0, err
			}
			ids[entity][id] = m.TargetID
			return m.TargetID, nil
		}
		record := func(entity string, row Row, target uint) error {
			raw := jsonString(row)
			sum := sha256.Sum256([]byte(raw))
			m := models.LegacyImport{Source: opts.source(), Entity: entity, LegacyID: number(row["id"]), TargetID: target, SourceHash: hex.EncodeToString(sum[:]), Payload: raw}
			if err := tx.Create(&m).Error; err != nil {
				return err
			}
			if ids[entity] == nil {
				ids[entity] = map[uint]uint{}
			}
			ids[entity][m.LegacyID] = target
			report.Created[entity]++
			return nil
		}
		route := func(old, target, entity string, id uint) error {
			old = strings.TrimRight(old, "/")
			if !ValidPath(old) || old == target {
				return nil
			}
			// Reserved infrastructure is never taken over by imported data.
			for _, prefix := range []string{"/admin", "/api", "/_next", "/legacy", "/uploads", "/sitemap", "/robots"} {
				if strings.HasPrefix(old, prefix) {
					return nil
				}
			}
			var existing models.LegacyRoute
			e := tx.Where("path = ?", old).First(&existing).Error
			if e == nil {
				if existing.Target != target {
					report.Warnings = append(report.Warnings, "Ambiguous old URL skipped: "+old)
				}
				return nil
			}
			if !errors.Is(e, gorm.ErrRecordNotFound) {
				return e
			}
			return tx.Create(&models.LegacyRoute{Path: old, Target: target, Entity: entity, TargetID: id}).Error
		}
		categories := append([]Row{}, d["mqu_category"]...)
		sort.Slice(categories, func(i, j int) bool { return number(categories[i]["id"]) < number(categories[j]["id"]) })
		// Products only: YourPHP's category table also contains single-page and
		// article navigation. Those are mapped below, not misclassified as products.
		for _, r := range categories {
			if !includeCategory(r) {
				continue
			}
			old := number(r["id"])
			existing, e := lookup("category", old)
			if e != nil {
				return e
			}
			if existing != 0 {
				report.Skipped["category"]++
				if opts.Automotive && r["parentid"] == "8" {
					if makeName := canonicalMake(r["catname"]); makeName != "" {
						makeCategories[makeName] = existing
					}
				}
				continue
			}
			c := models.Category{Name: r["catname"], Slug: fmt.Sprintf("legacy-%d-%s", old, strings.ToLower(r["catdir"])), Description: r["description"], ImageURL: Asset(r["image"]), SortOrder: integer(r["listorder"]), IsActive: true}
			if opts.Automotive {
				c.Name = categoryLabel(r)
				c.Slug = automotiveCategorySlug(r, categoryRows)
				c.ImageURL = ""
			}
			if e = tx.Create(&c).Error; e != nil {
				return e
			}
			if e = record("category", r, c.ID); e != nil {
				return e
			}
			newCategories[old] = true
			if opts.Automotive && r["parentid"] == "8" {
				if makeName := canonicalMake(r["catname"]); makeName != "" {
					makeCategories[makeName] = c.ID
				}
			}
			if e = route(r["url"], "/categories/"+c.Slug, "category", c.ID); e != nil {
				return e
			}
		}
		for _, r := range categories {
			if !includeCategory(r) {
				continue
			}
			old := number(r["id"])
			id, e := lookup("category", old)
			if e != nil {
				return e
			}
			parent, e := lookup("category", number(r["parentid"]))
			if e != nil {
				return e
			}
			if newCategories[old] && parent != 0 && parent != id {
				var c models.Category
				if e = tx.First(&c, id).Error; e != nil {
					return e
				}
				if c.ParentID == nil {
					if e = tx.Model(&c).Update("parent_id", parent).Error; e != nil {
						return e
					}
				}
			}
		}
		for _, r := range d["mqu_product"] {
			old := number(r["id"])
			existing, e := lookup("product", old)
			if e != nil {
				return e
			}
			if existing != 0 {
				report.Skipped["product"]++
				continue
			}
			cat, e := lookup("category", number(r["catid"]))
			if e != nil {
				return e
			}
			if cat == 0 {
				return fmt.Errorf("product %d: missing category %s", old, r["catid"])
			}
			// Legacy model numbers can be duplicated; a stable unique SKU prevents
			// seven distinct products from collapsing into one during migration.
			sku := fmt.Sprintf("LEGACY-%d", old)
			var auto models.AutomotiveFields
			partReference, supplierCode := r["xinghao"], r["xinghao"]
			if opts.Automotive {
				auto, supplierCode, partReference = automotiveFields(r, categoryRows[number(r["catid"])], categoryRows)
				if e := services.ValidateAutomotiveFields(&auto); e != nil {
					return fmt.Errorf("product %d automotive mapping: %w", old, e)
				}
				sku = fmt.Sprintf("SAP-%d", old)
				if supplierCode != "" && len(supplierCode) <= 100 && codeCounts[strings.ToLower(supplierCode)] == 1 {
					sku = supplierCode
				}
				// Correct only explicit vehicle makes found in source fitment text;
				// keep equipment/bus/manufacturer groupings intact, never guess a make.
				sourceMake := canonicalMake(categoryRows[number(r["catid"])]["catname"])
				if sourceMake != "" && auto.VehicleMake != "" && auto.VehicleMake != sourceMake {
					if target := makeCategories[auto.VehicleMake]; target != 0 {
						cat = target
					} else {
						parent, err := lookup("category", 8)
						if err != nil {
							return err
						}
						category := models.Category{Name: auto.VehicleMake, Slug: "ac-compressors-" + strings.ReplaceAll(strings.ToLower(auto.VehicleMake), " ", "-"), ParentID: &parent, IsActive: true}
						if err := tx.Create(&category).Error; err != nil {
							return err
						}
						cat = category.ID
						makeCategories[auto.VehicleMake] = cat
						report.Created["automotive-category"]++
					}
					report.Warnings = append(report.Warnings, fmt.Sprintf("product %d: source category %s corrected to explicit fitment make %s", old, sourceMake, auto.VehicleMake))
				}
			}
			images := Images(r)
			description := Asset(r["content"])
			p := models.Product{SKU: sku, Slug: strings.ToLower(sku), Name: r["title"], Model: r["xinghao"], PartNumber: r["xinghao"], CategoryID: cat, ShortDescription: r["description"], Description: description, Price: decimal(r["price"]), IsActive: r["status"] == "1", IsFeatured: integer(r["posid"]) > 0, MetaTitle: r["title"], MetaDescription: r["description"], MetaKeywords: r["keywords"], DisableAutoSEO: true, ImageURLs: jsonString(images), TechnicalSpecs: "{}", RelatedProducts: "[]", VideoURLs: "[]", CreatedAt: timestamp(r["createtime"]), UpdatedAt: timestamp(r["updatetime"]), WarrantyPeriod: "", LeadTime: "", ConditionType: "new"}
			if opts.Automotive {
				p.AutomotiveFields = auto
				p.Model = supplierCode
				p.PartNumber = partReference
				p.Name = automotiveProductName(r, auto, supplierCode, partReference)
				p.MetaTitle = p.Name
				p.Slug = strings.ToLower(sku)
				p.MinimumOrderQuantity = 0
				p.ConditionType = "unknown"
			}
			if r["market_price"] != "" {
				v := decimal(r["market_price"])
				p.ComparePrice = &v
			}
			// Explicit Select keeps zero values, false publication status and empty
			// commerce promises; GORM defaults must not invent stock/lead time here.
			if e = tx.Select("*").Omit("Category", "Images", "Attributes", "Translations", "PurchaseLinks", "Reviews", "FAQs", "Tags").Create(&p).Error; e != nil {
				return e
			}
			// GORM default tags replace false/empty values even with Select; reset the
			// values for imported records before they become visible.
			if e = tx.Model(&p).Updates(map[string]any{"is_active": r["status"] == "1", "warranty_period": "", "lead_time": "", "origin_country": "", "minimum_order_quantity": func() int {
				if opts.Automotive {
					return 0
				}
				return p.MinimumOrderQuantity
			}(), "condition_type": p.ConditionType}).Error; e != nil {
				return e
			}
			for i, img := range images {
				v := models.ProductImage{ProductID: p.ID, URL: img, AltText: p.Name, SortOrder: i, IsPrimary: i == 0}
				if e = tx.Create(&v).Error; e != nil {
					return e
				}
			}
			for i, key := range []string{"feature", "yingyong", "canshu", "color", "shuomingshu"} {
				if strings.TrimSpace(r[key]) != "" {
					labels := map[string]string{"feature": "Features", "yingyong": "Applications", "canshu": "Specifications", "color": "Color", "shuomingshu": "Manual"}
					v := models.ProductAttribute{ProductID: p.ID, AttributeName: labels[key], AttributeValue: Asset(r[key]), SortOrder: i}
					if e = tx.Create(&v).Error; e != nil {
						return e
					}
				}
			}
			if e = record("product", r, p.ID); e != nil {
				return e
			}
			if e = route(r["url"], services.BuildProductPublicPath(sku), "product", p.ID); e != nil {
				return e
			}
		}
		for _, entity := range []string{"article", "picture"} {
			for _, r := range d["mqu_"+entity] {
				if opts.Automotive && r["lang"] != "2" {
					continue
				}
				existing, e := lookup(entity, number(r["id"]))
				if e != nil {
					return e
				}
				if existing != 0 {
					report.Skipped[entity]++
					continue
				}
				if opts.Automotive && entity == "picture" && r["catid"] == "179" {
					block := models.HomepageContent{SectionKey: "advantage_" + r["id"], Title: r["title"], Subtitle: r["keywords"], Description: Asset(r["content"]), ImageURL: Asset(r["thumb"]), IsActive: r["status"] == "1", SortOrder: integer(r["listorder"])}
					if e := tx.Create(&block).Error; e != nil {
						return e
					}
					if e := record(entity, r, block.ID); e != nil {
						return e
					}
					continue
				}
				slug := fmt.Sprintf("legacy-%s-%s", entity, r["id"])
				a := models.Article{Title: r["title"], Slug: slug, CustomPath: "/news/" + slug, Summary: r["description"], Content: Asset(r["content"]), ContentType: "news", FeaturedImage: Asset(r["thumb"]), ImageURLs: jsonString(Images(r)), GalleryMediaIDs: "[]", IsPublished: r["status"] == "1", IsFeatured: integer(r["posid"]) > 0, MetaTitle: r["title"], MetaDescription: r["description"], MetaKeywords: r["keywords"], AuthorID: authorID, SortOrder: integer(r["listorder"]), CreatedAt: timestamp(r["createtime"]), UpdatedAt: timestamp(r["updatetime"])}
				if e = tx.Create(&a).Error; e != nil {
					return e
				}
				if e = record(entity, r, a.ID); e != nil {
					return e
				}
				if e = route(r["url"], a.CustomPath, entity, a.ID); e != nil {
					return e
				}
			}
		}
		for _, r := range d["mqu_page"] {
			old := number(r["id"])
			if opts.Automotive && (categoryRows[old]["lang"] != "2" || categoryRows[old]["module"] != "Page") {
				continue
			}
			existing, e := lookup("page", old)
			if e != nil {
				return e
			}
			if existing != 0 {
				report.Skipped["page"]++
				continue
			}
			key := fmt.Sprintf("legacy-page-%d", old)
			p := models.SitePage{PageKey: key, Title: r["title"], Summary: r["description"], Content: Asset(r["content"]), MetaTitle: r["title"], MetaDescription: r["description"], MetaKeywords: r["keywords"], IsPublished: true}
			if e = tx.Create(&p).Error; e != nil {
				return e
			}
			if e = record("page", r, p.ID); e != nil {
				return e
			}
			for _, c := range categories {
				if number(c["id"]) == old && c["module"] == "Page" {
					if e = route(c["url"], "/"+key, "page", p.ID); e != nil {
						return e
					}
				}
			}
		}
		for _, r := range d["mqu_block"] {
			if opts.Automotive && r["lang"] != "2" {
				continue
			}
			existing, e := lookup("block", number(r["id"]))
			if e != nil {
				return e
			}
			if existing != 0 {
				report.Skipped["block"]++
				continue
			}
			title := r["title"]
			if title == "" {
				title = r["name"]
			}
			b := models.HomepageContent{SectionKey: fmt.Sprintf("legacy-block-%s-%s", r["id"], r["pos"]), Title: title, Description: Asset(r["content"]), ImageURL: Asset(r["image1"]), ButtonURL: r["link"], IsActive: true, Data: datatypes.JSON([]byte("{}"))}
			if opts.Automotive && r["pos"] == "homeAbout" {
				b = sourceHero(r)
			}
			if opts.Automotive && r["pos"] == "about_content" {
				b.SectionKey = "about_content"
				b.Title = "About sentientautoparts"
			}
			if e = tx.Create(&b).Error; e != nil {
				return e
			}
			if e = record("block", r, b.ID); e != nil {
				return e
			}
		}
		for _, r := range d["mqu_slide_data"] {
			existing, e := lookup("banner", number(r["id"]))
			if e != nil {
				return e
			}
			if existing != 0 {
				report.Skipped["banner"]++
				continue
			}
			b := models.Banner{Title: r["title"], ImageURL: Asset(r["pic"]), LinkURL: r["link"], Description: r["description"], Position: "home", ContentType: "hero", SortOrder: integer(r["listorder"]), IsActive: r["status"] == "1"}
			if e = tx.Create(&b).Error; e != nil {
				return e
			}
			if e = tx.Model(&b).Update("is_active", r["status"] == "1").Error; e != nil {
				return e
			}
			if e = record("banner", r, b.ID); e != nil {
				return e
			}
		}
		return nil
	})
	return report, err
}
