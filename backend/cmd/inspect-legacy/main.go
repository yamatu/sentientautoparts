// inspect-legacy reports only content tables; it never executes SQL or outputs
// source account/config tables. Intended for migration mapping review.
package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"sort"
	"strings"

	"fanuc-backend/internal/legacy"
)

func main() {
	file := flag.String("file", "../data/automotive-20260131.sql", "content-only dump")
	flag.Parse()
	f, err := os.Open(*file)
	if err != nil {
		log.Fatal(err)
	}
	defer f.Close()
	dump, err := legacy.Parse(f)
	if err != nil {
		log.Fatal(err)
	}
	fieldCounts := map[string]int{}
	categoryCounts := map[string]int{}
	languages := map[string]int{}
	samples := []legacy.Row{}
	seen := map[string]bool{}
	for _, row := range dump["mqu_product"] {
		categoryCounts[row["catid"]]++
		languages[row["lang"]]++
		for key, value := range row {
			if strings.TrimSpace(value) != "" && value != "0" {
				fieldCounts[key]++
			}
		}
		if !seen[row["catid"]] || len(samples) < 4 {
			sample := legacy.Row{}
			for _, key := range []string{"id", "catid", "title", "description", "content", "xinghao", "feature", "yingyong", "canshu", "color", "shuomingshu", "thumb", "pics", "url", "manual", "introduction", "protel", "lang", "status", "videolink"} {
				value := row[key]
				if len(value) > 6000 {
					value = value[:6000]
				}
				sample[key] = value
			}
			samples = append(samples, sample)
			seen[row["catid"]] = true
		}
	}
	categories := []legacy.Row{}
	for _, row := range dump["mqu_category"] {
		out := legacy.Row{}
		for _, key := range []string{"id", "parentid", "catname", "catdir", "module", "url", "lang", "image", "title", "description", "ismenu", "listorder"} {
			out[key] = row[key]
		}
		categories = append(categories, out)
	}
	sort.Slice(categories, func(i, j int) bool { return categories[i]["id"] < categories[j]["id"] })
	blocks := []legacy.Row{}
	for _, row := range dump["mqu_block"] {
		out := legacy.Row{}
		for _, key := range []string{"id", "pos", "title", "name", "lang", "content", "image1", "link"} {
			v := row[key]
			if len(v) > 6000 {
				v = v[:6000]
			}
			out[key] = v
		}
		blocks = append(blocks, out)
	}
	pages := []legacy.Row{}
	for _, row := range dump["mqu_page"] {
		pages = append(pages, legacy.Row{"id": row["id"], "title": row["title"]})
	}
	report := map[string]any{"summary": legacy.Inspect(dump), "automotive_audit": legacy.AuditAutomotive(dump), "product_field_counts": fieldCounts, "category_product_counts": categoryCounts, "languages": languages, "samples": samples, "categories": categories, "blocks": blocks, "pages": pages}
	data, _ := json.MarshalIndent(report, "", "  ")
	fmt.Println(string(data))
}
