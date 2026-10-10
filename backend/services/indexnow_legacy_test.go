package services

import (
	"fanuc-backend/models"
	"slices"
	"strings"
	"testing"
)

func TestLegacyIndexNowUsesOnlyPublishedRouteShapes(t *testing.T) {
	t.Setenv("STOREFRONT_THEME", "legacy")
	base := "https://example.com"
	urls := BuildDefaultIndexNowURLs(base)
	for _, expected := range []string{"/", "/products", "/news", "/contact_us", "/sitemap.xml"} {
		if !slices.Contains(urls, base+expected) {
			t.Fatalf("missing %s in %v", expected, urls)
		}
	}
	for _, removed := range []string{"/blog", "/contact", "/repair-request", "/categories"} {
		if slices.Contains(urls, base+removed) {
			t.Fatalf("unpublished URL %s in %v", removed, urls)
		}
	}
	product := models.Product{SKU: "ABC/123", Translations: []models.ProductTranslation{{LanguageCode: "es", Name: "Nombre", Description: "Description"}}}
	productURLs := BuildProductIndexNowURLs(base, product)
	if !slices.Contains(productURLs, base+"/products/~QUJDLzEyMw") {
		t.Fatalf("incorrect canonical: %v", productURLs)
	}
	for _, u := range productURLs {
		if strings.Contains(u, "/es/") {
			t.Fatalf("locale page not published: %s", u)
		}
	}
	article := models.Article{Slug: "article-one", ContentType: "blog", Translations: []models.ArticleTranslation{{LanguageCode: "es", Title: "Titulo", Content: "Contenido"}}}
	articleURLs := BuildArticleIndexNowURLs(base, article, "/custom/old-path")
	want := []string{base + "/news/article-one", base + "/news", base + "/sitemap-news.xml"}
	if !slices.Equal(articleURLs, want) {
		t.Fatalf("got %v, want %v", articleURLs, want)
	}
}
