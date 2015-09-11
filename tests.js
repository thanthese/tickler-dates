var fs = require("fs");
var path = require("path");
var PEG = require("pegjs");
var bump = require("./bump");

// build parser ----------------------------------------

var grammarSpec = __dirname + path.sep + "grammar.txt";
var P = PEG.buildParser(bump.getGrammarString());

// minimal testing framework ----------------------------------------

var T = function newTestRunner() {
    var tests = [];
    var passed = 0;
    var failed = 0;
    return {
        add: function(t) { tests.push(t); },
        runTests: function() {
            for(var i in tests.reverse()) {
                try {
                    tests[i]();
                    passed++;
                } catch(e) {
                    failed++;
                    console.log(e);
                }
            }
            if(failed > 0) {
                console.log("FAILED " + failed + " of " + (passed + failed));
            } else {
                console.log("Passed all " + passed);
            }
        }
    };
}();

// test: grammar and parsing ----------------------------------------

function has(text, props) {
    T.add(function() {
        var obj = P.parse(text);
        var errors = [];
        for(var i in props) {
            var name = props[i][0];
            var value = props[i][1];
            var got;
            try {
                got = eval("obj." + name);
            } catch(e) {
                errors.push(name + " did not exist");
                continue;
            }
            if(got !== value) {
                errors.push("expected " + name + ":" + value + " but got " + got);
            }
        }
        if(errors.length > 0) {
            throw "For " + text + ": " + errors.join(", ") + '.';
        }
    });
}

// basic date
has("15.08.26w", [["date.year", 2015], ["date.month", 8], ["date.day", 26], ["date.weekday", 'w']]);
has( "5.08.26w", [["date.year", 2005], ["date.month", 8], ["date.day", 26], ["date.weekday", 'w']]);
has(   "08.26w", [                     ["date.month", 8], ["date.day", 26], ["date.weekday", 'w']]);
has(    "8.26w", [                     ["date.month", 8], ["date.day", 26], ["date.weekday", 'w']]);
has(      "26w", [                                        ["date.day", 26], ["date.weekday", 'w']]);
has(       "6w", [                                        ["date.day",  6], ["date.weekday", 'w']]);
has(        "w", [                                                          ["date.weekday", 'w']]);
has("15.08.26" , [["date.year", 2015], ["date.month", 8], ["date.day", 26]                       ]);
has( "5.08.26" , [["date.year", 2005], ["date.month", 8], ["date.day", 26]                       ]);
has(   "08.26" , [                     ["date.month", 8], ["date.day", 26]                       ]);
has(    "8.26" , [                     ["date.month", 8], ["date.day", 26]                       ]);
has(      "26" , [                                        ["date.day", 26]                       ]);
has(       "6" , [                                        ["date.day",  6]                       ]);

// basic add
has("+491d", [["add.amount", 491], ["add.unit", 'd']]);
has( "+91d", [["add.amount",  91], ["add.unit", 'd']]);
has(  "+1d", [["add.amount",   1], ["add.unit", 'd']]);
has(   "+d", [["add.amount",   1], ["add.unit", 'd']]);
has("+491w", [["add.amount", 491], ["add.unit", 'w']]);
has("+491w", [["add.amount", 491], ["add.unit", 'w']]);
has("+491m", [["add.amount", 491], ["add.unit", 'm']]);
has( "+491", [["add.amount", 491], ["add.unit", 'd']]);
has(    "+", [["add.amount",   1], ["add.unit", 'd']]);

// basic description
has(   "boats of summer"   , [["desc.text",    "boats of summer"   ]]);
has("   boats of summer"   , [["desc.text", "   boats of summer"   ]]);
has("   boats of summer   ", [["desc.text", "   boats of summer   "]]);
has("   "                  , [["desc.text", "   "                  ]]);
has(""                     , [["desc.text", ""                     ]]);

// description with add
has("a +4d", [["desc.text", "a +4d"], ["desc.repeat.type", "add"], ["desc.repeat.amount", 4], ["desc.repeat.unit", "d"]]);
has("a +4d c", [["desc.text", "a +4d c"], ["desc.repeat.type", "add"], ["desc.repeat.amount", 4], ["desc.repeat.unit", "d"]]);
has("a +4d ", [["desc.text", "a +4d "], ["desc.repeat.type", "add"], ["desc.repeat.amount", 4], ["desc.repeat.unit", "d"]]);
has( " +4d ", [["desc.text", " +4d "], ["desc.repeat.type", "add"], ["desc.repeat.amount", 4], ["desc.repeat.unit", "d"]]);
has( " +4d +5w ", [["desc.text", " +4d +5w "], ["desc.repeat.type", "add"], ["desc.repeat.amount", 4], ["desc.repeat.unit", "d"]]);

// other descriptions
has( " >4d ", [["desc.text", " >4d "], ["desc.repeat.type", "jump"], ["desc.repeat.amount", 4], ["desc.repeat.unit", "d"]]);
has( " |m+2w ",
     [["desc.text"           , " |m+2w "],
      ["desc.repeat.type"    , "byWeek"],
      ["desc.repeat.jumpUnit", 'm'],
      ["desc.repeat.amount"  , 2],
      ["desc.repeat.weekday" , 'w']]);
