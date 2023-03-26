// RegExp.all()
(_ =>
{
	
	RegExp.prototype.all = function all(s)
	{
		s = s || "";
		if (!this.global) return this.exec(s);
		let a = [];
		let m;
		while ((m = this.exec(s)))
		{
			a.push(m);
		}
		return a;
	};
	
})();

// Promise.throttle()
(_ =>
{
	Promise.throttle = throttle;
	Promise.throttleIter = throttleIter;
	
	async function throttle(n,factory)
	{
		let count = 0;
		let r = factory();
		let pender;
		while (r)
		{
			count++;
			r.then(resolved);
			if (count<n)
			{
				r = factory();
				continue;
			}
			await new Promise(resolve => pender = resolve);
			pender = null;
			r = factory();
		}
		function resolved()
		{
			count--;
			if (pender) pender();
		}
	}
  
	async function throttleIter(n,iter)
	{
		return Promise.throttle(n, IterFactory(iter));
	}
  
	function IterFactory(iter)
	{
		return _ =>
		{
			let result = iter.next();
			if (result.done) return;
			return result.value;
		}
	}
  
})();

// Cached
(window =>
{
	class Cached
	{
		async get(href, timeout) {};
		async clear(href) {};
	}
	
	class CachesCached extends Cached
	{
		async get(href, timeout)
		{
			let request = new Request(href);
			let cache = await caches.open("mangadex");
			try 
			{
				let response = await cache.match(request);
				if (!response) throw "cache miss";
				let age = new Date() - new Date(response.headers.get("date"));
				if (timeout > 0 && age > timeout) throw "timeout";
				let text = await response.text();
				return text;
			} 
			catch (x)
			{
				if (timeout < 0) throw x;
				let response = await fetch(request);
				cache.put(request, response.clone());
				let text = await response.text();
				return text;
			}
		}
		async clear(href)
		{
			let request = new Request(href);
			let cache = await caches.open("mangadex");
			cache.delete(request);			
		}
	}
	window.Cached = Cached;
	window.CachesCached = CachesCached;
	
})(window);

// jQuery.make()
((window,$) =>
{
	if (!$)
	{
		console.error("Could not load jQuery.make(): could not find jQuery");
		return;
	}
	
	let selectors = /(>\s*)?\S+/g;
	let resel = /^(?:>\s*)?([-_\w][-_\w\d]*)?((?:\.[-_\w][-_\w\d]*)*)(?:#([-_\w][-_\w\d]*))?((?:\.[-_\w][-_\w\d]*)*)$/;
	
	$.fn.make = function make(selector)
	{
		let self = this;
		let found = self.find(selector);
		if (found.length) return found;
		let sels = selectors.all(selector).map(x => x[0]);
		while (sels.length)
		{
			let head = sels[0];
			sels.splice(0,1);
			let sub = self.find(head);
			if (sub.length) 
			{
				self = sub;
				continue;
			}
			let m = resel.exec(head);
			if (!m)
			{
				console.error("selector syntax error",selector,"at",head,"with",self[0]);
				return;
			}
			let [,name,classes,id,moreclasses] = m;
			self = $("<"+name+">").addClass((classes+moreclasses).replace(/\./g,' ')).appendTo(self);
			if (id) self.attr("id",id);
		}
		return self;
	}
	
})(window,window.jQuery);

