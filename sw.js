// 네트워크 우선, 실패하면 캐시. 한 번 플레이한 뒤에는 오프라인에서도 열린다.
// 새 버전은 기다리지 않고 바로 적용한다(옛 화면이 남는 것 방지).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    // no-cache: 브라우저 HTTP 캐시의 옛 파일을 쓰지 않고 서버에 매번 확인한다
    fetch(e.request, { cache: 'no-cache' }).then(res => {
      const copy = res.clone();
      caches.open('bungeoppang-v1').then(c => c.put(e.request, copy));
      return res;
    }).catch(() => caches.match(e.request))
  );
});
