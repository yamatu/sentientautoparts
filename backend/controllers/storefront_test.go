package controllers

import (
	"slices"
	"testing"
)

func TestStorefrontMatchesAdminArticlePathConvention(t *testing.T) {
	for _, path := range []string{"/news/custom", "/categories/alias", "/products/alias", "/guides/cnc/article"} {
		variants := storefrontArticlePaths(path + "/")
		if !slices.Contains(variants, normalizeCustomPath(path)) {
			t.Fatalf("admin stored path %q missing from %v", normalizeCustomPath(path), variants)
		}
		if !slices.Contains(variants, path) || !slices.Contains(variants, path+"/") {
			t.Fatalf("imported path convention lost: %v", variants)
		}
	}
}
