var fs = require("fs");
var path = require("path");
var PEG = require("pegjs");

module.exports.bump = bump;
module.exports.prettyDate = prettyDate;
module.exports.getGrammarString = getGrammarString;

function getGrammarString() {
    return fs.readFileSync(__dirname + path.sep + "grammar.txt").toString();
}

function bump(text, today, plus) {
    var p = PEG.buildParser(getGrammarString()).parse(text);
    var date = completeDate(p, today);
    date = addFixedAdds(p, date);
    if((p.date && p.date.year) && !p.add && !plus)
        date = addDescRepeats(p, date, today);
    date = addDays(date, plus);
    return prettyDate(date) + buildDesc(p);
}

function completeDate(parsedText, today) {
    if(!parsedText.date) return today;
    var d = parsedText.date;
    if(d.year && d.month && d.day) return new Date(d.year, d.month - 1, d.day);
    var date = new Date(today);
    for(var i = 0; i < 365 * 8; ++i) {
        date = addDays(date, 1);
        if((!d.year || d.year == date.getFullYear())
           && (!d.month || d.month == date.getMonth() + 1)
           && (!d.day || d.day == date.getDate())
           && (!d.weekday || d.weekday == prettyWeekday(date.getDay()))) {
            return date;
        }
    }
    throw "Couldn't complete date.";
}

function buildDesc(parsedText) {
    var p = parsedText;
    if(!p.desc || !p.desc.text) return "";
    if(!p.date && !p.add) return " " + p.desc.text;
    return p.desc.text;
}

function addFixedAdds(parsedText, date) {
    if(!parsedText.add) return date;
    return addToDate(date, parsedText.add.unit, parsedText.add.amount);
}

function addDescRepeats(parsedText, date, today) {
    if(!parsedText.desc || !parsedText.desc.repeat) return date;
    var r = parsedText.desc.repeat;
    if(r.type == "add") return addToDate(today, r.unit, r.amount);
    if(r.type == "jump") return addToDate(date, r.unit, r.amount);
    if(r.type == "byWeek") {
        // make sure we don't fall off the end of the month while calculating
        if (date.getDate() > 15) {
            date = addDays(date, -7);
        }

        if (r.jumpUnit == "m") {
            date = addMonths(date, 1);
        } else {
            date = addYears(date, 1);
        }
        var weeks = listWeeks(date.getFullYear(), date.getMonth(), r.weekday);
        var weekIndex = r.amount;
        if (weekIndex < 0) {
            date = weeks[weeks.length + weekIndex];
        } else {
            date = weeks[weekIndex - 1];
        }
        return date;
    }
    throw "Unexpected repeat type in description: " + r.type;
}

function listWeeks(year, month, weekday) {
    var first = new Date(year, month, 1);
    var weeks = [];
    for (var i = 0; i <= 31; ++i) {
        var date = addDays(first, i);
        if (prettyWeekday(date.getDay()) === weekday && date.getMonth() === month) {
            weeks.push(date);
        }
    }
    return weeks;
}

function addToDate(date, unit, amount) {
    if(unit == 'd') return addDays(date, amount);
    if(unit == 'w') return addDays(date, amount * 7);
    if(unit == 'm') return addMonths(date, amount);
    if(unit == 'y') return addYears(date, amount);
    return date;
}

function addDays(date, n) {
    var newDate = new Date(date);
    newDate.setDate(date.getDate() + n);
    return newDate;
}

function addMonths(date, n) {
    var totalMonths = date.getMonth() + n;
    var newDate = new Date(date.getFullYear() + (totalMonths / 12),
                           totalMonths % 12,
                           date.getDate());
    return newDate;
}

function addYears(date, n) {
    return new Date(date.getFullYear() + n, date.getMonth(), date.getDate());
}

function prettyDate(date) {
    var year = date.getFullYear() - 2000;
    var month = date.getMonth() + 1;
    var day = date.getDate();
    var weekday = prettyWeekday(date.getDay());
    return pad2(year) + '.' + pad2(month) + '.' + pad2(day) + weekday;
}
function prettyWeekday(n) {return "umtwrfs"[n];}
function pad2(num) {return ("0" + num).slice(-2);}
