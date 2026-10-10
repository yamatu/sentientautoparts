package legacy

import (
	"strings"
	"testing"
)

func TestParseQuotedData(t *testing.T) {
	dump := "CREATE TABLE `mqu_product` (\n `id` int,\n `title` text,\n `content` text\n) ENGINE=MyISAM;\nINSERT INTO `mqu_product` VALUES (1, 'a, b; \\'quoted\\'', '<p>line\\nnext -- not a comment</p>'),(2, 'O''Brien', NULL);"
	d, e := Parse(strings.NewReader(dump))
	if e != nil {
		t.Fatal(e)
	}
	if len(d["mqu_product"]) != 2 || d["mqu_product"][0]["title"] != "a, b; 'quoted'" || d["mqu_product"][1]["title"] != "O'Brien" {
		t.Fatalf("unexpected data: %#v", d)
	}
	if !strings.Contains(d["mqu_product"][0]["content"], "\nnext -- not a comment") {
		t.Fatal("escape or comment corrupted")
	}
}
func TestMultipleTables(t *testing.T) {
	s := "CREATE TABLE `a` (\n`id` int\n) ENGINE=MyISAM;CREATE TABLE `b` (\n`id` int,\n`name` text\n) ENGINE=MyISAM;INSERT INTO `a` VALUES(1);INSERT INTO `b` VALUES(2,'two');"
	d, e := Parse(strings.NewReader(s))
	if e != nil {
		t.Fatal(e)
	}
	if d["a"][0]["id"] != "1" || d["b"][0]["name"] != "two" {
		t.Fatal(d)
	}
}
func TestRejectMalformed(t *testing.T) {
	for _, s := range []string{"INSERT INTO `x` VALUES (1);", "INSERT INTO `x` VALUES ('oops)", "INSERT INTO `x` (id) VALUES (1);"} {
		if _, e := Parse(strings.NewReader(s)); e == nil {
			t.Fatal("accepted", s)
		}
	}
}
func TestRoutesAndImages(t *testing.T) {
	for _, s := range []string{"//.html", "https://evil.test/x", "/../admin", "/x?token=x", "/x\\y", "/"} {
		if ValidPath(s) {
			t.Fatal("unsafe route", s)
		}
	}
	if !ValidPath("/products/steel_pipe/show/1.html") {
		t.Fatal("valid path rejected")
	}
	got := Images(Row{"thumb": "/Uploads/a.jpg", "pics": "/Uploads/a.jpg|a:::/Apps/Tpl/Home/Default/Public/images/b.jpg|b"})
	if len(got) != 2 || got[0] != "/legacy/uploads/a.jpg" || got[1] != "/legacy/theme/images/b.jpg" {
		t.Fatal(got)
	}
}
