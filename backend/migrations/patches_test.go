package migrations

import (
	"strings"
	"testing"
)

func TestStorefrontPatchSplitsIntoWholeStatements(t *testing.T) {
	stmts := DataPatches()[0].Statements
	if len(stmts) != 6 {
		t.Fatalf("want 6 statements, got %d", len(stmts))
	}
	for _, s := range stmts {
		if !strings.HasPrefix(s, "UPDATE ") || strings.HasSuffix(s, ";") {
			t.Fatalf("malformed statement: %.80q", s)
		}
	}
	if about := stmts[5]; !strings.Contains(about, "R&amp;D") || !strings.Contains(about, "carton design") {
		t.Fatal("about statement was truncated")
	}
}
