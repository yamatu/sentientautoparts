// Package migrations exposes data patches that are applied once at startup.
package migrations

import (
	_ "embed"
	"strings"
)

//go:embed 20261012_storefront_logo_and_contact.sql
var storefrontLogoAndContact string

type Patch struct {
	Name       string
	Statements []string
}

// Statements are split on a terminating ";" at end of line, so semicolons
// inside values (e.g. "&amp;") are left intact.
func split(sql string) []string {
	var out []string
	for _, chunk := range strings.Split(strings.ReplaceAll(sql, "\r\n", "\n"), ";\n") {
		var lines []string
		for _, line := range strings.Split(chunk, "\n") {
			if !strings.HasPrefix(strings.TrimSpace(line), "--") {
				lines = append(lines, line)
			}
		}
		if stmt := strings.TrimSpace(strings.TrimSuffix(strings.TrimSpace(strings.Join(lines, "\n")), ";")); stmt != "" {
			out = append(out, stmt)
		}
	}
	return out
}

func DataPatches() []Patch {
	return []Patch{{Name: "20261012_storefront_logo_and_contact", Statements: split(storefrontLogoAndContact)}}
}
