package controllers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"fanuc-backend/config"
	"fanuc-backend/models"
	"fanuc-backend/services"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Storefront reads the same models the sentientautoparts admin/SEO tools edit. No mock
// fallback and no second catalogue: saved SEO fields are immediately visible.
type StorefrontController struct{}

func storeError(c *gin.Context, err error) {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(404, models.APIResponse{Success: false, Message: "Not found"})
		return
	}
	c.JSON(500, models.APIResponse{Success: false, Message: "Storefront database unavailable"})
}
func storeOK(c *gin.Context, v any) { c.JSON(200, models.APIResponse{Success: true, Data: v}) }
func (s *StorefrontController) Navigation(c *gin.Context) {
	var categories []models.Category
	var pages []models.SitePage
	if e := config.DB.Where("is_active = ?", true).Order("sort_order ASC, id ASC").Find(&categories).Error; e != nil {
		storeError(c, e)
		return
	}
	if e := config.DB.Select("id,page_key,title,updated_at").Where("is_published = ?", true).Find(&pages).Error; e != nil {
		storeError(c, e)
		return
	}
	type countRow struct {
		CategoryID uint
		Total      int64
	}
	var counts []countRow
	if err := config.DB.Model(&models.Product{}).Select("category_id, COUNT(*) AS total").Where("is_active = ?", true).Group("category_id").Scan(&counts).Error; err != nil {
		storeError(c, err)
		return
	}
	byID := map[uint]models.Category{}
	totals := map[uint]int64{}
	for _, cat := range categories {
		byID[cat.ID] = cat
	}
	for _, row := range counts {
		seen := map[uint]bool{}
		for id := row.CategoryID; id != 0 && !seen[id]; {
			seen[id] = true
			totals[id] += row.Total
			cat, ok := byID[id]
			if !ok || cat.ParentID == nil {
				break
			}
			id = *cat.ParentID
		}
	}
	var makes, types []string
	if err := config.DB.Model(&models.Product{}).Where("is_active = ? AND vehicle_make <> ''", true).Distinct().Order("vehicle_make").Pluck("vehicle_make", &makes).Error; err != nil {
		storeError(c, err)
		return
	}
	if err := config.DB.Model(&models.Product{}).Where("is_active = ? AND part_type <> ''", true).Distinct().Order("part_type").Pluck("part_type", &types).Error; err != nil {
		storeError(c, err)
		return
	}
	type categoryResponse struct {
		models.Category
		ProductCount int64 `json:"product_count"`
	}
	result := []categoryResponse{}
	for _, cat := range categories {
		result = append(result, categoryResponse{cat, totals[cat.ID]})
	}
	storeOK(c, gin.H{"categories": result, "pages": pages, "makes": makes, "part_types": types})
}
func (s *StorefrontController) Home(c *gin.Context) {
	var banners []models.Banner
	var blocks []models.HomepageContent
	if e := config.DB.Where("is_active = ? AND position = ? AND (start_date IS NULL OR start_date <= NOW()) AND (end_date IS NULL OR end_date >= NOW())", true, "home").Order("sort_order ASC,id DESC").Find(&banners).Error; e != nil {
		storeError(c, e)
		return
	}
	if e := config.DB.Where("is_active = ?", true).Order("sort_order ASC,id ASC").Find(&blocks).Error; e != nil {
		storeError(c, e)
		return
	}
	storeOK(c, gin.H{"banners": banners, "blocks": blocks})
}
func productQuery(db *gorm.DB) *gorm.DB {
	return db.Preload("Category").Preload("Images", func(tx *gorm.DB) *gorm.DB { return tx.Order("sort_order ASC, id ASC") }).Preload("Attributes").Preload("Translations").Where("is_active = ?", true)
}
func (s *StorefrontController) Products(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	if page < 1 {
		page = 1
	}
	if page > 1000000 {
		c.JSON(400, models.APIResponse{Success: false, Message: "Page is out of range"})
		return
	}
	size, _ := strconv.Atoi(c.DefaultQuery("page_size", "12"))
	if size < 1 {
		size = 12
	}
	if size > 1000 {
		size = 1000
	}
	q := config.DB.Model(&models.Product{}).Where("is_active = ?", true)
	var category *models.Category
	if slug := c.Query("category"); slug != "" {
		var cat models.Category
		if e := config.DB.Where("slug = ? AND is_active = ?", slug, true).First(&cat).Error; e != nil {
			storeError(c, e)
			return
		}
		category = &cat
		var all []models.Category
		if e := config.DB.Where("is_active = ?", true).Find(&all).Error; e != nil {
			storeError(c, e)
			return
		}
		seen := map[uint]bool{cat.ID: true}
		ids := []uint{cat.ID}
		for changed := true; changed; {
			changed = false
			for _, v := range all {
				if v.ParentID != nil && seen[*v.ParentID] && !seen[v.ID] {
					seen[v.ID] = true
					ids = append(ids, v.ID)
					changed = true
				}
			}
		}
		q = q.Where("category_id IN ?", ids)
	}
	for key, column := range map[string]string{"make": "vehicle_make", "part_type": "part_type"} {
		if value := strings.TrimSpace(c.Query(key)); value != "" {
			if len(value) > 100 {
				c.JSON(400, gin.H{"error": "Filter is too long"})
				return
			}
			q = q.Where(column+" = ?", value)
		}
	}
	if yearText := c.Query("year"); yearText != "" {
		year, err := strconv.Atoi(yearText)
		if err != nil || year < 1900 || year > 2100 {
			c.JSON(400, gin.H{"error": "Invalid vehicle year"})
			return
		}
		// Never treat a missing year boundary as a verified fitment range.
		q = q.Where(`products.id IN (SELECT fitment_product.id FROM products AS fitment_product JOIN JSON_TABLE(fitment_product.fitments, '$[*]' COLUMNS (year_from INT PATH '$.year_from', year_to INT PATH '$.year_to')) AS vf ON ? BETWEEN vf.year_from AND vf.year_to)`, year)
	}
	if term := strings.TrimSpace(c.Query("q")); term != "" {
		if len(term) > 200 {
			c.JSON(400, gin.H{"error": "Search is too long"})
			return
		}
		like := "%" + term + "%"
		normalized := "%" + strings.NewReplacer("-", "", " ", "").Replace(term) + "%"
		q = q.Where("name LIKE ? OR sku LIKE ? OR model LIKE ? OR part_number LIKE ? OR fitment_notes LIKE ? OR compressor_type LIKE ? OR vehicle_make LIKE ? OR REPLACE(REPLACE(COALESCE(oe_numbers, ''), '-', ''), ' ', '') LIKE ? OR REPLACE(REPLACE(COALESCE(interchange_numbers, ''), '-', ''), ' ', '') LIKE ?", like, like, like, like, like, like, like, normalized, normalized)
	}
	var total int64
	if e := q.Count(&total).Error; e != nil {
		storeError(c, e)
		return
	}
	var products []models.Product
	// Listing payloads do not ship 1,000 long HTML descriptions to sitemap clients.
	listQuery := q.Omit("description").Preload("Category").Preload("Images", func(tx *gorm.DB) *gorm.DB { return tx.Order("sort_order ASC,id ASC") })
	if e := listQuery.Order("is_featured DESC, id ASC").Offset((page - 1) * size).Limit(size).Find(&products).Error; e != nil {
		storeError(c, e)
		return
	}
	storeOK(c, gin.H{"products": products, "category": category, "page": page, "page_size": size, "total": total, "total_pages": (total + int64(size) - 1) / int64(size)})
}
func (s *StorefrontController) Product(c *gin.Context) {
	sku, err := services.DecodeProductPathID(c.Param("sku"))
	if err != nil {
		storeError(c, gorm.ErrRecordNotFound)
		return
	}
	var p models.Product
	if e := productQuery(config.DB).Where("sku = ?", sku).First(&p).Error; e != nil {
		storeError(c, e)
		return
	}
	storeOK(c, p)
}
func (s *StorefrontController) Articles(c *gin.Context) {
	page := 1
	if p := c.Query("page"); p != "" {
		if parsed, e := strconv.Atoi(p); e == nil && parsed > 0 {
			page = parsed
		}
	}
	size := 12
	if ps := c.Query("page_size"); ps != "" {
		if parsed, e := strconv.Atoi(ps); e == nil && parsed > 0 && parsed <= 100 {
			size = parsed
		}
	}
	var total int64
	if e := config.DB.Model(&models.Article{}).Where("is_published = ?", true).Count(&total).Error; e != nil {
		storeError(c, e)
		return
	}
	var rows []models.Article
	if e := config.DB.Where("is_published = ?", true).Order("sort_order ASC,id DESC").Offset((page-1)*size).Limit(size).Find(&rows).Error; e != nil {
		storeError(c, e)
		return
	}
	storeOK(c, gin.H{"articles": rows, "page": page, "page_size": size, "total": total, "total_pages": (total + int64(size) - 1) / int64(size)})
}
func (s *StorefrontController) Article(c *gin.Context) {
	var row models.Article
	if e := config.DB.Where("slug = ? AND is_published = ?", c.Param("slug"), true).First(&row).Error; e != nil {
		storeError(c, e)
		return
	}
	storeOK(c, row)
}
func (s *StorefrontController) Page(c *gin.Context) {
	var row models.SitePage
	if e := config.DB.Where("page_key = ? AND is_published = ?", c.Param("key"), true).First(&row).Error; e != nil {
		storeError(c, e)
		return
	}
	storeOK(c, row)
}

