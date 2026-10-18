package services

import (
	"errors"
	"strings"

	"fanuc-backend/models"
	"fanuc-backend/utils"

	"gorm.io/gorm"
)

// automotivePartTypeRoots is the complete part-type taxonomy of this catalogue:
// a verified part type maps onto the root category, and the vehicle make (when
// known) becomes its child. Nothing else may create a category level.
var automotivePartTypeRoots = map[string]string{
	"A/C Compressor":  "A/C Compressors",
	"Condenser":       "Auto Condensers",
	"Evaporator Unit": "Evaporator Units",
	"Expansion Valve": "Expansion Valves",
}

// AutomotivePartTypeCategoryName maps a part type onto its root category name.
// It accepts the singular display value as well as the plural category name.
func AutomotivePartTypeCategoryName(partType string) string {
	partType = strings.TrimSpace(partType)
	if partType == "" {
		return ""
	}
	if name, ok := automotivePartTypeRoots[partType]; ok {
		return name
	}
	for singular, plural := range automotivePartTypeRoots {
		if CategoryNameKey(plural) == CategoryNameKey(partType) || CategoryNameKey(singular) == CategoryNameKey(partType) {
			return plural
		}
	}
	return ""
}

// CanonicalAutomotivePartType maps any spelling of a catalogue part type onto the
// display value stored on the product ("a/c compressors" -> "A/C Compressor").
// Unrecognised text is returned unchanged: it stays a hint and is never merged.
func CanonicalAutomotivePartType(value string) string {
	value = strings.TrimSpace(value)
	if value == "" {
		return ""
	}
	root := AutomotivePartTypeCategoryName(value)
	if root == "" {
		return value
	}
	for partType, candidate := range automotivePartTypeRoots {
		if candidate == root {
			return partType
		}
	}
	return value
}

// AutomotivePartTypeOptions lists "PartType -> root category" pairs for prompts.
func AutomotivePartTypeOptions() string {
	order := []string{"A/C Compressor", "Condenser", "Evaporator Unit", "Expansion Valve"}
	lines := make([]string, 0, len(order))
	for _, partType := range order {
		lines = append(lines, partType+" -> "+automotivePartTypeRoots[partType])
	}
	return strings.Join(lines, "; ")
}

// FallbackAutomotiveCategoryPath builds a [part type, vehicle make] path without
// AI. Only verified values are used; a free-text category is accepted when it
// names a known part type, and unknown vehicle makes are dropped rather than
// invented, because the root category alone is a valid placement.
func FallbackAutomotiveCategoryPath(partType, vehicleMake, categoryText string) []string {
	root := AutomotivePartTypeCategoryName(partType)
	if root == "" {
		for _, segment := range SplitListingCategoryText(categoryText) {
			if name := AutomotivePartTypeCategoryName(segment); name != "" {
				root = name
				break
			}
		}
	}
	if root == "" {
		return []string{}
	}
	path := []string{root}
	if make_ := strings.TrimSpace(vehicleMake); make_ != "" && CategoryNameKey(make_) != CategoryNameKey(root) {
		path = append(path, SanitizeCategoryPath([]string{make_})...)
	}
	return SanitizeCategoryPath(path)
}

// AutomotiveVehicleMakeFromPath returns the vehicle-make level of a
// [part type, vehicle make] path, and whether the path is automotive-shaped.
func AutomotiveVehicleMakeFromPath(path []string) (string, bool) {
	if len(path) < 2 {
		return "", len(path) == 1 && AutomotivePartTypeCategoryName(path[0]) != ""
	}
	if AutomotivePartTypeCategoryName(path[0]) == "" {
		return "", false
	}
	return path[1], true
}

