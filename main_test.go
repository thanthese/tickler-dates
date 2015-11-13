package main

import (
	"strings"
	"testing"
	"time"
)

func TestBump(t *testing.T) {
	cases := []struct {
		in   string
		plus int
		want string
	}{
		// dates only
		{"10", 0, "15.09.10r"},
		{"04", 0, "15.10.04u"},
		{"4", 0, "15.10.04u"},
		{"9.20", 0, "15.09.20u"},
		{"10.5", 0, "15.10.05m"},
		{"1.05", 0, "16.01.05t"},
		{"1.05w", 0, "22.01.05w"},
		{"15.10.05", 0, "15.10.05m"},
		{"15.10.05m", 0, "15.10.05m"},
		{"u", 0, "15.09.13u"},
		{"w", 0, "15.09.09w"},
		{"s", 0, "15.09.12s"},
		{"15.09.06u", 0, "15.09.06u"},
		{"15.09.05s", 0, "15.09.05s"},

		// fixed adds only
		{"+", 0, "15.09.07m"},
		{"+1", 0, "15.09.07m"},
		{"+d", 0, "15.09.07m"},
		{"+1d", 0, "15.09.07m"},
		{"+14d", 0, "15.09.20u"},
		{"+28d", 0, "15.10.04u"},
		{"+w", 0, "15.09.13u"},
		{"+1w", 0, "15.09.13u"},
		{"+4w", 0, "15.10.04u"},
		{"+m", 0, "15.10.06t"},
		{"+1m", 0, "15.10.06t"},
		{"+2m", 0, "15.11.06f"},
		{"+y", 0, "16.09.06t"},
		{"+1y", 0, "16.09.06t"},

		// dates with adds
		{"4+2", 0, "15.10.06t"},
		{"10.4+2", 0, "15.10.06t"},
		{"15.10.4+2", 0, "15.10.06t"},
		{"15.10.4u+2d", 0, "15.10.06t"},

		// no-repetition descriptions
		{"", 0, "15.09.06u"},
		{"test", 0, "15.09.06u test"},
		{" test ", 0, "15.09.06u  test "},

		// dates, fixed adds, and basic descriptions
		{"10 test", 0, "15.09.10r test"},
		{"+ test", 0, "15.09.07m test"},
		{"t test", 0, "15.09.08t test"},
		{"4+2 test", 0, "15.10.06t test"},
		{"4+2  test ", 0, "15.10.06t  test "},
		{"4+2  longer test ", 0, "15.10.06t  longer test "},

		// descriptions with adds
		{" +4d test", 0, "15.09.06u  +4d test"},
		{"15.09.04f  +4d test", 0, "15.09.10r  +4d test"},
		{"15.09.04f test +4d", 0, "15.09.10r test +4d"},
		{"15.09.04f test +4", 0, "15.09.10r test +4"},
		{"15.09.04f test +4\n", 0, "15.09.10r test +4"},
		{"15.09.04f test +4d ", 0, "15.09.10r test +4d "},
		{"15.09.04f test +5d +3d", 0, "15.09.11f test +5d +3d"},

		// descriptions with jumps
		{"test >4d", 0, "15.09.06u test >4d"},
		{"15.11.04w >1d", 0, "15.11.05r >1d"},
		{"15.03.04w >1d", 0, "15.03.05r >1d"},
		{"15.03.04w >w", 0, "15.03.11w >w"},

		// descriptions with byWeeks
		{"15.09.06u |m+1m", 0, "15.10.05m |m+1m"},
		{"15.09.06u |m+2m", 0, "15.10.12m |m+2m"},
		{"15.09.06u |m-1m", 0, "15.10.26m |m-1m"},
		{"15.09.06u |m-2m", 0, "15.10.19m |m-2m"},
		{"15.09.06u |y+1m", 0, "16.09.05m |y+1m"},
		{"15.09.06u |y-2m", 0, "16.09.19m |y-2m"},

		// all together now
		{"4+2w +2d test", 0, "15.10.18u +2d test"},

		// plus
		{"test", 1, "15.09.07m test"},
		{"test", 2, "15.09.08t test"},
		{"test", -1, "15.09.05s test"},
		{"4+2w test +4d", 2, "15.10.20t test +4d"},

		// accept ()
		{"15.09.09w (+2d) test", 0, "15.09.08t (+2d) test"},
		{"15.09.12s test a (>4d) b", 0, "15.09.16w test a (>4d) b"},
		{"15.09.06u test (|m+1m)", 0, "15.10.05m test (|m+1m)"},

		// weird inputs
		{"15.09.09w test+2dtest test", 0, "15.09.09w test+2dtest test"},
		{"15.09.09w +2dtest test", 0, "15.09.09w +2dtest test"},
		{"99.99", 0, "ERROR"},
		{"01.02.03test", 0, "15.09.06u 01.02.03test"},
		{"02.03test", 0, "15.09.06u 02.03test"},
		{"03test", 0, "15.09.06u 03test"},
	}

	today := time.Date(2015, time.September, 6, 0, 0, 0, 0, time.UTC) // a sunday
	for _, c := range cases {
		got := Bump(c.in, today, c.plus)
		if strings.Contains(c.want, "ERROR") {
			if strings.Contains(got, "ERROR") {
				continue
			}
			t.Errorf("Was expecting an error on Bump(%q, %v, %v), but got %q instead.", prettyPrint(today), c.plus, c.in, got)
		} else if got != c.want {
			t.Errorf("Bump(%q, %v, %v) == %q, want %q", c.in, prettyPrint(today), c.plus, got, c.want)
		}
	}
}
