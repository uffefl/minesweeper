((window,$) =>
{
	if (!$)
	{
		console.error("minesweeper.js could not load; couldn't find jQuery");
		return;
	}

	class MineSweeper
	{
		NumTiles;
		Density;

		Width;
		Height;
		MoatSize;

		constructor(numTiles,density,moatSize)
		{
			this.NumTiles = numTiles;
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
			root.addClass("active");
			root.on("click contextmenu touchend","tile", OnFirstClick);
			await WaitForGo();
			function OnFirstClick(e)
			{
				go = true;
				e.preventDefault();
				Reveal($(e.target));
			}
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
			root.off("click contextmenu", "tile", OnClick);
			root.off("touchstart", "tile", OnTouchStart);
			root.off("touchend", "tile", OnTouchEnd);
			root.off("touchcancel", "tile", OnTouchCancel);
			root.off("touchmove", "tile", OnTouchMove);
			root.removeClass("active");
			$("body").toggleClass("won",!!won).toggleClass("lost",!!lost);
			console.log("Update()","Game over.");

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
				tile.toggleClass("flag");
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

		Start()
		{
			$("body").removeClass("won lost");
			let border = 4;
			let vw = $(window).width() - 2*border;
			let vh = $(window).height() - 2*border;
			if (Math.min(vw,vh)>700)
			{
				vw = vh = Math.min(vw,vh)*0.8;
			}

			let a = this.NumTiles + 4*this.MoatSize*this.MoatSize;
			let b = 2*this.MoatSize*(vh + vw);
			let c = -vw*vh;
			let d = b*b - 4*a*c;
			let s1 = (-b + Math.sqrt(d))/2/a;
			let s2 = (-b - Math.sqrt(d))/2/a;
			let dim = Math.floor(Math.max(s1,s2));

			this.Width = Math.floor(vw/dim);
			this.Height = Math.floor(vh/dim);

			let notify = $("body").make("div.notify")
				.text(`desired ${this.NumTiles} and got ${(this.Width-2*this.MoatSize)*(this.Height-2*this.MoatSize)}`);
			setTimeout(_ => notify.remove(), 2000);

			let root = $("#minesweeper");
			root.children().remove();

			root[0].style.setProperty("--dim", dim+"px");

			root[0].style.setProperty("--width",this.Width);
			root[0].style.setProperty("--height",this.Height);
			root[0].style.setProperty("--min",Math.min(this.Width,this.Height));
			root[0].style.setProperty("--max",Math.max(this.Width,this.Height));
			for (let y=0; y<this.Height; y++)
			{
				for (let x=0; x<this.Width; x++)
				{
					let tile = root.make(`tile#x${x}y${y}.hidden`);
					tile[0].style.setProperty("--x",x);
					tile[0].style.setProperty("--y",y);
					tile[0].style.setProperty("--w",1);
					tile[0].style.setProperty("--h",1);
					tile[0].style.setProperty("--rnd",Math.random());
					tile.toggleClass("moat",x<this.MoatSize || x>this.Width-this.MoatSize-1 || y<this.MoatSize || y>this.Height-this.MoatSize-1);
					tile.addClass(`nt-x${x-1}y${y-1}`); tile.addClass(`nt-x${ x }y${y-1}`); tile.addClass(`nt-x${x+1}y${y-1}`);
					tile.addClass(`nt-x${x-1}y${ y }`);                                     tile.addClass(`nt-x${x+1}y${ y }`);
					tile.addClass(`nt-x${x-1}y${y+1}`); tile.addClass(`nt-x${ x }y${y+1}`); tile.addClass(`nt-x${x+1}y${y+1}`);
				}
			}
			let mineCount = this.Density*this.Width*this.Height;
			for (let i=0; i<mineCount; i++)
			{
				let x = Math.floor(Math.random()*(this.Width - 2*this.MoatSize - 0.0001)) + this.MoatSize;
				let y = Math.floor(Math.random()*(this.Height - 2*this.MoatSize - 0.0001)) + this.MoatSize;
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
			return root;
		}

		Neighbors(tile)
		{
			return tile.parent().find(`> tile.nt-${tile.attr("id")}`);
		}

	}

	$(document).on("click", "#ui button", _ => PlayGame());

	async function PlayGame()
	{
		let ui = $("#ui");
		let size = parseFloat(ui.find("#size").val());
		let moat = parseFloat(ui.find("#moat").val());
		let density = parseFloat(ui.find("#density").val());
		console.log("size",size,"density",density,"moat",moat);
		// return;
		let game = new MineSweeper(size,density,moat);
		ui.addClass("hidden");
		await game.Update();
		ui.removeClass("hidden").find("button").focus();
	} 

	async function OnLoad()
	{
		$("#minesweeper").children().remove();
		$("#ui").removeClass("hidden").find("button").focus();
	}

	$(OnLoad);

})(window,window.jQuery);