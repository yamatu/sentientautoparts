package main

import (
	"encoding/json"
	"fanuc-backend/config"
	"fanuc-backend/internal/legacy"
	"fanuc-backend/models"
	"flag"
	"fmt"
	"log"
	"os"
)

func main() {
	input := flag.String("file", "/data/spex_db.sql", "Navicat/YourPHP dump; parsed as data, never executed")
	apply := flag.Bool("apply", false, "write to target database (default is read-only inspection)")
	profile := flag.String("profile", "legacy", "legacy or automotive (English auto A/C catalogue)")
	author := flag.Uint("author-id", 0, "existing administrator ID; default finds first active admin")
	reportPath := flag.String("report", "", "optional JSON report path")
	flag.Parse()
	f, err := os.Open(*input)
	if err != nil {
		log.Fatal(err)
	}
	defer f.Close()
	d, err := legacy.Parse(f)
	if err != nil {
		log.Fatal(err)
	}
	if *profile != "legacy" && *profile != "automotive" {
		log.Fatal("Unknown import profile")
	}
	opts := legacy.ImportOptions{Automotive: *profile == "automotive"}
	report := legacy.Inspect(d)
	if opts.Automotive {
		report.Source = "yourphp-automotive-20260131"
	}
	if *apply {
		// Initialization belongs to the backend. Import must not re-seed or race migrations.
		os.Setenv("SEED_DEFAULT_CONTENT", "false")
		os.Setenv("SEED_DEFAULT_ADMIN", "false")
		os.Setenv("DB_AUTO_MIGRATE", "false")
		os.Setenv("GO_ENV", "production")
		config.ConnectDatabase()
		if *author == 0 {
			var a models.AdminUser
			if err = config.DB.Where("role = ? AND is_active = ?", "admin", true).Order("id ASC").First(&a).Error; err != nil {
				log.Fatal("Create an administrator before import: ", err)
			}
			*author = a.ID
		}
		report, err = legacy.ImportWithOptions(config.DB, d, *author, opts)
		if err != nil {
			log.Fatal("Import rolled back: ", err)
		}
	}
	b, _ := json.MarshalIndent(report, "", "  ")
	fmt.Println(string(b))
	if *reportPath != "" {
		if err = os.WriteFile(*reportPath, b, 0600); err != nil {
			log.Fatal(err)
		}
	}
}
