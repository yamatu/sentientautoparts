package services

import (
	"strings"
	"testing"
)

func TestProductPathsAreReversibleAndCollisionFree(t *testing.T) {
	seen := map[string]string{}
	for _, sku := range []string{"LEGACY-35", "ABC-123", "ABC/123", "ABC 123", "ABC\\123", "A97L-0001-0077#AN08-J", "~QUJD", "ABC+123", "中文型号", ".", ".."} {
		path := BuildProductPublicPath(sku)
		if previous, found := seen[path]; found {
			t.Fatalf("%q and %q collide at %q", sku, previous, path)
		}
		seen[path] = sku
		id := strings.TrimPrefix(path, "/products/")
		if strings.ContainsAny(id, "/\\?#% ") {
			t.Fatalf("unsafe path: %s", path)
		}
		got, err := DecodeProductPathID(id)
		if err != nil || got != sku {
			t.Fatalf("%q round trip: got %q, %v", sku, got, err)
		}
	}
	if got := BuildProductPublicPath("LEGACY-35"); got != "/products/LEGACY-35" {
		t.Fatalf("legacy canonical changed: %s", got)
	}
	if _, err := DecodeProductPathID("~?"); err == nil {
		t.Fatal("invalid path accepted")
	}
}
