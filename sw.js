// Oso Skin: guarda la app en el aparato para que abra aunque no haya internet.
// Tu avance no pasa por aquí: vive en el almacenamiento del navegador (localStorage).
//
// Ojo: Oso finance, Oso Gym y las demás apps de este dominio (therobotman74.github.io)
// comparten el mismo almacén de cachés. Por eso aquí solo se borran las cachés que
// empiezan con PREFIX, y si otra app borró la nuestra, se vuelve a llenar sola.
var PREFIX = "oso-skin-";
var VERSION = PREFIX + "v1";
var SHELL = [
  "./", "index.html", "logic.js", "manifest.webmanifest",
  "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png",
  "icons/apple-touch-icon.png", "icons/favicon-32.png", "icons/icon.svg",
  "fonts/archivo-latin-wdth-normal.woff2",
  "fonts/ibm-plex-sans-latin-400-normal.woff2", "fonts/ibm-plex-sans-latin-500-normal.woff2", "fonts/ibm-plex-sans-latin-600-normal.woff2",
  "fonts/ibm-plex-mono-latin-400-normal.woff2", "fonts/ibm-plex-mono-latin-500-normal.woff2", "fonts/ibm-plex-mono-latin-600-normal.woff2"
];
// Íconos y tipografías no cambian de contenido: primero la copia guardada.
var FIXED = /\/(icons|fonts)\//;
// Si la red tarda más que esto, se usa la copia guardada.
var TIMEOUT_MS = 4000;

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k.indexOf(PREFIX) === 0 && k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

function fromNetwork(req, key) {
  return new Promise(function (resolve, reject) {
    var timer = setTimeout(function () { reject(new Error("timeout")); }, TIMEOUT_MS);
    fetch(req).then(function (res) {
      clearTimeout(timer);
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(VERSION).then(function (c) { return c.put(key || req, copy); }).catch(function () {});
      }
      resolve(res);
    }, function (err) { clearTimeout(timer); reject(err); });
  });
}

function ensureShell() {
  return caches.open(VERSION).then(function (c) {
    return Promise.all(SHELL.map(function (url) {
      return c.match(url).then(function (hit) { return hit || c.add(url).catch(function () {}); });
    }));
  }).catch(function () {});
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // La app: primero la red (así recibes las actualizaciones), si no hay, la copia guardada.
  if (req.mode === "navigate") {
    e.respondWith(fromNetwork(req, "index.html").catch(function () {
      return caches.match("index.html", { ignoreSearch: true }).then(function (r) { return r || caches.match("./"); });
    }));
    e.waitUntil(ensureShell());
    return;
  }

  if (FIXED.test(url.pathname)) {
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || fromNetwork(req); }));
    return;
  }

  e.respondWith(fromNetwork(req).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (r) { return r || Response.error(); });
  }));
});
