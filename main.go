package main

import (
	"errors"
	"flag"
	"fmt"
	"io/ioutil"
	"os"
	"regexp"
	"strconv"
	"strings"
	"time"
)

const weekdays = "umtwrfs"

func main() {
	today := flag.Bool("t", false, "Don't worry about inputs, just print today.")
	plus := flag.Int("p", 0, "Days to add, on top of whatever else.")
	flag.Parse()

	if *today {
		fmt.Printf(prettyPrint(time.Now()))
		return
	}

	bytes, _ := ioutil.ReadAll(os.Stdin)
	fmt.Printf(Bump(string(bytes), time.Now(), *plus))
}

// Main entry point for program logic. See readme for accepted syntax.
func Bump(s string, today time.Time, plus int) string {
	f := extractFields(s)
	date, err := calcDate(f, today)
	if err != nil {
		return err.Error()
	}
	date = add(f.addSign, f.addAmount, f.addUnit, date)
	date = date.AddDate(0, 0, plus)
	if f.hasYMD() && f.hasNoAdd() && plus == 0 {
		switch f.repeatType {
		case "+":
			date = add("+", f.repeatAmount, f.repeatUnit, today)
		case ">":
			date = add("+", f.repeatAmount, f.repeatUnit, date)
		case "|":
			date = addSpecial(f, date)
		}
	}
	return prettyPrint(date) + calcSeparator(f) + f.description
}

// All useful information pulled out of the input string. In an ideal world
// this stuff would be converted into more useful types, but strings have an
// important property: they're easily nullable. Also, extracting this
// information is hard enough already without having to worry about type
// conversions, too.
type fields struct {
	year    string
	month   string
	day     string
	weekday string

	addSign   string
	addAmount string
	addUnit   string

	description string

	repeatType   string
	repeatAmount string
	repeatUnit   string

	specialSign    string
	specialWeekday string
}

func (f fields) hasYMD() bool {
	return f.year != "" && f.month != "" && f.day != ""
}

func (f fields) hasNoDate() bool {
	return f.year == "" && f.month == "" && f.day == "" && f.weekday == ""
}

func (f fields) hasNoAdd() bool {
	return f.addSign == ""
}

// Parse the input string into something intelligible. Historically this has
// been the most difficult party of the problem. Here's it's all handled at
// once -- one big mess, completely separated from what we'll do with it later.
func extractFields(s string) (f fields) {
	find := func(reg, s string) []string { return regexp.MustCompile(reg).FindStringSubmatch(s) }

	// Weirdly, go's regexes don't support look-aheads. To simulate them we
	// throw the look ahead on the end of the pattern and then use this mess to
	// strip it off of the full matched string.
	removeLookAhead := func(m []string) string {
		fullMatch := m[0]
		lastSubmatch := m[len(m)-1]
		return fullMatch[0 : len(fullMatch)-len(lastSubmatch)]
	}

	var dateStr string
	if m := find(`^(\d{1,2})\.(\d{1,2})\.(\d{1,2})([mtwrfsu]?)( |$|\+)`, s); m != nil {
		f.year, f.month, f.day, f.weekday = m[1], m[2], m[3], m[4]
		dateStr = removeLookAhead(m)
	} else if m := find(`^(\d{1,2})\.(\d{1,2})([mtwrfsu]?)( |$|\+)`, s); m != nil {
		f.month, f.day, f.weekday = m[1], m[2], m[3]
		dateStr = removeLookAhead(m)
	} else if m := find(`^(\d{1,2})([mtwrfsu]?)( |$|\+)`, s); m != nil {
		f.day, f.weekday = m[1], m[2]
		dateStr = removeLookAhead(m)
	} else if m := find(`^([mtwrfsu])( |$|\+)`, s); m != nil {
		f.weekday = m[1]
		dateStr = removeLookAhead(m)
	}
	r := strings.Replace(s, dateStr, "", 1)

	var addStr string
	if m := find(`^([+-])(\d*)([dwmy]?)( |$)`, r); m != nil {
		f.addSign, f.addAmount, f.addUnit = m[1], m[2], m[3]
		addStr = removeLookAhead(m)
	}
	r = strings.Replace(r, addStr, "", 1)

	f.description = r

	if m := find(`( |\(|^)([+>])(\d*)([dwmy]?)( |\)|$)`, r); m != nil {
		f.repeatType, f.repeatAmount, f.repeatUnit = m[2], m[3], m[4]
	}
	if m := find(`( |\(|^)(\|)([my])([+-])(\d)([umtwrfs])( |\)|$)`, r); m != nil {
		f.repeatType, f.repeatUnit, f.specialSign, f.repeatAmount, f.specialWeekday = m[2], m[3], m[4], m[5], m[6]
	}
	return
}

func prettyPrint(t time.Time) string {
	return fmt.Sprintf("%02d.%02d.%02d%c", t.Year()-2000, int(t.Month()), t.Day(), weekdays[t.Weekday()])
}

// Take what the user gave us and try to figure out what date they were talking
// about.
func calcDate(f fields, today time.Time) (time.Time, error) {
	if f.hasNoDate() {
		return today, nil
	}
	if f.hasYMD() {
		y := atoi(f.year) + 2000
		m := time.Month(atoi(f.month))
		d := atoi(f.day)
		return time.Date(y, m, d, 0, 0, 0, 0, time.UTC), nil
	}
	d := today
	for tries := 0; tries < 365*10; tries++ {
		d = d.AddDate(0, 0, 1)
		if (f.month != "" && d.Month() != time.Month(atoi(f.month))) ||
			(f.day != "" && d.Day() != atoi(f.day)) ||
			(f.weekday != "" && d.Weekday() != time.Weekday(strings.Index(weekdays, f.weekday))) {
			continue
		}
		return d, nil
	}
	return today, errors.New(fmt.Sprintf("ERROR: Weird format %s.%s%s for %s ", f.month, f.day, f.weekday, prettyPrint(d)))
}

// Add some amount to the given date. Handles the vagaries of strings and
// defaults.
func add(sign, amount, unit string, date time.Time) time.Time {
	if sign == "" {
		return date
	}
	if amount == "" {
		amount = "1"
	}
	amt := atoi(sign + amount)
	switch unit {
	case "y":
		return date.AddDate(amt, 0, 0)
	case "m":
		return date.AddDate(0, amt, 0)
	case "w":
		return date.AddDate(0, 0, amt*7)
	default:
		return date.AddDate(0, 0, amt)
	}
}

// Add involving the special "|" syntax.
func addSpecial(f fields, date time.Time) time.Time {

	// move to the 1st of the appropriate month
	date = time.Date(date.Year(), date.Month(), 1, 0, 0, 0, 0, time.UTC)
	if f.repeatUnit == "m" {
		date = date.AddDate(0, 1, 0)
	} else {
		date = date.AddDate(1, 0, 0)
	}

	// build up a list of candidate days in that month
	days := []time.Time{}
	for d := date; d.Month() == date.Month(); {
		if d.Weekday() == time.Weekday(strings.Index(weekdays, f.specialWeekday)) {
			days = append(days, d)
		}
		d = d.AddDate(0, 0, 1)
	}

	// return the right candidate
	index := atoi(f.specialSign+f.repeatAmount) - 1
	if index < 0 {
		index += len(days) + 1
	}
	return days[index]
}

func calcSeparator(f fields) string {
	if f.hasNoDate() && f.hasNoAdd() && f.description != "" {
		return " "
	}
	return ""
}

// My regexes are guaranteed to provide valid ints, so we can do away with the
// error checking.
func atoi(s string) int {
	i, _ := strconv.Atoi(s)
	return i
}
