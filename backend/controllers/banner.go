package controllers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"fanuc-backend/config"
	"fanuc-backend/models"
	"fanuc-backend/services"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type BannerController struct{}

func (bc *BannerController) GetBanners(c *gin.Context) {
	var rows []models.Banner
	q := config.DB.Model(&models.Banner{})
	if v := c.Query("is_active"); v == "true" || v == "false" {
		q = q.Where("is_active = ?", v == "true")
	}
	if err := q.Order("sort_order,id").Find(&rows).Error; err != nil {
		storeError(c, err)
		return
	}
	storeOK(c, rows)
}
func (bc *BannerController) GetPublicBanners(c *gin.Context) {
	var rows []models.Banner
	q := config.DB.Where("is_active = ? AND (start_date IS NULL OR start_date <= NOW()) AND (end_date IS NULL OR end_date >= NOW())", true)
	if v := c.Query("content_type"); v != "" {
		q = q.Where("content_type = ?", v)
	}
	if err := q.Order("sort_order,id").Find(&rows).Error; err != nil {
		storeError(c, err)
		return
	}
	storeOK(c, rows)
}
func loadBanner(c *gin.Context) (*models.Banner, bool) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil || id == 0 {
		c.JSON(400, gin.H{"error": "Invalid banner ID"})
		return nil, false
	}
	var row models.Banner
	if err := config.DB.First(&row, id).Error; err != nil {
		storeError(c, err)
		return nil, false
	}
	return &row, true
}
func (bc *BannerController) GetBanner(c *gin.Context) {
	row, ok := loadBanner(c)
	if ok {
		storeOK(c, row)
	}
}

// JSON patch retains omitted fields and allows explicit null dates/blank links.
func patchBanner(row *models.Banner, patch map[string]json.RawMessage) error {
	for key, raw := range patch {
		var target any
		switch key {
		case "title":
			target = &row.Title
		case "subtitle":
			target = &row.Subtitle
		case "description":
			target = &row.Description
		case "image_url":
			target = &row.ImageURL
		case "link_url":
			target = &row.LinkURL
		case "link_text":
			target = &row.LinkText
		case "position":
			target = &row.Position
		case "content_type":
			target = &row.ContentType
		case "category_key":
			target = &row.CategoryKey
		case "sort_order":
			target = &row.SortOrder
		case "is_active":
			target = &row.IsActive
		case "start_date":
			target = &row.StartDate
		case "end_date":
			target = &row.EndDate
		default:
			continue
		}
		if err := json.Unmarshal(raw, target); err != nil {
			return err
		}
	}
	row.Title = strings.TrimSpace(row.Title)
	row.ImageURL = strings.TrimSpace(row.ImageURL)
	row.LinkURL = strings.TrimSpace(row.LinkURL)
	return services.ValidateBanner(*row)
}
func (bc *BannerController) CreateBanner(c *gin.Context) {
	var patch map[string]json.RawMessage
	if c.ShouldBindJSON(&patch) != nil {
		c.JSON(400, gin.H{"error": "Invalid banner"})
		return
	}
	row := models.Banner{Position: "home", ContentType: "hero", IsActive: false}
	if err := patchBanner(&row, patch); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	active := row.IsActive
	if err := config.DB.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&row).Error; err != nil {
			return err
		}
		return tx.Model(&row).Update("is_active", active).Error
	}); err != nil {
		storeError(c, err)
		return
	}
	row.IsActive = active
	invalidateHomepageCaches(c.Request.Context(), "banner:create")
	c.JSON(http.StatusCreated, models.APIResponse{Success: true, Data: row})
}
func (bc *BannerController) UpdateBanner(c *gin.Context) {
	row, ok := loadBanner(c)
	if !ok {
		return
	}
	var patch map[string]json.RawMessage
	if c.ShouldBindJSON(&patch) != nil {
		c.JSON(400, gin.H{"error": "Invalid banner"})
		return
	}
	if err := patchBanner(row, patch); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}
	if err := config.DB.Save(row).Error; err != nil {
		storeError(c, err)
		return
	}
	invalidateHomepageCaches(c.Request.Context(), "banner:update")
	storeOK(c, row)
}
func (bc *BannerController) DeleteBanner(c *gin.Context) {
	row, ok := loadBanner(c)
	if !ok {
		return
	}
	if err := config.DB.Delete(row).Error; err != nil {
		storeError(c, err)
		return
	}
	invalidateHomepageCaches(c.Request.Context(), "banner:delete")
	storeOK(c, nil)
}
func (bc *BannerController) UpdateBannerOrder(c *gin.Context) {
	row, ok := loadBanner(c)
	if !ok {
		return
	}
	var req struct {
		SortOrder *int `json:"sort_order"`
	}
	if c.ShouldBindJSON(&req) != nil || req.SortOrder == nil || *req.SortOrder < -10000 || *req.SortOrder > 10000 {
		c.JSON(400, gin.H{"error": "Invalid sort order"})
		return
	}
	if err := config.DB.Model(row).Updates(map[string]any{"sort_order": *req.SortOrder, "updated_at": time.Now()}).Error; err != nil {
		storeError(c, err)
		return
	}
	invalidateHomepageCaches(c.Request.Context(), "banner:order")
	storeOK(c, nil)
}
