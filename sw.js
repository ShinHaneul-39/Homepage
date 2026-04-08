const CACHE_NAME = 'shin-haneul-portfolio-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './pages/career-table.html',
  './pages/blog.html',
  './pages/special-thanks.html',
  './assets/css/main.css',
  './assets/js/modules/components.js',
  './assets/js/core/main.js',
  './assets/js/core/site-data.js',
  './assets/js/core/theme-init.js',
  './assets/js/modules/time-utils.js',
  './assets/js/vendor/papaparse.min.js',
  './assets/js/pages/portfolio.js',
  './assets/js/pages/thanks.js',
  './assets/images/profile.png',
  './assets/images/banner.png'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Strategy for Data (CSV): Network First, falling back to Cache
  // 데이터 파일은 항상 최신 버전을 시도하고, 오프라인일 때만 캐시를 사용합니다.
  if (event.request.url.includes('.csv')) {
      event.respondWith(
          fetch(event.request)
              .then(response => {
                  // 네트워크 요청 성공 시 캐시 갱신
                  const responseToCache = response.clone();
                  caches.open(CACHE_NAME).then(cache => {
                      cache.put(event.request, responseToCache);
                  });
                  return response;
              })
              .catch(() => {
                  // 네트워크 실패(오프라인) 시 캐시 사용
                  return caches.match(event.request);
              })
      );
      return;
  }

  // Strategy for Static Assets: Cache First
  // 정적 자원은 캐시를 우선 사용하여 로딩 속도를 극대화합니다.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        // 유효하지 않은 응답은 캐시하지 않음
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return response;
      });
    })
  );
});
