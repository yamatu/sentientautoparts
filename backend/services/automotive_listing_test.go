package services

import (
	"reflect"
	"strings"
	"testing"
)

// The part-type roots are the only categories the AI is not allowed to create,
// so the mapping from part type to root name must stay exact and reversible.
func TestAutomotivePartTypeCategoryNameMapsRoots(t *testing.T) {
	cases := map[string]string{
		"A/C Compressor":   "A/C Compressors",
		"a/c compressors":  "A/C Compressors",
		" Condenser ":      "Auto Condensers",
		"AUTO CONDENSERS":  "Auto Condensers",
		"Evaporator Unit":  "Evaporator Units",
		"Expansion Valve":  "Expansion Valves",
		"expansion valves": "Expansion Valves",
		"Toyota":           "",
		"Compressor Parts": "",
		"":                 "",
	}
	for input, want := range cases {
		if got := AutomotivePartTypeCategoryName(input); got != want {
			t.Fatalf("AutomotivePartTypeCategoryName(%q) = %q, want %q", input, got, want)
		}
	}
}

func TestAutomotivePartTypeOptionsListsEveryRoot(t *testing.T) {
	options := AutomotivePartTypeOptions()
	for partType, root := range automotivePartTypeRoots {
		if !strings.Contains(options, partType+" -> "+root) {
			t.Fatalf("AutomotivePartTypeOptions() is missing %q -> %q: %s", partType, root, options)
		}
	}
}

func TestFallbackAutomotiveCategoryPathNeverInvents(t *testing.T) {
	if got, want := FallbackAutomotiveCategoryPath("A/C Compressor", "Toyota", ""), []string{"A/C Compressors", "Toyota"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("known part type got %v, want %v", got, want)
	}
	// A free-text category naming a known part type is accepted; an unknown
	// vehicle make is dropped because the root alone is a valid placement.
	if got, want := FallbackAutomotiveCategoryPath("", "", "Auto Condensers"), []string{"Auto Condensers"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("category text got %v, want %v", got, want)
	}
	if got, want := FallbackAutomotiveCategoryPath("", "Toyota", "Automotive Parts"), []string{}; !reflect.DeepEqual(got, want) {
		t.Fatalf("unknown part type got %v, want %v", got, want)
	}
	// The vehicle make may never be repeated as a second level.
	if got, want := FallbackAutomotiveCategoryPath("Condenser", "Auto Condensers", ""), []string{"Auto Condensers"}; !reflect.DeepEqual(got, want) {
		t.Fatalf("repeated make got %v, want %v", got, want)
	}
}

func TestAutomotiveVehicleMakeFromPath(t *testing.T) {
	if make_, ok := AutomotiveVehicleMakeFromPath([]string{"A/C Compressors", "Toyota"}); !ok || make_ != "Toyota" {
		t.Fatalf("got (%q, %v), want (Toyota, true)", make_, ok)
	}
	if make_, ok := AutomotiveVehicleMakeFromPath([]string{"A/C Compressors"}); !ok || make_ != "" {
		t.Fatalf("part-type-only path got (%q, %v), want (, true)", make_, ok)
	}
	if make_, ok := AutomotiveVehicleMakeFromPath([]string{"Fanuc", "Drive"}); ok || make_ != "" {
		t.Fatalf("industrial path got (%q, %v), want (, false)", make_, ok)
	}
}

func TestCanonicalAutomotivePartTypeFoldsKnownSpellings(t *testing.T) {
	cases := map[string]string{
		"a/c compressors":  "A/C Compressor",
		"A/C Compressor":   "A/C Compressor",
		"Auto Condensers":  "Condenser",
		"evaporator unit":  "Evaporator Unit",
		"Expansion Valves": "Expansion Valve",
		"Drive Module":     "Drive Module",
		"":                 "",
	}
	for input, want := range cases {
		if got := CanonicalAutomotivePartType(input); got != want {
			t.Fatalf("CanonicalAutomotivePartType(%q) = %q, want %q", input, got, want)
		}
	}
}
