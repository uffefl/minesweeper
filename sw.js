self.addEventListener("install", (e) => 
{
	console.log("ServiceWorker","install");
	e.waitUntil
	(
		caches.open("minesweeper-store").then((cache) => cache.addAll
		([
			"/minesweeper/",
			"/minesweeper/index.html",
			"/minesweeper/minesweeper.png",
			"/minesweeper/minesweeper.css",
			"/minesweeper/lib.js",
			"/minesweeper/minesweeper.js",
		])),
	);
});

self.addEventListener("fetch", (e) => 
{
	console.log("ServiceWorker","fetch",e.request.url);
	e.respondWith
	(
		caches.match(e.request).then((response) => response || fetch(e.request)),
	);
});