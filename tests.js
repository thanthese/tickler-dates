var fs = require("fs");
var PEG = require("pegjs");

// build parser ----------------------------------------

var grammar = fs.readFileSync("grammar.txt").toString();
var P = PEG.buildParser(grammar);

// minimal testing framework ----------------------------------------

var T = function newTestRunner() {
    var tests = [];
    var passed = 0;
    var failed = 0;
    return {
        add: function(t) { tests.push(t); },
        runTests: function() {
            for(var i in tests) {
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

// testing utilities ----------------------------------------

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

// test: grammar and parsing ----------------------------------------

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
has(   "boats of summer"    , [["desc.text",    "boats of summer"   ]]);
has("   boats of summer"    , [["desc.text", "   boats of summer"   ]]);
has("   boats of summer   " , [["desc.text", "   boats of summer   "]]);
has("   "                   , [["desc.text", "   "                  ]]);
has(""                      , [["desc.text", ""                     ]]);

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
      ["desc.repeat.sign"    , '+'],
      ["desc.repeat.amount"  , 2],
      ["desc.repeat.weekday" , 'w']]);
has( " |y-1f ",
     [["desc.text"           , " |y-1f "],
      ["desc.repeat.type"    , "byWeek"],
      ["desc.repeat.jumpUnit", 'y'],
      ["desc.repeat.sign"    , '-'],
      ["desc.repeat.amount"  , 1],
      ["desc.repeat.weekday" , 'f']]);

// mixed
has("15.09.06u+42w  test +4d test ", [["date.year", 2015], ["date.month", 9], ["date.day", 6], ["date.weekday", 'u'], ["add.amount", 42], ["add.unit", 'w'], ["desc.text", "  test +4d test "], ["desc.repeat.type", "add"], ["desc.repeat.amount", 4], ["desc.repeat.unit", "d"]]);
has("15.09.06u  test +4d test ", [["date.year", 2015], ["date.month", 9], ["date.day", 6], ["date.weekday", 'u'], ["desc.text", "  test +4d test "], ["desc.repeat.type", "add"], ["desc.repeat.amount", 4], ["desc.repeat.unit", "d"]]);
has("+42w  test +4d test ", [["add.amount", 42], ["add.unit", 'w'], ["desc.text", "  test +4d test "], ["desc.repeat.type", "add"], ["desc.repeat.amount", 4], ["desc.repeat.unit", "d"]]);
has("15.09.06u+42w", [["date.year", 2015], ["date.month", 9], ["date.day", 6], ["date.weekday", 'u'], ["add.amount", 42], ["add.unit", 'w']]);

// run tests ----------------------------------------

T.runTests();