// ResolveAutomotiveListingCategory maps a [part type, vehicle make] path onto the
// automotive taxonomy. Only the vehicle-make level may be created: the part-type
// roots are a fixed, administrator-owned set, so a path whose root does not
// match an existing root is reported instead of minting a new top level.
func ResolveAutomotiveListingCategory(db *gorm.DB, path []string, existingID uint, create bool) (CategoryPathResolution, error) {
	path = SanitizeCategoryPath(path)
	empty := CategoryPathResolution{Path: []string{}, Existing: []string{}, Missing: []string{}}
	if len(path) == 0 {
		return empty, errors.New("没有可用的分类路径 / no category path was supplied")
	}
	rootName := AutomotivePartTypeCategoryName(path[0])
	if rootName == "" {
		return empty, errors.New("分类必须以配件类型开头（" + AutomotivePartTypeOptions() + "） / the path must start with a catalogue part type")
	}
	if existingID > 0 {
		var category models.Category
		if err := db.Select("id", "name", "is_active").First(&category, existingID).Error; err == nil && category.IsActive {
			if names := CategoryPathNames(db, category.ID); len(names) > 0 && CategoryNameKey(names[0]) == CategoryNameKey(rootName) {
				return CategoryPathResolution{CategoryID: category.ID, Path: names, Existing: names, Missing: []string{}}, nil
			}
		}
	}
	var categories []models.Category
	if err := db.Select("id", "name", "slug", "parent_id", "is_active").Order("id ASC").Find(&categories).Error; err != nil {
		return empty, err
	}
	var root *models.Category
	for index := range categories {
		category := categories[index]
		if (category.ParentID == nil || *category.ParentID == 0) && CategoryNameKey(category.Name) == CategoryNameKey(rootName) {
			root = &categories[index]
			break
		}
	}
	if root == nil {
		result := empty
		result.Path = []string{rootName}
		result.Missing = []string{rootName}
		return result, errors.New("一级分类不存在：" + rootName + " / the part-type category does not exist")
	}
	resolution := CategoryPathResolution{CategoryID: root.ID, Path: []string{root.Name}, Existing: []string{root.Name}, Missing: []string{}}
	if len(path) == 1 || CategoryNameKey(path[1]) == CategoryNameKey(root.Name) {
		return resolution, nil
	}
	makeName := truncateListingText(path[1], 100)
	findChild := func() *models.Category {
		for index := range categories {
			category := categories[index]
			if category.ParentID != nil && *category.ParentID == root.ID && CategoryNameKey(category.Name) == CategoryNameKey(makeName) {
				return &categories[index]
			}
		}
		return nil
	}
	if child := findChild(); child != nil {
		if create && !child.IsActive {
			if err := db.Model(&models.Category{}).Where("id = ?", child.ID).Update("is_active", true).Error; err != nil {
				return empty, err
			}
		}
		resolution.CategoryID = child.ID
		resolution.Path = append(resolution.Path, child.Name)
		resolution.Existing = append(resolution.Existing, child.Name)
		return resolution, nil
	}
	resolution.Path = append(resolution.Path, makeName)
	if !create {
		resolution.Missing = []string{makeName}
		return resolution, nil
	}
	var created models.Category
	err := withCategoryCreationLock(func() error {
		return db.Transaction(func(tx *gorm.DB) error {
			if existing := findChild(); existing != nil {
				created = *existing
				return nil
			}
			slug, err := uniqueCategorySlug(tx, utils.GenerateSlug(strings.Join([]string{root.Name, makeName}, " ")))
			if err != nil {
				return err
			}
			parentID := root.ID
			created = models.Category{Name: makeName, Slug: slug, Description: root.Name + " " + makeName, ParentID: &parentID, IsActive: true}
			return tx.Create(&created).Error
		})
	})
	if err != nil {
		return empty, err
	}
	resolution.CategoryID = created.ID
	resolution.Path = []string{root.Name, created.Name}
	resolution.Existing = append(resolution.Existing, created.Name)
	resolution.Missing = []string{}
	resolution.Created = created.Name == makeName
	return resolution, nil
}
