package config

import (
	"log"
	"time"

	"fanuc-backend/migrations"
	"gorm.io/gorm"
)

type schemaPatch struct {
	Name      string    `gorm:"primaryKey;size:191"`
	AppliedAt time.Time `gorm:"not null"`
}

func (schemaPatch) TableName() string { return "schema_patches" }

// applyDataPatches runs each embedded content patch exactly once, so later
// admin edits to the same fields are never overwritten on restart.
func applyDataPatches(db *gorm.DB) {
	if err := db.AutoMigrate(&schemaPatch{}); err != nil {
		log.Printf("data patches skipped: %v", err)
		return
	}
	for _, patch := range migrations.DataPatches() {
		var count int64
		if err := db.Model(&schemaPatch{}).Where("name = ?", patch.Name).Count(&count).Error; err != nil || count > 0 {
			continue
		}
		err := db.Transaction(func(tx *gorm.DB) error {
			for _, stmt := range patch.Statements {
				if err := tx.Exec(stmt).Error; err != nil {
					return err
				}
			}
			return tx.Create(&schemaPatch{Name: patch.Name, AppliedAt: time.Now()}).Error
		})
		if err != nil {
			log.Printf("data patch %s failed: %v", patch.Name, err)
			continue
		}
		log.Printf("data patch %s applied", patch.Name)
	}
}
