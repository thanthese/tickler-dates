var bump = require("./bump");

function getPlus(args) {
    if(args[2] === "--plus") {
        if(args[3]) return parseInt(args[3], 10);
        return 1;
    }
    return 0;
}

var timeoutSeconds = 2;
setTimeout(function() {
    console.log("Error: no input detected from STDIN in " + timeoutSeconds + " seconds.");
    process.exit();
}, timeoutSeconds * 1000);

process.stdin.resume();
process.stdin.on("data", function(data) {
    var text = data.toString().trim();
    var now = new Date(Date.now());
    var plus = getPlus(process.argv);
    var result = bump.bump(text, now, plus);
    process.stdout.write(result);
    process.exit();
});
