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
			type: "dropdown",
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
			deciding: true,
			number: true,
			display: v => `${v} tiles`,
		},
		shape:
		{
			type: "dropdown",
			label: "Shape",
			values:
			[
				["full", "Full", "full"],
				["square", "Square", "square"],
			],
			default: "full",
			display: v => `${v} shape`,
		},
		moat:
		{
			type: "dropdown",
			label: "Moat",
			values:
			[
				[0, "None", "no moat"],
				[1, "Tiny", "tiny moat"],
				[2, "Full", "full moat"],
			],
			default: 0,
			deciding: true,
			number: true,
			display: v => `${v} tile moat`,
		},
		density:
		{
			type: "dropdown",
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
			deciding: true,
			number: true,
			display: v => `${Math.round(v*100)}% density`,
		},
	};
	const Options =
	{
		clearTile:
		{
			type: "radio",
			label: "Clear Tile",
			values:
			[
				["Left Click", "Left Click", "left click"],
				["Right Click", "Right Click", "right click"],
				["Long Click", "Long Click", "long click"],
			],
			default: "Right Click",
			display: v => `clear tile: ${v}`,
		},
		flagMine:
		{
			type: "radio",
			label: "Flag Mine",
			values:
			[
				["Left Click", "Left Click", "left click"],
				["Right Click", "Right Click", "right click"],
				["Long Click", "Long Click", "long click"],
			],
			default: "Left Click",
			display: v => `flag mine: ${v}`,
		},
		clearNeighbors:
		{
			type: "radio",
			label: "Clear Neighbors",
			values:
			[
				["Left Click", "Left Click", "left click"],
				["Right Click", "Right Click", "right click"],
				["Long Click", "Long Click", "long click"],
			],
			default: "Left Click",
			display: v => `clear neighbors: ${v}`,
		},
		autoClearEmpty:
		{
			type: "checkbox",
			group: "Auto Clear",
			label: "Empty Tiles",
			default: true,
			deciding: true,
			display: v => v ? "auto clear empty tiles" : "",
		},
		autoClearFlagged:
		{
			type: "checkbox",
			group: "Auto Clear",
			label: "Flagged Tiles",
			default: true,
			deciding: true,
			display: v => v ? "auto clear flagged tiles" : "",
		},
		autoFinishNoMines:
		{
			type: "checkbox",
			group: "Auto Finish",
			label: "No Mines Left",
			default: true,
			deciding: true,
			display: v => v ? "auto finish when no mines left" : "",
		},
		autoFinishOnlyMines:
		{
			type: "checkbox",
			group: "Auto Finish",
			label: "Only Mines Left",
			default: true,
			deciding: true,
			display: v => v ? "auto finish when only mines left" : "",
		}
	};
	Settings.size.options = Object.fromEntries(Settings.size.values.map(([v,l]) => [`${v}`,`${l} (~${v} tiles)`]));
	Settings.shape.options = Object.fromEntries(Settings.shape.values.map(([v,l]) => [`${v}`,`${l}`]));
	Settings.moat.options = Object.fromEntries(Settings.moat.values.map(([v,l]) => [`${v}`,v===0?l:v===1?`${l} (1 tile)`:`${l} (${v} tiles)`]));
	Settings.density.options = Object.fromEntries(Settings.density.values.map(([v,l]) => [`${v}`,`${l} (${Math.round(v*100)}%)`]));
	Settings.size.reverse = Object.fromEntries(Settings.size.values.map(([v,_,l]) => [`${v}`,`${l} (~${v} tiles)`]));
	Settings.shape.reverse = Object.fromEntries(Settings.shape.values.map(([v,_,l]) => [`${v}`,`${l}`]));
	Settings.moat.reverse = Object.fromEntries(Settings.moat.values.map(([v,_,l]) => [`${v}`,v===0?l:v===1?`${l} (1 tile)`:`${l} (${v} tiles)`]));
	Settings.density.reverse = Object.fromEntries(Settings.density.values.map(([v,_,l]) => [`${v}`,`${l} (${Math.round(v*100)}%)`]));

	Options.clearTile.options = Object.fromEntries(Options.clearTile.values.map(([v,l]) => [`${v}`,`${l}`]));
	Options.clearTile.reverse = Object.fromEntries(Options.clearTile.values.map(([v,_,l]) => [`${v}`,`${l}`]));
	Options.flagMine.options = Object.fromEntries(Options.flagMine.values.map(([v,l]) => [`${v}`,`${l}`]));
	Options.flagMine.reverse = Object.fromEntries(Options.flagMine.values.map(([v,_,l]) => [`${v}`,`${l}`]));
	Options.clearNeighbors.options = Object.fromEntries(Options.clearNeighbors.values.map(([v,l]) => [`${v}`,`${l}`]));
	Options.clearNeighbors.reverse = Object.fromEntries(Options.clearNeighbors.values.map(([v,_,l]) => [`${v}`,`${l}`]));

	function Dropdown(parent,k,v)
	{
		let label = $('<div class="group">').appendTo(parent);
		$("<p>").text(v.label).appendTo(label);
		let select = $("<select>").attr("name",k).appendTo(label);
		for (let [val,text] of Object.entries(v.options))
		{
			$("<option>").attr("value",val).text(text).appendTo(select);
		}
	}

	function Radio(parent,k,v)
	{
		let group = $('<div class="group">').appendTo(parent);
		$("<p>").text(v.label).appendTo(group);
		for (let [val,text] of Object.entries(v.options))
		{
			$(`<label><input type="radio" name="${k}" value="${val}"/>${text}</label>`).appendTo(group);
		}
	}

	function Checkbox(parent,k,text)
	{
		$(`<label><input type="checkbox" name="${k}"/>${text}</label>`).appendTo(parent);
	}

	function Initialize()
	{
		let ui = $("body").make("div#ui").addClass("hidden");
		ui.children().remove();

		let gameSettings = ui.make("div#settings");
		let heading1 = $("<p>").text("Minesweeper").appendTo(gameSettings);
		// let b1 = $("<button>&gt;&gt;</button>").appendTo(heading1);
		for (let [k,v] of Object.entries(Settings))
		{
			Dropdown(gameSettings, k, v);
		}
		$("<label><p>Personal best</p><p id=\"pb\"></p>").appendTo(gameSettings);
		$("<button>").attr("id","start").text("Start!").appendTo(gameSettings);

		let gameOptions = ui.make("div#options");
		$("<p>").text("Options").appendTo(gameOptions);
		let presets = $(`<div class="group">`).appendTo(gameOptions).append("<p>Presets</p>");
		presets.append("<button>Classic</button><button>Touch</button><button>Custom</button>");
		Radio(gameOptions, "clearTile", Options["clearTile"]);
		Radio(gameOptions, "flagMine", Options["flagMine"]);
		Radio(gameOptions, "clearNeighbors", Options["clearNeighbors"]);
		let autoClear = $('<div class="group">').appendTo(gameOptions).append("<p>Auto Clear</p>");
		Checkbox(autoClear,"autoClearEmpty",Options["autoClearEmpty"].label);
		Checkbox(autoClear,"autoClearFlagged",Options["autoClearFlagged"].label);
		let autoFinish = $('<div class="group">').appendTo(gameOptions).append("<p>Auto Finish</p>");
		Checkbox(autoFinish,"autoFinishNoMines",Options["autoFinishNoMines"].label);
		Checkbox(autoFinish,"autoFinishOnlyMines",Options["autoFinishOnlyMines"].label);

		let best = $("body").make("div#best").addClass("hidden");
		best.children().remove();
		$("<p><b>Personal best!</b></p>").appendTo(best);
		$("<p id=\"time\">Infinity s</p>").appendTo(best);
		$("<p id=\"settings\"></p>").appendTo(best);
		$("<button id=\"ok\">Great!</button>").appendTo(best);
	}

	class MineSweeper
	{
		BestKey;

		NumTiles;
		Shape;
		Density;

		Width;
		Height;
		MoatSize;

		AutoPlay;
		AutoPlaySpeed;

		MineCount;
		FlagCount;

		constructor(settings, bestKey)
		{
			this.NumTiles = settings.size;
			this.Shape = settings.shape;
			this.Density = settings.density;
			this.MoatSize = settings.moat;
			this.AutoPlay = settings.autoplay;
			this.AutoPlaySpeed = 100;//53000/94;

			this.BestKey = bestKey;
		}

		async Update()
		{
			let game = this;
			let go;
			let won=false;
			let lost=false;
			let queue = [];
			let readying = {};
			let placing = [];
			console.log("Update()","Starting game...");
			let root = game.Start();
			let remaining = $("#remaining");
			let time = $("#time");
			let debug = $("#debug");
			root.addClass("active");
			root.on("click contextmenu touchend","tile", OnFirstClick);
			await WaitForGo();
			function OnFirstClick(e)
			{
				go = true;
				if (e.ctrlKey)
				{
					game.AutoPlay = true;
				}
				e.preventDefault();
				Reveal($(e.target));
			}
			function OnLastClick(e)
			{
				go = true;
				e.preventDefault();
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
			let lastPlaced = new Date();
			// main loop
			while (true)
			{
				await Wait(0);
				// if game is over and entire queue has been reveal end the main loop
				if ((won || lost) && !queue.length) break;
				// update clock display
				time.text(Clock((new Date()-time0)/1000));
				// reveal (up to) 5 tiles in the queue
				for (let i=0; queue.length && i<5; i++)
				{
					let tile = queue.pop();
					if (!tile.is(".hidden")) 
					{
						i--;
						continue;
					}
					Reveal(tile);
				}
				// autoplay placement of flags
				if (placing.length && (new Date()-lastPlaced)>game.AutoPlaySpeed)
				{
					let tile = placing.pop();
					if (!tile.is(".flag"))
					{
						Flag(tile);
						lastPlaced = new Date();
					}
				}
				// check for game over conditions
				CheckWin();
				// update debug display
				debug.html(`queue: ${queue.length}<br>placing: ${placing.length}`);
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
			root.on("click contextmenu touchend", OnLastClick);
			await WaitForGo();
			root.off("click contextmenu touchend", OnLastClick);
			if (won && !game.AutoPlay)
			{
				let bestKey = this.BestKey;
				let duration = Math.floor((time1-time0)/1000);
				let best = localStorage[bestKey]===undefined ? Infinity : JSON.parse(localStorage[bestKey]);
				if (duration<best)
				{
					localStorage[bestKey] = JSON.stringify(duration);
					$("#best #time").text(Clock(duration));
					$("#best #settings").text(GetBestDescription());
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
					// neighbors.filter(".hidden:not(.flag)").each((i,e) => queue.push($(e)));
					neighbors.filter(".hidden:not(.flag)").each((i,e) => queue.splice(0,0,$(e)));
				}
				else
				{
					game.Neighbors(tile).filter(".shown").each((i,e) => ConsiderNeighbors($(e)));
				}
			}

			function ReadyNeighbors(tile)
			{
				let shown = game.Neighbors(tile).filter(".shown");
				function ReadyOrNot(tile)
				{
					let left = game.Neighbors(tile).filter(".hidden");
					if (tile.is(`.neighbor-${left.length}`))
					{
						readying[tile.attr("id")] = true;
						left.filter(":not(.flag)").each((i,e) => placing.push($(e)));
					}
				}
				shown.filter((i,e) => !readying[$(e).attr("id")]).each((i,e) => ReadyOrNot($(e)));
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
					if (game.AutoPlay)
					{
						ReadyNeighbors(tile);
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
			let random = splitmix32(); // TODO: optional player defined seed

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
			let forfeit = status.make("button#forfeit").text("Forfeit!").attr("title",`Seed: ${random.seed}`);
			let time = status.make("div#time").text("—");
			let debug = status.make("div#debug");

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
					tile[0].style.setProperty("--rnd",random());
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
				let x = Math.floor(random()*(this.Width - 2*this.MoatSize - 0.0001)) + this.MoatSize;
				let y = Math.floor(random()*(this.Height - 2*this.MoatSize - 1 - 0.0001)) + this.MoatSize + 1;
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
		let k = $(input).attr("name");
		let value = GetSetting(k);
		localStorage[k] = value;
		ShowPb();
		console.log("change",k,value);
	});

	function GetSetting(k)
	{
		let setting = Settings[k] ?? Options[k];
		let value;
		if (!setting)
		{
			console.log("unknown setting",k);
			return;
		}
		if (setting.type==="dropdown")
		{
			value = $(`#ui select[name="${k}"]`).val();
		}
		else if (setting.type==="radio")
		{
			value = $(`#ui input[type=radio][name="${k}"]:checked`).val();
		}
		else if (setting.type==="checkbox")
		{
			value = $(`#ui input[type=checkbox][name="${k}"]`).prop("checked");
		}
		else
		{
			console.log("unknown setting type", setting.type, "for key",k);
			return;
		}
		if (setting.number) value = parseFloat(value);
		return value;
	}

	function GetBestKey()
	{
		let deciding = [...Object.entries(Settings)] // , ...Object.entries(Options)] // TODO
			.filter(([k,v]) => v.deciding)
			.map(([k,v]) => `${k}=${GetSetting(k)}`)
			.join(" ");
		return `best ${deciding}`;
	}

	function GetBestDescription()
	{
		let deciding = [...Object.entries(Settings)] // , ...Object.entries(Options)] // TODO
			.filter(([k,v]) => v.deciding)
			.map(([k,setting]) =>
			{
				let value = GetSetting(k);
				return setting.reverse?.[value] ?? setting.display(value);
			})
			.filter(s => s)
			.join(", ");
		return deciding;
	}	

	function ShowPb()
	{
		let bestKey = GetBestKey();
		let best = localStorage[bestKey];
		$("#ui #pb").text(best===undefined ? "" : Clock(parseFloat(best)));
		// $("#ui #pb").text(best===undefined ? "" : `${Math.round(10*best)/10} s`);
	}

	function Clock(clock)
	{
		let hours = Math.floor(clock/60/60);
		let minutes = Math.floor(clock/60)%60;
		let seconds = Math.floor(clock)%60;
		hours = hours<=0 ? "" : hours+":";
		minutes = hours && minutes<10 ? "0"+minutes+":" : minutes+":";
		seconds = seconds<10 ? "0"+seconds : seconds+"";
		return hours+minutes+seconds;
	}

	async function PlayGame()
	{
		let settings = Object.fromEntries([...Object.keys(Settings), ...Object.keys(Options)]
			.map(k => [k,GetSetting(k)]));
		let bestKey = GetBestKey();
		console.log("settings", settings);
		console.log("bestKey", bestKey);
		// return;
		let game = new MineSweeper(settings, bestKey);
		let ui = $("#ui");
		ui.addClass("hidden");
		$(window).on("resize", OnResize);
		await game.Update();
		$(window).off("resize", OnResize);
		ui.removeClass("hidden").find("button").focus();
		ShowPb();
		function OnResize() { return game.OnResize(); }
	} 

	function RestoreSetting(k)
	{
		let setting = Settings[k] ?? Options[k];
		let val = localStorage[k] ?? setting.default;
		if (setting.type==="dropdown")
		{
			console.log("restoring","dropdown",k,"to",val);
			$(`#ui select[name="${k}"]`).val(val);
			return;
		}
		if (setting.type==="radio")
		{
			console.log("restoring","radio",k,"to",val);
			$(`#ui input[type=radio][name="${k}"][value="${val}"]`).prop("checked",true);
			return;
		}
		if (setting.type==="checkbox")
		{
			console.log("restoring","checkbox",k,"to",val);
			$(`#ui input[type=checkbox][name="${k}"]`).prop("checked",val==="true");
			return;
		}
		console.log("unknown setting type",setting.type,"for key",k);
	}

	function splitmix32(seed)
	{
		// Source - https://stackoverflow.com/a/47593316
		// Posted by bryc, modified by community. See post 'Timeline' for change history
		// Retrieved 2026-03-14, License - CC BY-SA 4.0
		function splitmix32(a)
		{
			return function()
			{
				a |= 0;
				a = a + 0x9e3779b9 | 0;
				let t = a ^ a >>> 16;
				t = Math.imul(t, 0x21f0aaad);
				t = t ^ t >>> 15;
				t = Math.imul(t, 0x735a2d97);
				return ((t = t ^ t >>> 15) >>> 0) / 4294967296;
			}
		}
		seed = (seed===undefined?Math.random()*2**32:seed)>>>0;
		let random = splitmix32(seed);
		random.seed = seed;
		return random;
	}

	async function OnLoad()
	{
		Initialize();
		for (let k of Object.keys(Settings))
		{
			RestoreSetting(k);
		}
		for (let k of Object.keys(Options))
		{
			RestoreSetting(k);
		}
		$("#minesweeper").children().remove();
		$("#ui").removeClass("hidden").find("button").focus();
		ShowPb();
	}

	$(OnLoad);

})(window,window.jQuery);