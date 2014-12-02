// fuck mespeak. Proxies for two functions it _really_ wants to use
document = {createElement: function() { }};
window = {addEventListener: function() { }};

importScripts("mespeak/mespeak.js");

meSpeak.loadConfig("mespeak/mespeak_config.json");
meSpeak.loadVoice("mespeak/voices/en/en-us.json");

// Special handling for in reply to, greentext and links
// Use different voices
function sayPost(data) {
	var lines = data.split("\n"), parts = [], line, i;
	for (i = 0; i < lines.length; i++) {
		line = lines[i];
		if (line.lastIndexOf(">>>", 0) === 0) {
			parts.push({text: "Go to " + line.slice(3), variant: "f2"});
		} else if (line.lastIndexOf(">>", 0) === 0) {
			parts.push({text: line.slice(2), variant: "f2"});
		} else if (line.lastIndexOf(">", 0) === 0) {
			parts.push({text: line.slice(1), variant: "f5"});
		} else {
			parts.push({text: line, variant: "m5"});
		}
	}
	return meSpeak.speakMultipart(parts, {"rawdata": "data-url"});
}

onmessage = function(event) {
	postMessage(sayPost(event.data));
}
