// 最小構成の Service Worker（PWA インストール要件用）。
// 録音・文字起こし・要約・チャットはすべて IndexedDB に保存されるため、ここではキャッシュ戦略を持たない。
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // パススルー（ネットワークへ素通し）
});
