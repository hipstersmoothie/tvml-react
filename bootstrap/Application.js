/* global App, DOMParser, XMLHttpRequest, navigationDocument, TVMLReactApp */

// tvml-react bootstrap. TVApplicationController loads this file first; it shows
// a spinner, downloads app.js from the same folder, evaluates it and calls the
// bundle's exported `start({ baseUrl, launchOptions })`.
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

App.onLaunch = function (options) {
  var baseUrl = options.BASEURL || options.baseURL || "/";
  if (baseUrl.charAt(baseUrl.length - 1) !== "/") {
    baseUrl += "/";
  }

  showBootScreen();

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
};
