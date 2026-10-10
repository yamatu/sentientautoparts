// Package legacy reads a Navicat/MySQL dump as data. It NEVER executes SQL.
package legacy

import (
	"fmt"
	"io"
	"regexp"
	"strings"
)

type Row map[string]string
type Dump map[string][]Row

var createRE = regexp.MustCompile("(?is)CREATE TABLE\\s+`([a-zA-Z0-9_]+)`\\s*\\((.*?)\\)\\s*ENGINE")
var columnRE = regexp.MustCompile("(?m)^\\s*`([a-zA-Z0-9_]+)`\\s")
var insertRE = regexp.MustCompile("(?is)^\\s*INSERT INTO\\s+`([a-zA-Z0-9_]+)`\\s+VALUES\\s*(.*)$")

// Parse supports quoted delimiters, escaped quotes/backslashes, doubled SQL
// quotes, multiline strings, NULL, and multiple tuples per INSERT. Unsupported
// INSERT shapes fail closed instead of silently producing a partial catalogue.
func Parse(r io.Reader) (Dump, error) {
	data, err := io.ReadAll(io.LimitReader(r, 128<<20+1))
	if err != nil {
		return nil, err
	}
	if len(data) > 128<<20 {
		return nil, fmt.Errorf("dump exceeds 128 MiB")
	}
	text := strings.TrimPrefix(string(data), "\ufeff")
	schema := map[string][]string{}
	for _, m := range createRE.FindAllStringSubmatch(text, -1) {
		for _, c := range columnRE.FindAllStringSubmatch(m[2], -1) {
			schema[m[1]] = append(schema[m[1]], c[1])
		}
	}
	out := Dump{}
	// Statements split only outside quoted strings. Line comments are ignored.
	var stmt strings.Builder
	quoted, comment := false, false
	for i := 0; i < len(text); i++ {
		ch := text[i]
		if comment {
			if ch == '\n' {
				comment = false
				stmt.WriteByte('\n')
			}
			continue
		}
		if !quoted && ch == '-' && i+1 < len(text) && text[i+1] == '-' {
			comment = true
			i++
			continue
		}
		if quoted && ch == '\\' && i+1 < len(text) {
			stmt.WriteByte(ch)
			i++
			stmt.WriteByte(text[i])
			continue
		}
		if ch == '\'' {
			if quoted && i+1 < len(text) && text[i+1] == '\'' {
				stmt.WriteString("''")
				i++
				continue
			}
			quoted = !quoted
		}
		if ch == ';' && !quoted {
			s := strings.TrimSpace(stmt.String())
			stmt.Reset()
			m := insertRE.FindStringSubmatch(s)
			if m == nil {
				if strings.HasPrefix(strings.ToUpper(s), "INSERT INTO") {
					return nil, fmt.Errorf("unsupported INSERT syntax")
				}
				continue
			}
			columns, ok := schema[m[1]]
			if !ok {
				return nil, fmt.Errorf("missing schema for %s", m[1])
			}
			tuples, err := parseTuples(m[2])
			if err != nil {
				return nil, fmt.Errorf("%s: %w", m[1], err)
			}
			for _, values := range tuples {
				if len(values) != len(columns) {
					return nil, fmt.Errorf("%s: %d values for %d columns", m[1], len(values), len(columns))
				}
				row := Row{}
				for j, c := range columns {
					row[c] = values[j]
				}
				out[m[1]] = append(out[m[1]], row)
			}
		} else {
			stmt.WriteByte(ch)
		}
	}
	if quoted {
		return nil, fmt.Errorf("unterminated SQL string")
	}
	if strings.Contains(strings.ToUpper(stmt.String()), "INSERT INTO") {
		return nil, fmt.Errorf("unterminated INSERT")
	}
	return out, nil
}

func parseTuples(s string) ([][]string, error) {
	var result [][]string
	for i := 0; i < len(s); {
		for i < len(s) && (s[i] == ' ' || s[i] == '\n' || s[i] == '\r' || s[i] == ',' || s[i] == '\t') {
			i++
		}
		if i == len(s) {
			break
		}
		if s[i] != '(' {
			return nil, fmt.Errorf("expected tuple")
		}
		i++
		var values []string
		for {
			for i < len(s) && (s[i] == ' ' || s[i] == '\n' || s[i] == '\r' || s[i] == '\t') {
				i++
			}
			var value strings.Builder
			if i < len(s) && s[i] == '\'' {
				i++
				closed := false
				for i < len(s) {
					c := s[i]
					i++
					if c == '\\' {
						if i >= len(s) {
							return nil, fmt.Errorf("trailing escape")
						}
						c = s[i]
						i++
						switch c {
						case 'n':
							c = '\n'
						case 'r':
							c = '\r'
						case 't':
							c = '\t'
						case '0':
							c = 0
						case 'Z':
							c = 26
						}
						value.WriteByte(c)
						continue
					}
					if c == '\'' {
						if i < len(s) && s[i] == '\'' {
							value.WriteByte('\'')
							i++
							continue
						}
						closed = true
						break
					}
					value.WriteByte(c)
				}
				if !closed {
					return nil, fmt.Errorf("unclosed value")
				}
			} else {
				start := i
				for i < len(s) && s[i] != ',' && s[i] != ')' {
					i++
				}
				v := strings.TrimSpace(s[start:i])
				if v != "NULL" {
					value.WriteString(v)
				}
			}
			values = append(values, value.String())
			for i < len(s) && (s[i] == ' ' || s[i] == '\n' || s[i] == '\r' || s[i] == '\t') {
				i++
			}
			if i >= len(s) {
				return nil, fmt.Errorf("unclosed tuple")
			}
			c := s[i]
			i++
			if c == ')' {
				break
			}
			if c != ',' {
				return nil, fmt.Errorf("expected comma")
			}
		}
		result = append(result, values)
	}
	return result, nil
}
