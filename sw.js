self.addEventListener('install', (e) => 
{
	e.waitUntil
	(
		caches.open('minesweeper-store').then((cache) => cache.addAll
		([
			'/',
			'/index.html',
			'/minesweeper.png',
			'/minesweeper.css',
			'/lib.js',
			'/minesweeper.js',
		])),
	);
});

self.addEventListener('fetch', (e) => 
{
	console.log(e.request.url);
	e.respondWith
	(
		caches.match(e.request).then((response) => response || fetch(e.request)),
	);
});