/* Initialize some global shit */
var API_ROOT = "https://8chan.co/";
var log = function(t) { $("#status").text(t) };

meSpeak.loadConfig("js/mespeak/mespeak_config.json");
meSpeak.loadVoice("js/mespeak/voices/en/en-us.json");

// Use a worker to actually create the audio so the UI thread doesn't
// get locked up. Sketchy as shit callback handling too.
var next_worker_callback = null;
var worker = new Worker("js/mespeak-worker.js");
worker.onmessage = function(event) {
	console.log(event);
	meSpeak.play(event.data, 1, function() {
		if (next_worker_callback === null) { return; }
		var t = next_worker_callback;
		next_worker_callback = null;
		return t();
	});
}
worker.onerror = function(event) {
	log("Worker error! Please check console.log");
	console.log(event);
}

function speakInWorker(text, callback) {
	next_worker_callback = callback;
	worker.postMessage(text);
}

// Loads the thread index from a board
function loadThreads(board, callback, cerror) {
	log("Loading threads on board /"+board+"/");
	$.ajax({
		url: API_ROOT+board+"/threads.json",
		success: callback,
		error: cerror,
		dataType: "json"
	});
}

// Loads a specific threadid from a board
function loadThread(board, threadid, callback, cerror) {
	log("Loading thread #"+threadid+" on /"+board+"/");
	$.ajax({
		url: API_ROOT+board+"/res/"+threadid+".json",
		success: callback,
		error: cerror,
		dataType: "json",
	});
}

// Takes in a post json object and the board and returns the url to the image
function imageUrl(board, post) {
	if (!(post["tim"] && post["ext"])) { return null; }
	return "http://media.8chan.co/"+board+"/src/"+post["tim"]+post["ext"];
}

// Stolen from stackexchange.
function collectTextNodes(element, texts) {
    for (var child= element.firstChild; child!==null; child= child.nextSibling) {
        if (child.nodeType===3)
            texts.push(child);
        else if (child.nodeType===1)
            collectTextNodes(child, texts);
    }
}

// Takes an element and returns the text in it with newlines
function getTextWithNewlines(element) {
    var texts= [];

    collectTextNodes(element, texts);
    for (var i= texts.length; i-->0; i)
        texts[i]= texts[i].data;
    return texts.join('\n');
}


// Makes a post be the currently displayed one
// returns the post comment as plaintext with newlines
function displayPost(board, post) {
	var pc = $("#post_comment");
	pc.html(post.com);
	var img = imageUrl(board, post)
	if (img) {
		$("#post_image").attr("src", img).removeClass("not-active");
	} else {
		$("#post_image").addClass("not-active");
	}

	return getTextWithNewlines(pc.get(0));
}

// Actually reads/displays a post
function doReadPost(board, post, callback) {
	log("Reading post #"+post.no+" on /"+board+"/...");

	var text_to_say = displayPost(board, post);
	console.log(text_to_say);
	speakInWorker(text_to_say, callback);
}

// Takes a board name and an array of post JSON objects and reads them all
function readPosts(board, posts, done) {
	return doReadPost(board, posts[0], function() {
		if (posts.length === 1) {
			return done();
		} else {
			return readPosts(board, posts.slice(1), done);
		}
	});
}

// Takes a board name and speaks a random thread from the first page of it
function speakRandThread(board, done, error) {
	return loadThreads(board, function(threads) {
		var allThreads = threads[0].threads;
		var post = allThreads[Math.floor(Math.random()*allThreads.length)];
		return loadThread(board, post.no, function(posts) {
			console.log(posts);
			return readPosts(board, posts.posts, done);
		}, function() {
			log("WTF COULDN'T LOAD THREAD");
			return error();
		});
	}, function() {
		log("WTF COULDN'T LOAD BOARD INDEX YOU'RE FUCKED");
		return error();
	});
}

function speakBoardForever(board) {
	return speakRandThread(board, function() { speakBoardForever(board); });
}

