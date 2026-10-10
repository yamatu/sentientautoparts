package controllers

import (
	"fanuc-backend/config"
	"fanuc-backend/models"
	"fanuc-backend/services"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Compatibility for older admin URLs; automotive sites have one social store.
func b2bSocialConfig(c *gin.Context) {
	media, err := services.NewSocialMediaSettingService(config.DB).GetOrCreate()
	if err != nil {
		storeError(c, err)
		return
	}
	site, err := services.GetStorefrontSetting(config.DB)
	if err != nil {
		storeError(c, err)
		return
	}
	storeOK(c, gin.H{"id": media.ID, "x_url": media.XURL, "facebook_url": media.FacebookURL, "instagram_url": media.InstagramURL, "linkedin_url": media.LinkedInURL, "show_in_footer": site.SocialFooter})
}
func b2bUpdateSocialConfig(c *gin.Context, req updateSocialLinksRequest) {
	err := config.DB.Transaction(func(tx *gorm.DB) error {
		service := services.NewSocialMediaSettingService(tx)
		old, err := service.GetOrCreate()
		if err != nil {
			return err
		}
		payload := models.SocialMediaSettingRequest{XURL: old.XURL, FacebookURL: old.FacebookURL, InstagramURL: old.InstagramURL, LinkedInURL: old.LinkedInURL}
		if req.XURL != nil {
			payload.XURL = *req.XURL
		}
		if req.FacebookURL != nil {
			payload.FacebookURL = *req.FacebookURL
		}
		if req.InstagramURL != nil {
			payload.InstagramURL = *req.InstagramURL
		}
		if req.LinkedInURL != nil {
			payload.LinkedInURL = *req.LinkedInURL
		}
		if _, err := service.Update(payload); err != nil {
			return err
		}
		if req.ShowInFooter != nil {
			_, err = services.PatchStorefrontSetting(tx, map[string]any{"social_footer": *req.ShowInFooter})
		}
		return err
	})
	if err != nil {
		c.JSON(400, models.APIResponse{Success: false, Message: err.Error()})
		return
	}
	services.InvalidatePublicCaches(c.Request.Context(), "social-links:compat-update", []string{"/"})
	b2bSocialConfig(c)
}
