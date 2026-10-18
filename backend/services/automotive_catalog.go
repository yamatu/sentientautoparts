package services

import (
	"context"
	"errors"
	"os"
	"strings"
	"time"

	"fanuc-backend/models"
	"gorm.io/gorm"
)

func AutomotiveMode() bool { return os.Getenv("CATALOG_DOMAIN") == "automotive" }

// ResolveAutomotiveCategory uses the edited part type + explicit vehicle make.
// Manufacturer-brand inference and industrial model patterns are never used.
func ResolveAutomotiveCategory(db *gorm.DB, product models.Product) (uint, error) {
	rootName := AutomotivePartTypeCategoryName(product.PartType)
	if rootName == "" {
		return 0, errors.New("verify the automotive part type before category optimization")
	}
	var categories []models.Category
	if err := db.Where("is_active = ?", true).Find(&categories).Error; err != nil {
		return 0, err
	}
	byID := map[uint]models.Category{}
	var root uint
	for _, c := range categories {
		byID[c.ID] = c
		if c.ParentID == nil && strings.EqualFold(c.Name, rootName) {
			root = c.ID
		}
	}
	if root == 0 {
		return 0, errors.New("no active automotive part-type category matches the record")
	}
	if product.VehicleMake != "" {
		for _, c := range categories {
			if c.ParentID != nil && *c.ParentID == root && strings.EqualFold(c.Name, product.VehicleMake) {
				return c.ID, nil
			}
		}
	}
	seen := map[uint]bool{}
	for id := product.CategoryID; id != 0 && !seen[id]; {
		if id == root {
			return product.CategoryID, nil
		}
		seen[id] = true
		c, ok := byID[id]
		if !ok || c.ParentID == nil {
			break
		}
		id = *c.ParentID
	}
	return root, nil
}
func optimizeAutomotiveCategory(ctx context.Context, db *gorm.DB, p models.Product, opts ProductCategoryOptimizationOptions) ProductCategoryOptimizationResult {
	result := ProductCategoryOptimizationResult{ProductID: p.ID, SKU: p.SKU, Brand: p.Brand, Model: p.Model, PartType: p.PartType, Status: "failed", MatchRule: "automotive_catalog_fields"}
	if db == nil {
		result.Message = "database is nil"
		return result
	}
	id, err := ResolveAutomotiveCategory(db, p)
	if err != nil {
		result.Status = "unresolved"
		result.Message = err.Error() + "; publication state preserved"
		return result
	}
	err = db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if opts.BeforeWrite != nil {
			if e := opts.BeforeWrite(tx); e != nil {
				return e
			}
		}
		var current models.Product
		if e := tx.First(&current, p.ID).Error; e != nil {
			return e
		}
		target, e := ResolveAutomotiveCategory(tx, current)
		if e != nil {
			return e
		}
		if target != id {
			return errors.New("automotive product changed while category was being resolved")
		}
		// An explicit category repair does not publish a draft or hide an active part.
		return tx.Model(&models.Product{}).Where("id = ?", p.ID).Updates(map[string]any{"category_id": id, "updated_at": time.Now()}).Error
	})
	if err != nil {
		result.Message = err.Error()
		return result
	}
	result.CategoryID = id
	result.Status = "completed"
	result.Message = "Automotive part-type / vehicle-make category verified"
	_ = writeClassificationAudit(db, p, result, opts.AuditJobID)
	return result
}

func BuildAutomotiveSEO(p *models.Product) EnrichedProduct {
	if p == nil {
		return EnrichedProduct{}
	}
	name := strings.TrimSpace(p.Name)
	if name == "" {
		name = strings.TrimSpace(p.PartType + " " + p.Model)
	}
	description := strings.TrimSpace(p.ShortDescription)
	if description == "" {
		description = name + ". Check OE references and vehicle fitment before ordering. Contact sentientautoparts for a quotation."
	}
	return EnrichedProduct{Name: name, PartType: p.PartType, MetaTitle: BuildSafeMetaTitle(name+" | sentientautoparts", name), MetaDescription: BuildSafeMetaDescription(description), MetaKeywords: strings.Join(filterNonEmpty([]string{p.PartNumber, p.Model, p.VehicleMake, p.PartType, "automotive air conditioning parts", "sentientautoparts"}), ", "), ShortDescription: description, Description: description}
}
