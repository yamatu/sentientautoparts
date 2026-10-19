package controllers

import (
	"encoding/json"
	"net/http"
	"sort"

	"fanuc-backend/config"
	"fanuc-backend/models"
	"fanuc-backend/services"
	"github.com/gin-gonic/gin"
)

type StorefrontSettingController struct{}

func (s *StorefrontSettingController) Get(c *gin.Context) {
	setting, err := services.GetStorefrontSetting(config.DB)
	if err != nil {
		storeError(c, err)
		return
	}
	storeOK(c, setting)
}
func (s *StorefrontSettingController) Update(c *gin.Context) {
	var patch map[string]any
	if err := c.ShouldBindJSON(&patch); err != nil {
		c.JSON(400, models.APIResponse{Success: false, Message: "Invalid storefront settings"})
		return
	}
	setting, err := services.PatchStorefrontSetting(config.DB, patch)
	if err != nil {
		c.JSON(400, models.APIResponse{Success: false, Message: err.Error()})
		return
	}
	services.InvalidatePublicCaches(c.Request.Context(), "storefront-settings:update", []string{"/", "/about", "/contact_us", "/download"})
	services.TriggerNextRevalidate(nil, []string{"/", "/about", "/contact_us", "/download"}, false)
	// Header/footer settings are rendered on every ISR-cached storefront page.
	services.TriggerNextRevalidateTags([]string{"storefront-settings"})
	storeOK(c, setting)
}
func (s *StorefrontController) Settings(c *gin.Context) {
	setting, err := services.GetStorefrontSetting(config.DB)
	if err != nil {
		storeError(c, err)
		return
	}
	// Read live models, not the older cached social API. Saved/cleared links are
	// visible to SSR on the next request without touching credentials.
	var social models.SocialMediaSetting
	if err := config.DB.Where("id = ?", 1).Find(&social).Error; err != nil {
		storeError(c, err)
		return
	}
	storeOK(c, gin.H{"site": setting, "social": social})
}

func mergeB2BHomepage(stored []models.HomepageContent) []models.HomepageContent {
	keyed := map[string]models.HomepageContent{}
	for _, row := range models.B2BHomepageDefaults() {
		keyed[row.SectionKey] = row
	}
	for _, row := range stored {
		if models.IsB2BHomepageKey(row.SectionKey) {
			keyed[row.SectionKey] = row
		}
	}
	result := make([]models.HomepageContent, 0, len(keyed))
	for _, row := range keyed {
		result = append(result, row)
	}
	sort.Slice(result, func(i, j int) bool {
		if result[i].SortOrder == result[j].SortOrder {
			return result[i].SectionKey < result[j].SectionKey
		}
		return result[i].SortOrder < result[j].SortOrder
	})
	return result
}

type homepageProductOptions struct {
	Limit int    `json:"limit"`
	Mode  string `json:"mode"`
}

func (s *StorefrontSettingController) HomepageAdmin(c *gin.Context) {
	var stored []models.HomepageContent
	if err := config.DB.Order("sort_order,id").Find(&stored).Error; err != nil {
		storeError(c, err)
		return
	}
	storeOK(c, gin.H{"sections": mergeB2BHomepage(stored), "stored": stored})
}

func (s *StorefrontController) B2BHome(c *gin.Context) {
	var stored []models.HomepageContent
	if err := config.DB.Order("sort_order,id").Find(&stored).Error; err != nil {
		storeError(c, err)
		return
	}
	sections := mergeB2BHomepage(stored)
	for i, row := range sections {
		if !row.IsActive {
			sections[i] = models.HomepageContent{SectionKey: row.SectionKey, SortOrder: row.SortOrder, IsActive: false}
		}
	}
	result := gin.H{"sections": sections, "banners": []models.Banner{}, "products": []models.Product{}, "articles": []models.Article{}}
	for _, section := range sections {
		if !section.IsActive {
			continue
		}
		switch section.SectionKey {
		case "home_banners":
			var rows []models.Banner
			if err := config.DB.Where("is_active = ? AND position = ? AND (start_date IS NULL OR start_date <= NOW()) AND (end_date IS NULL OR end_date >= NOW())", true, "home").Order("sort_order,id").Find(&rows).Error; err != nil {
				storeError(c, err)
				return
			}
			result["banners"] = rows
		case "featured_products":
			opts := homepageProductOptions{Limit: 8, Mode: "latest"}
			_ = json.Unmarshal(section.Data, &opts)
			if opts.Limit < 1 || opts.Limit > 24 {
				opts.Limit = 8
			}
			query := config.DB.Where("is_active = ?", true)
			if opts.Mode == "featured" {
				query = query.Where("is_featured = ?", true)
			}
			var rows []models.Product
			if err := query.Omit("description").Preload("Category").Preload("Images").Order("id DESC").Limit(opts.Limit).Find(&rows).Error; err != nil {
				storeError(c, err)
				return
			}
			result["products"] = rows
		case "home_news":
			opts := homepageProductOptions{Limit: 3}
			_ = json.Unmarshal(section.Data, &opts)
			if opts.Limit < 1 || opts.Limit > 12 {
				opts.Limit = 3
			}
			var rows []models.Article
			if err := config.DB.Omit("content").Where("is_published = ?", true).Order("id DESC").Limit(opts.Limit).Find(&rows).Error; err != nil {
				storeError(c, err)
				return
			}
			result["articles"] = rows
		}
	}
	c.Header("Cache-Control", "no-store")
	c.JSON(http.StatusOK, models.APIResponse{Success: true, Data: result})
}
