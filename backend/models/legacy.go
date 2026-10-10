package models

import "time"

// LegacyImport is an idempotency ledger, not a second content store. The live
// products/articles/pages remain editable through the original Vibocnc admin.
type LegacyImport struct {
	ID         uint      `json:"id" gorm:"primaryKey"`
	Source     string    `json:"source" gorm:"size:50;uniqueIndex:legacy_identity"`
	Entity     string    `json:"entity" gorm:"size:30;uniqueIndex:legacy_identity"`
	LegacyID   uint      `json:"legacy_id" gorm:"uniqueIndex:legacy_identity"`
	TargetID   uint      `json:"target_id"`
	SourceHash string    `json:"source_hash" gorm:"size:64"`
	Payload    string    `json:"-" gorm:"type:longtext"`
	CreatedAt  time.Time `json:"created_at"`
}

// LegacyRoute stores explicit, verified old paths. Never guess ambiguous URLs
// such as //.html found in old exports; those are reported by the importer.
type LegacyRoute struct {
	ID        uint      `json:"id" gorm:"primaryKey"`
	Path      string    `json:"path" gorm:"size:500;uniqueIndex"`
	Target    string    `json:"target" gorm:"size:500;not null"`
	Entity    string    `json:"entity" gorm:"size:30"`
	TargetID  uint      `json:"target_id"`
	CreatedAt time.Time `json:"created_at"`
}