has( " |y-1f ",
     [["desc.text"           , " |y-1f "],
      ["desc.repeat.type"    , "byWeek"],
      ["desc.repeat.jumpUnit", 'y'],
      ["desc.repeat.amount"  , -1],
      ["desc.repeat.weekday" , 'f']]);

// mixed
has("15.09.06u+42w  test +4d test ", [["date.year", 2015], ["date.month", 9], ["date.day", 6], ["date.weekday", 'u'], ["add.amount", 42], ["add.unit", 'w'], ["desc.text", "  test +4d test "], ["desc.repeat.type", "add"], ["desc.repeat.amount", 4], ["desc.repeat.unit", "d"]]);
has("15.09.06u  test +4d test ", [["date.year", 2015], ["date.month", 9], ["date.day", 6], ["date.weekday", 'u'], ["desc.text", "  test +4d test "], ["desc.repeat.type", "add"], ["desc.repeat.amount", 4], ["desc.repeat.unit", "d"]]);
has("+42w  test +4d test ", [["add.amount", 42], ["add.unit", 'w'], ["desc.text", "  test +4d test "], ["desc.repeat.type", "add"], ["desc.repeat.amount", 4], ["desc.repeat.unit", "d"]]);
has("15.09.06u+42w", [["date.year", 2015], ["date.month", 9], ["date.day", 6], ["date.weekday", 'u'], ["add.amount", 42], ["add.unit", 'w']]);

// test: bumping ----------------------------------------

var TEST_DATE = new Date(2015, 9-1, 6); // a sunday
function cmp(input, output, opts) {
    var date = (opts && opts.today) || TEST_DATE;
    var plus = (opts && opts.plus) || 0;
    var got = bump.bump(input, date, plus);
    T.add(function(){
        if(got != output) {
            throw "For \"" + input + "\"{date:" + bump.prettyDate(date) + ", plus:" + plus
                + "} expected \"" + output + "\" but got \"" + got + "\".";
        }
    });
}

// dates only
cmp("10", "15.09.10r");
cmp("04", "15.10.04u");
cmp("4", "15.10.04u");
cmp("9.20", "15.09.20u");
cmp("10.5", "15.10.05m");
cmp("1.05", "16.01.05t");
cmp("15.10.05", "15.10.05m");
cmp("15.10.05m", "15.10.05m");
cmp("u", "15.09.13u");
cmp("w", "15.09.09w");
cmp("s", "15.09.12s");
cmp("15.09.06u", "15.09.06u");
cmp("15.09.05s", "15.09.05s");

// fixed adds only
cmp("+", "15.09.07m");
cmp("+1", "15.09.07m");
cmp("+d", "15.09.07m");
cmp("+1d", "15.09.07m");
cmp("+14d", "15.09.20u");
cmp("+28d", "15.10.04u");
cmp("+w", "15.09.13u");
cmp("+1w", "15.09.13u");
cmp("+4w", "15.10.04u");
cmp("+m", "15.10.06t");
cmp("+1m", "15.10.06t");
cmp("+2m", "15.11.06f");
cmp("+y", "16.09.06t");
cmp("+1y", "16.09.06t");

// dates with adds
cmp("4+2", "15.10.06t");
cmp("10.4+2", "15.10.06t");
cmp("15.10.4+2", "15.10.06t");
cmp("15.10.4u+2d", "15.10.06t");

// no-repetition descriptions
cmp("", "15.09.06u");
cmp("test", "15.09.06u test");
cmp(" test ", "15.09.06u  test ");

// dates, fixed adds, and basic descriptions
cmp("10 test", "15.09.10r test");
cmp("+ test", "15.09.07m test");
cmp("4+2 test", "15.10.06t test");
cmp("4+2  test ", "15.10.06t  test ");
cmp("4+2  longer test ", "15.10.06t  longer test ");

// descriptions with adds
cmp(" +4d test", "15.09.06u  +4d test");
cmp("15.09.04f  +4d test", "15.09.10r  +4d test");
cmp("15.09.04f test +4d", "15.09.10r test +4d");
cmp("15.09.04f test +4d ", "15.09.10r test +4d ");
cmp("15.09.04f test +5d +3d", "15.09.11f test +5d +3d");

// descriptions with jumps
cmp("test >4d", "15.09.06u test >4d");
cmp("15.11.04w >1d", "15.11.05r >1d");
cmp("15.03.04w >1d", "15.03.05r >1d");
cmp("15.03.04w >w", "15.03.11w >w");

// descriptions with byWeeks
cmp("15.09.06u |m+1m", "15.10.05m |m+1m");
cmp("15.09.06u |m+2m", "15.10.12m |m+2m");
cmp("15.09.06u |m-1m", "15.10.26m |m-1m");
cmp("15.09.06u |m-2m", "15.10.19m |m-2m");
cmp("15.09.06u |y+1m", "16.09.05m |y+1m");
cmp("15.09.06u |y-2m", "16.09.19m |y-2m");

// all together now
cmp("4+2w +2d test", "15.10.18u +2d test");

// plus
cmp("test", "15.09.07m test", {plus:1});
cmp("test", "15.09.08t test", {plus:2});
cmp("test", "15.09.05s test", {plus:-1});
cmp("4+2w test +4d", "15.10.20t test +4d", {plus:2});

// TODO: what to do about bad formats?

// run tests ----------------------------------------

T.runTests();
