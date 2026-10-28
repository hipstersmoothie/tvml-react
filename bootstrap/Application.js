/* global App, DOMParser, XMLHttpRequest, navigationDocument, TVMLReactApp */

// tvml-react bootstrap. TVApplicationController loads this file first; it shows
// a spinner, downloads app.js from the same folder, evaluates it and calls the
// bundle's exported `start({ baseUrl, launchOptions })`.
//
// Under `tvml-react dev` it also forwards console output to the terminal and
// reloads the app after each rebuild. It detects the dev server by its
// `__tvml-react/dev` endpoint, so production hosting is unaffected.
//
// Launch options read here (set them on TVApplicationControllerContext):
//   BASEURL  folder this file was served from (defaults to "/")
//   BUNDLE   bundle filename relative to BASEURL (defaults to "app.js")

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function showBootScreen(message) {
  var xml =
    '<document><loadingTemplate theme="dark"><activityIndicator>' +
    (message ? "<title>" + escapeXml(message) + "</title>" : "") +
    "</activityIndicator></loadingTemplate></document>";
  var doc = new DOMParser().parseFromString(xml, "application/xml");
  navigationDocument.clear();
  navigationDocument.pushDocument(doc);
}

function loadScript(url, callback) {
  var xhr = new XMLHttpRequest();
  xhr.open("GET", url);
  xhr.onload = function () {
    if (xhr.status < 200 || xhr.status >= 300) {
      callback(new Error("Failed to load " + url + " (" + xhr.status + ")"));
      return;
    }
    try {
      // Indirect eval runs the bundle in global scope.
      (0, eval)(xhr.responseText);
    } catch (error) {
      callback(error);
      return;
    }
    callback(null);
  };
  xhr.onerror = function () {
    callback(new Error("Failed to load " + url));
  };
  xhr.send();
}

var DEV_ENDPOINT = "__tvml-react/dev";
var LOG_ENDPOINT = "__tvml-react/log";

function request(method, url, body, callback) {
  var xhr = new XMLHttpRequest();
  var done = false;
  function finish(status, text) {
    if (done) return;
    done = true;
    if (callback) callback(status, text);
  }
  xhr.open(method, url);
  // A request cut off by suspending the app never calls back; time out so
  // live-reload polling keeps going after resume.
  xhr.timeout = 5000;
  // TVJS fires onerror (not onload) for HTTP errors; status tells them apart.
  xhr.onload = xhr.onerror = function () {
    finish(xhr.status, xhr.responseText);
  };
  xhr.ontimeout = xhr.onabort = function () {
    finish(0, "");
  };
  xhr.send(body || null);
}

function serializeArg(arg) {
  if (arg instanceof Error) {
    return arg.message + (arg.stack ? "\n" + arg.stack : "");
  }
  if (typeof arg === "string") {
    return arg;
  }
  try {
    return JSON.parse(JSON.stringify(arg));
  } catch (error) {
    return String(arg);
  }
}

function forwardConsole(baseUrl) {
  // One request at a time, so lines reach the terminal in order.
  var queue = [];
  var sending = false;
  function flush() {
    if (sending || queue.length === 0) return;
    sending = true;
    request("POST", baseUrl + LOG_ENDPOINT, queue.shift(), function () {
      sending = false;
      flush();
    });
  }

  ["log", "info", "warn", "error", "debug"].forEach(function (level) {
    var original = console[level];
    console[level] = function () {
      var args = Array.prototype.slice.call(arguments);
      if (original) original.apply(console, args);
      queue.push(JSON.stringify({ level: level, args: args.map(serializeArg) }));
      flush();
    };
  });
}

function watchForRebuilds(baseUrl, build) {
  setTimeout(function poll() {
    request("GET", baseUrl + DEV_ENDPOINT, null, function (status, text) {
      var next = build;
      try {
        next = JSON.parse(text).build;
      } catch (error) {
        // Server restarting; keep polling.
      }
      if (status === 200 && next !== build) {
        App.reload({ when: "now" });
        return;
      }
      setTimeout(poll, 1000);
    });
  }, 1000);
}

// Calls back with the dev server's current build, or null when not under
// `tvml-react dev`.
function detectDevServer(baseUrl, callback) {
  request("GET", baseUrl + DEV_ENDPOINT, null, function (status, text) {
    if (status !== 200) {
      callback(null);
      return;
    }
    try {
      callback(JSON.parse(text).build);
    } catch (error) {
      callback(null);
    }
  });
}

App.onLaunch = function (options) {
  var baseUrl = options.BASEURL || options.baseURL || "/";
  if (baseUrl.charAt(baseUrl.length - 1) !== "/") {
    baseUrl += "/";
  }

  showBootScreen();

  detectDevServer(baseUrl, function (build) {
    if (build !== null) {
      forwardConsole(baseUrl);
      watchForRebuilds(baseUrl, build);
    }
    start(baseUrl, options);
  });
};

function start(baseUrl, options) {
  loadScript(baseUrl + (options.BUNDLE || "app.js"), function (error) {
    if (error) {
      showBootScreen(error.message || String(error));
      return;
    }

    if (
      typeof TVMLReactApp === "undefined" ||
      typeof TVMLReactApp.start !== "function"
    ) {
      showBootScreen("The app bundle does not export start()");
      return;
    }

    try {
      TVMLReactApp.start({ baseUrl: baseUrl, launchOptions: options });
    } catch (startError) {
      showBootScreen(startError.message || "start() failed");
    }
  });
}