// Admin articles store custom_path without its leading slash; imported data
// may retain one. Match both conventions without fetching an article catalogue.
func storefrontArticlePaths(path string) []string {
	path = strings.TrimRight(path, "/")
	return []string{path, path + "/", strings.TrimPrefix(path, "/")}
}

func (s *StorefrontController) Resolve(c *gin.Context) {
	path := strings.TrimRight(c.Query("path"), "/")
	if !strings.HasPrefix(path, "/") || strings.HasPrefix(path, "//") || strings.ContainsAny(path, "\\\r\n") || len(path) > 500 {
		c.Status(http.StatusBadRequest)
		return
	}
	var row models.LegacyRoute
	if e := config.DB.Where("path = ?", path).First(&row).Error; e != nil {
		if errors.Is(e, gorm.ErrRecordNotFound) {
			var redirect models.SEORedirect
			if err := config.DB.Where("old_url = ? AND is_active = ?", path, true).First(&redirect).Error; err == nil {
				if strings.HasPrefix(redirect.NewURL, "/") && !strings.HasPrefix(redirect.NewURL, "//") && !strings.ContainsAny(redirect.NewURL, "\\\r\n") && redirect.NewURL != path {
					storeOK(c, gin.H{"target": redirect.NewURL})
					return
				}
			} else if !errors.Is(err, gorm.ErrRecordNotFound) {
				storeError(c, err)
				return
			}
			var article models.Article
			if err := config.DB.Where("custom_path IN ? AND is_published = ?", storefrontArticlePaths(path), true).First(&article).Error; err == nil {
				target := "/news/" + article.Slug
				if target != path {
					storeOK(c, gin.H{"target": target})
					return
				}
			} else if !errors.Is(err, gorm.ErrRecordNotFound) {
				storeError(c, err)
				return
			}
		}
		storeError(c, e)
		return
	}
	// Resolve against live IDs so a later SKU/slug edit does not strand the
	// verified old URL at the value generated on import day.
	if row.Entity == "product" {
		var product models.Product
		if e := config.DB.Where("is_active = ?", true).First(&product, row.TargetID).Error; e != nil {
			storeError(c, e)
			return
		}
		row.Target = services.BuildProductPublicPath(product.SKU)
	} else if row.Entity == "category" {
		var category models.Category
		if e := config.DB.Where("is_active = ?", true).First(&category, row.TargetID).Error; e != nil {
			storeError(c, e)
			return
		}
		row.Target = "/categories/" + category.Slug
	} else if row.Entity == "article" || row.Entity == "picture" {
		var article models.Article
		if e := config.DB.Where("is_published = ?", true).First(&article, row.TargetID).Error; e != nil {
			storeError(c, e)
			return
		}
		row.Target = "/news/" + article.Slug
	}
	storeOK(c, row)
}
