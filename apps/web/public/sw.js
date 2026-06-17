// Service Worker for LearningOS offline-first capability
const CACHE_NAME = "learning-os-v1";
const STATIC_ASSETS = [
  "/",
  "/login",
  "/register",
  "/student",
  "/teacher",
];

const API_CACHE_NAME = "learning-os-api-v1";
const OFFLINE_QUEUE_KEY = "offline-sync-queue";

// Install: cache static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Continue even if some assets fail to cache
        console.log("Some static assets failed to cache");
      });
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== API_CACHE_NAME)
          .map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for static
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // API requests: network-first with offline queue
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Static assets: cache-first
  if (
    request.method === "GET" &&
    (url.pathname.endsWith(".js") ||
      url.pathname.endsWith(".css") ||
      url.pathname.endsWith(".png") ||
      url.pathname.endsWith(".svg") ||
      url.pathname.endsWith(".woff2"))
  ) {
    event.respondWith(handleStaticRequest(request));
    return;
  }

  // Pages: network-first with cache fallback
  if (request.method === "GET" && request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(handlePageRequest(request));
    return;
  }

  event.respondWith(fetch(request));
});

async function handleApiRequest(request) {
  // For GET requests, try network first then cache
  if (request.method === "GET") {
    try {
      const response = await fetch(request);
      if (response.ok) {
        const cache = await caches.open(API_CACHE_NAME);
        cache.put(request, response.clone());
      }
      return response;
    } catch {
      const cached = await caches.match(request);
      if (cached) return cached;
      return new Response(
        JSON.stringify({ error: "Offline", offline: true }),
        { status: 503, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // For mutations, try network or queue for sync
  try {
    return await fetch(request);
  } catch {
    // Queue the request for later sync
    await queueForSync(request);
    return new Response(
      JSON.stringify({ queued: true, message: "Request queued for sync" }),
      { status: 202, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function handleStaticRequest(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("", { status: 503 });
  }
}

async function handlePageRequest(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const indexCached = await caches.match("/");
    if (indexCached) return indexCached;
    return new Response(
      "<html><body><h1>Offline</h1><p>Please check your connection.</p></body></html>",
      { headers: { "Content-Type": "text/html" } }
    );
  }
}

async function queueForSync(request) {
  try {
    const body = await request.clone().text();
    const queueItem = {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body,
      timestamp: Date.now(),
    };

    // Store in a simple approach using the cache API
    const cache = await caches.open(OFFLINE_QUEUE_KEY);
    const queueResponse = new Response(JSON.stringify(queueItem));
    await cache.put(`queue-${Date.now()}`, queueResponse);
  } catch (err) {
    console.error("Failed to queue request:", err);
  }
}

// Sync queued requests when back online
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-api-requests") {
    event.waitUntil(syncQueuedRequests());
  }
});

async function syncQueuedRequests() {
  try {
    const cache = await caches.open(OFFLINE_QUEUE_KEY);
    const keys = await cache.keys();
    
    for (const key of keys) {
      const response = await cache.match(key);
      if (!response) continue;
      
      const queueItem = await response.json();
      try {
        await fetch(queueItem.url, {
          method: queueItem.method,
          headers: queueItem.headers,
          body: queueItem.body || undefined,
        });
        await cache.delete(key);
      } catch {
        // Keep in queue if still offline
        console.log("Sync failed for:", queueItem.url);
      }
    }
  } catch (err) {
    console.error("Sync failed:", err);
  }
}

// Listen for messages from the main thread
self.addEventListener("message", (event) => {
  if (event.data === "sync-now") {
    syncQueuedRequests();
  }
});
