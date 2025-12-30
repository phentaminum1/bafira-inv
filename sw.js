// sw.js DINONAKTIFKAN SEMENTARA
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", () => {
  self.clients.claim();
});
