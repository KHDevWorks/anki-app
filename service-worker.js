const CACHE_NAME = "anki-app-cache-v1";

const CACHE_FILES = [
  "splash.html",
  "index.html",
  "style.css",
  "app.js",
  "db.js",
  "firebaseCardDataSource.js",
  "usecases/cardUseCases.js",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

// インストール
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CACHE_FILES))
  );
  self.skipWaiting();
});

// アクティベート
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// フェッチ
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((res) => {
      return (
        res ||
        fetch(event.request).catch(() =>
          caches.match("index.html")
        )
      );
    })
  );
});
