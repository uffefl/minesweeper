((window,$) =>
{
	if (!$)
	{
		console.error("minesweeper.js could not load; couldn't find jQuery");
		return;
	}

	if ("serviceWorker" in navigator)
	{
		navigator.serviceWorker
			.register("/minesweeper/sw.js")
			.then(() => { console.log("Service Worker Registered"); });
	}

	const Settings =
	{
		size:
		{
			label: "Size",
			values:
			[
				[125, "Small", "small"],
				[150, "Medium", "medium"],
				[200, "Large", "large"],
				[300, "Huge", "huge"],
				[500, "Gargantuan", "gargantuan"],
			],
			default: 150,
		},
		shape:
		{
			label: "Shape",
			values:
			[
				["full", "Full", "full"],
				["square", "Square", "square"],
			],
			default: false,
		},
		moat:
		{
			label: "Moat",
			values:
			[
				[0, "None", "no moat"],
				[1, "Tiny", "tiny moat"],
				[2, "Full", "full moat"],
			],
			default: 0,
		},
		density:
		{
			label: "Difficulty",
			values:
			[
				[0.10, "Easy", "easy"],
				[0.13, "Normal", "normal"],
				[0.15, "Hard", "hard"],
				[0.20, "Tricky", "tricky"],
				[0.25, "Insane", "insane"],
			],
			default: 0.13,
		},
	};
	Settings.size.options = Object.fromEntries(Settings.size.values.map(([v,l]) => [`${v}`,`${l} (~${v} tiles)`]));
	Settings.shape.options = Object.fromEntries(Settings.shape.values.map(([v,l]) => [`${v}`,`${l}`]));
	Settings.moat.options = Object.fromEntries(Settings.moat.values.map(([v,l]) => [`${v}`,v===0?l:v===1?`${l} (1 tile)`:`${l} (${v} tiles)`]));
	Settings.density.options = Object.fromEntries(Settings.density.values.map(([v,l]) => [`${v}`,`${l} (${Math.round(v*100)}%)`]));
	Settings.size.reverse = Object.fromEntries(Settings.size.values.map(([v,_,l]) => [`${v}`,`${l} (~${v} tiles)`]));
	Settings.shape.reverse = Object.fromEntries(Settings.shape.values.map(([v,_,l]) => [`${v}`,`${l}`]));
	Settings.moat.reverse = Object.fromEntries(Settings.moat.values.map(([v,_,l]) => [`${v}`,v===0?l:v===1?`${l} (1 tile)`:`${l} (${v} tiles)`]));
	Settings.density.reverse = Object.fromEntries(Settings.density.values.map(([v,_,l]) => [`${v}`,`${l} (${Math.round(v*100)}%)`]));
	function Initialize()
	{
		let ui = $("body").make("div#ui").addClass("hidden");
		ui.children().remove();
		$("<p>").text("Minesweeper").appendTo(ui);
		for (let [k,v] of Object.entries(Settings))
		{
			let label = $("<label>").appendTo(ui);
			$("<p>").text(v.label).appendTo(label);
			let select = $("<select>").attr("id",k).appendTo(label);
			for (let [val,text] of Object.entries(v.options))
			{
				$("<option>").attr("value",val).text(text).appendTo(select);
			}
		}
		$("<label><p>Personal best</p><p id=\"pb\"></p>").appendTo(ui);
		$("<button>").attr("id","start").text("Start!").appendTo(ui);

		let best = $("body").make("div#best").addClass("hidden");
		best.children().remove();
		$("<p><b>Personal best!</b></p>").appendTo(best);
		$("<p id=\"time\">Infinity s</p>").appendTo(best);
		$("<p id=\"settings\"></p>").appendTo(best);
		$("<button id=\"ok\">Great!</button>").appendTo(best);
	}

	class MineSweeper
	{
		NumTiles;
		Shape;
		Density;

		Width;
		Height;
		MoatSize;

		MineCount;
		FlagCount;

		constructor(numTiles,shape,density,moatSize)
		{
			this.NumTiles = numTiles;
			this.Shape = shape;
			this.Density = density;
			this.MoatSize = moatSize;
		}

		async Update()
		{
			let game = this;
			let go;
			let won=false;
			let lost=false;
			let queue = [];
			console.log("Update()","Starting game...");
			let root = game.Start();
			let remaining = $("#remaining");
			let time = $("#time");
			root.addClass("active");
			root.on("click contextmenu touchend","tile", OnFirstClick);
			await WaitForGo();
			function OnFirstClick(e)
			{
				go = true;
				e.preventDefault();
				Reveal($(e.target));
			}
			let time0 = new Date();
			root.off("click contextmenu touchend", "tile", OnFirstClick);
			console.log("Update()","First click received...");
			root.on("click contextmenu", "tile", OnClick)
				.on("touchstart", "tile", OnTouchStart)
				.on("touchend", "tile", OnTouchEnd)
				.on("touchcancel", "tile", OnTouchCancel)
				.on("touchmove", "tile", OnTouchMove);
			function OnClick(e)
			{
				let tile = $(e.target);
				if (e.type==="contextmenu" || tile.is(".shown"))
				{
					Reveal(tile);
				}
				else
				{
					Flag(tile);
				}
				e.preventDefault();
				if (won || lost) go = true;
			}
			let touched;
			function OnTouchStart(e)
			{
				if (touched) return;
				let tile = $(e.target);
				e.preventDefault();
				tile.addClass("active");
				let { left: x, top: y } = tile.offset();
				touched = 
				{
					tile: tile,
					x: x,
					y: y,
					width: tile.width(),
					height: tile.height(),
					when: new Date() 
				};
			}
			function OnTouchEnd(e)
			{
				if (!touched) return;
				let tile = $(e.target);
				if (!touched.tile.is(tile)) return;
				touched.tile.removeClass("active");
				e.preventDefault();
				let time = new Date() - touched.when;
				touched = undefined;
				if (tile.is(".hidden") && !tile.is(".moat")) 
				{
					if (time > 200)
					{
						Reveal(tile);
					}
					else
					{
						Flag(tile);
					}
				}
				else 
				{
					Reveal(tile);
				}
				if (won || lost) go = true;
			}
			function OnTouchCancel(e)
			{
				if (!touched) return;
				let tile = $(e.target);
				if (!touched.tile.is(tile)) return;
				touched.tile.removeClass("active");
				e.preventDefault();
				touched = undefined;
			}
			function OnTouchMove(e)
			{
				if (!touched) return;
				let tile = $(e.target);
				if (!touched.tile.is(tile)) return;
				let dx = e.targetTouches[0].pageX - touched.x;
				let dy = e.targetTouches[0].pageY - touched.y;
				if (dx<0 || dy<0 || dx>touched.width || dy>touched.height)
				{
					touched = undefined;
				}
				e.preventDefault();
			}
			while (true)
			{
				await Wait(0);
				if ((won || lost) && !queue.length) break;
				time.text(Math.floor((new Date()-time0)/1000));
				for (let i=0; queue.length && i<5; i++)
				{
					let tile = queue.pop();
					if (!tile.is(".hidden")) 
					{
						i--;
						continue;
					}
					tile.removeClass("hidden").addClass("shown");
					if (tile.is(".bomb")) 
					{
						lost = true;
						break;
					}
					let neighbors = game.Neighbors(tile);
					let flags = neighbors.filter(".flag").length;
					if (!tile.is(`.neighbor-${flags}`)) continue;
					neighbors.filter(".hidden:not(.flag)").each((i,e) => queue.splice(0,0,$(e)));
				}
				CheckWin();
			}
			let time1 = new Date();
			root.off("click contextmenu", "tile", OnClick);
			root.off("touchstart", "tile", OnTouchStart);
			root.off("touchend", "tile", OnTouchEnd);
			root.off("touchcancel", "tile", OnTouchCancel);
			root.off("touchmove", "tile", OnTouchMove);
			root.removeClass("active");
			$("body").toggleClass("won",!!won).toggleClass("lost",!!lost);
			console.log("Update()",`Game over. Duration ${(time1-time0)/1000} s.`);
			if (won)
			{
				let bestKey = `best ${this.NumTiles} ${this.MoatSize} ${this.Density}`
				let duration = (time1-time0)/1000;
				let best = localStorage[bestKey]===undefined ? Infinity : JSON.parse(localStorage[bestKey]);
				if (duration<best)
				{
					localStorage[bestKey] = JSON.stringify(duration);
					$("#best #time").text(`${Math.round(10*duration)/10} s`);
					$("#best #settings").text(`${Settings.size.reverse[this.NumTiles] ?? `${this.NumTiles} tiles`}, ${Settings.moat.reverse[this.MoatSize] ?? `${this.MoatSize} tile moat`}, ${Settings.density.reverse[this.Density] ?? `${Math.round(100*this.Density)}% difficulty`}`);
					$("#best").removeClass("hidden");
					$("#best button").on("click", OnGreat);
					await WaitForGo();
					function OnGreat(e)
					{
						go = true;
						e.preventDefault();
					}
					$("#best button").off("click", OnGreat);
					$("#best").addClass("hidden");
				}
			}

			function CheckWin()
			{
				if (lost) return;
				let hidden = root.find("> tile.hidden");
				let correct = hidden.filter(".flag.bomb");
				if (hidden.length===correct.length)
				{
					won = true;
				}
			}

			function ConsiderNeighbors(tile)
			{
				if (tile.is(".shown"))
				{
					let neighbors = game.Neighbors(tile);
					let flags = neighbors.filter(".flag").length;
					if (!tile.is(`.neighbor-${flags}`)) return;
					neighbors.filter(".hidden:not(.flag)").each((i,e) => queue.push($(e)));
				}
				else
				{
					game.Neighbors(tile).filter(".shown").each((i,e) => ConsiderNeighbors($(e)));
				}
			}

			function Reveal(tile)
			{
				if (tile.is(".hidden"))
				{
					if (tile.is(".flag")) return;
					tile.removeClass("hidden").addClass("shown");
					if (tile.is(".bomb")) 
					{
						lost = true;
					}
					else
					{
						ConsiderNeighbors(tile);
					}
				}
				else
				{
					ConsiderNeighbors(tile);
				}
				CheckWin();
			}

			function Flag(tile)
			{
				if (!tile.is(".hidden")) return;
				let removing = tile.is(".flag");
				if (removing)
				{
					game.FlagCount--;
					tile.removeClass("flag");
				}
				else
				{
					game.FlagCount++;
					tile.addClass("flag");
				}
				remaining.text(game.MineCount - game.FlagCount);
				ConsiderNeighbors(tile);
				CheckWin();
			}

			function Wait(ms)
			{
				ms = ms||0;
				go = false;
				let resolve;
				let p = new Promise(r => resolve=r);
				setTimeout(_ => resolve(), ms);
				return p;
			}

			function WaitForGo(ms)
			{
				ms = ms||10;
				go = false;
				let resolve;
				let p = new Promise(r => resolve=r);
				function busy() { if (go) resolve(); else setTimeout(busy, ms); }
				busy();
				return p;
			}

		}

		OnResize()
		{
			let border = 4;
			let root = $("#minesweeper");
			let vw = $(window).width() - 2*border;
			let vh = $(window).height() - 2*border;
			let dim = Math.floor(Math.min(vw/this.Width, vh/this.Height));
			root[0].style.setProperty("--dim", dim+"px");			
		}

		Start()
		{
			$("body").removeClass("won lost");
			let border = 4;
			let vw = $(window).width() - 2*border;
			let vh = $(window).height() - 2*border;

			if (this.Shape==="square")
			{
				if (vw>vh) vw = vh;
				else if (vh>vw) vh = vw;
			}

			// if (Math.min(vw,vh)>700)
			// {
			// 	vw = vh = Math.min(vw,vh)*0.8;
			// }

			// (vw-2*moat*dim)*(vh-(2*moat+1)*dim) = numTiles*dim*dim
			// vw*vh-2*moat*dim*vh-vw*(2*moat+1)*dim+2*moat*dim*(2*moat+1)*dim = numTiles*dim*dim
			// -dim*2*moat*vh-dim*vw*(2*moat+1)+dim*dim*2*moat*(2*moat+1)-numTiles*dim*dim = -vw*vh
			// dim*dim*(2*moat*(2*moat+1)-numTiles) + dim*(-2*moat*vh-vw*(2*moat+1)) + vw*vh = 0

			let a = 2*this.MoatSize*(2*this.MoatSize+1)-this.NumTiles;
			let b = -vh*2*this.MoatSize - vw*(2*this.MoatSize+1);
			let c = vw*vh;
			
			// let a = this.NumTiles + 4*this.MoatSize*this.MoatSize;
			// let b = 2*this.MoatSize*(vh + vw);
			// let c = -vw*vh;
			let d = b*b - 4*a*c;
			let s1 = (-b + Math.sqrt(d))/2/a;
			let s2 = (-b - Math.sqrt(d))/2/a;
			let dim = Math.floor(Math.max(s1,s2));

			this.Width = Math.floor(vw/dim);
			this.Height = Math.floor(vh/dim);

			// let notify = $("body").make("div.notify")
			// 	.text(`desired ${this.NumTiles} and got ${(this.Width-2*this.MoatSize)*(this.Height-2*this.MoatSize-1)}`);
			// setTimeout(_ => notify.remove(), 2000);
			console.log(`desired ${this.NumTiles} and got ${(this.Width-2*this.MoatSize)*(this.Height-2*this.MoatSize-1)}`);

			let root = $("#minesweeper");
			root.children().remove();

			let status = root.make("div#status");
			let remaining = status.make("div#remaining").text("—");
			let forfeit = status.make("button#forfeit").text("Forfeit!");
			let time = status.make("div#time").text("—");

			root[0].style.setProperty("--dim", dim+"px");

			root[0].style.setProperty("--width",this.Width);
			root[0].style.setProperty("--height",this.Height);
			root[0].style.setProperty("--min",Math.min(this.Width,this.Height));
			root[0].style.setProperty("--max",Math.max(this.Width,this.Height));
			for (let y=1; y<this.Height; y++)
			{
				for (let x=0; x<this.Width; x++)
				{
					let tile = root.make(`tile#x${x}y${y}.hidden`);
					tile[0].style.setProperty("--x",x);
					tile[0].style.setProperty("--y",y);
					tile[0].style.setProperty("--w",1);
					tile[0].style.setProperty("--h",1);
					tile[0].style.setProperty("--rnd",Math.random());
					tile.toggleClass("moat",x<this.MoatSize || x>this.Width-this.MoatSize-1 || y<this.MoatSize+1 || y>this.Height-this.MoatSize-1);
					tile.addClass(`nt-x${x-1}y${y-1}`); tile.addClass(`nt-x${ x }y${y-1}`); tile.addClass(`nt-x${x+1}y${y-1}`);
					tile.addClass(`nt-x${x-1}y${ y }`);                                     tile.addClass(`nt-x${x+1}y${ y }`);
					tile.addClass(`nt-x${x-1}y${y+1}`); tile.addClass(`nt-x${ x }y${y+1}`); tile.addClass(`nt-x${x+1}y${y+1}`);
				}
			}
			this.FlagCount = 0;
			this.MineCount = Math.round(this.Density*this.Width*(this.Height-1));
			for (let i=0; i<this.MineCount; i++)
			{
				let x = Math.floor(Math.random()*(this.Width - 2*this.MoatSize - 0.0001)) + this.MoatSize;
				let y = Math.floor(Math.random()*(this.Height - 2*this.MoatSize - 1 - 0.0001)) + this.MoatSize + 1;
				let tile = root.find(`> tile#x${x}y${y}`);
				if (!tile.length || tile.is(".bomb"))
				{
					i--;
					continue;
				}
				tile.addClass("bomb");
			}
			for (let y=0; y<this.Height; y++)
			{
				for (let x=0; x<this.Width; x++)
				{
					let tile = root.find(`> tile#x${x}y${y}`);
					if (tile.is(".bomb")) continue;
					let neighbors = this.Neighbors(tile);
					let count = neighbors.filter(".bomb").length;
					tile.addClass(`neighbor-${count}`);//.text(count||"")
				}
			}
			remaining.text(this.MineCount);
			return root;
		}

		Neighbors(tile)
		{
			return tile.parent().find(`> tile.nt-${tile.attr("id")}`);
		}

	}

	$(document).on("click", "#ui button", _ => PlayGame());

	$(document).on("change", "#ui", e =>
	{
		let input = e.target;
		let id = $(input).attr("id");
		let value = $(input).val();
		localStorage[id] = value;
		ShowPb();
		console.log("change",id,value);
	});

	function ShowPb()
	{
		let size = $("#ui #size").val();
		let moat = $("#ui #moat").val();
		let density = $("#ui #density").val();
		let bestKey = `best ${size} ${moat} ${density}`;
		let best = localStorage[bestKey];
		$("#ui #pb").text(best===undefined ?"" : `${Math.round(10*best)/10} s`);
	}

	async function PlayGame()
	{
		let ui = $("#ui");
		let size = parseFloat(ui.find("#size").val());
		let shape = ui.find("#shape").val();
		let moat = parseFloat(ui.find("#moat").val());
		let density = parseFloat(ui.find("#density").val());
		console.log("size",size,"density",density,"moat",moat);
		// return;
		let game = new MineSweeper(size,shape,density,moat);
		ui.addClass("hidden");
		$(window).on("resize", OnResize);
		await game.Update();
		$(window).off("resize", OnResize);
		ui.removeClass("hidden").find("button").focus();
		ShowPb();
		function OnResize() { return game.OnResize(); }
	} 

	async function OnLoad()
	{
		Initialize();
		if (localStorage.size) $("#ui #size").val(localStorage.size);
		if (localStorage.shape) $("#ui #shape").val(localStorage.shape);
		if (localStorage.moat) $("#ui #moat").val(localStorage.moat);
		if (localStorage.density) $("#ui #density").val(localStorage.density);
		$("#minesweeper").children().remove();
		$("#ui").removeClass("hidden").find("button").focus();
		ShowPb();
	}

	$(OnLoad);

})(window,window.jQuery);