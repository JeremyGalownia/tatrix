function formatConfig(cfg = {}) {
	let {
		rows,
		cols,
		gap,
		cellSize,
		padding,
		color,
		center,
		overflow,
		speed,
		resize,
	} = cfg;
	let { t, b, l, r, c } = cfg.chars ?? {};

	rows = typeof rows === "number" ? Math.max(1, rows) : "fit";
	cols = typeof cols === "number" ? Math.max(1, cols) : "fit";

	gap = typeof gap === "number" ? Math.max(0.1, gap) : "auto";

	cellSize =
		typeof cellSize === "number"
			? Math.max(10, cellSize)
			: cellSize !== "auto"
				? 50
				: "auto";

	padding =
		typeof padding === "number"
			? Math.max(0, padding)
			: padding !== "auto"
				? 10
				: "auto";

	center = typeof center === "boolean" ? center : false;
	overflow = typeof overflow === "boolean" ? overflow : false;
	speed = typeof speed === "number" ? Math.max(0, speed) : 0;
	resize = typeof resize === "boolean" ? resize : true;

	if (typeof color !== "string") color = "#444";

	if (typeof t !== "string") t = "│";
	if (typeof b !== "string") b = "╱";
	if (typeof l !== "string") l = "╲";
	if (typeof r !== "string") r = "─";
	if (typeof c !== "string") c = " ";

	return {
		rows,
		cols,
		gap,
		cellSize,
		padding,
		color,
		center,
		overflow,
		speed,
		resize,
		chars: { t, b, l, r, c },
	};
}

function injectStyles() {
	if (document.getElementById("tatrix-styles")) return;

	const style = document.createElement("style");
	style.id = "tatrix-styles";
	style.textContent = `
		@import url('https://fonts.googleapis.com/css2?family=LXGW+WenKai+Mono+TC&display=swap');

		.tatrix-grid {
			font-family: 'LXGW WenKai Mono TC';
			display: grid;
			grid-template-rows: repeat(var(--rows), var(--cell-size));
			grid-template-columns: repeat(var(--cols), var(--cell-size));
			color: var(--color);
			gap: var(--gap);
			padding: var(--padding);
			overflow: hidden;
			&.center {
				place-content: center;
			}

      		.cell {
        		display: inline-flex;
        		align-items: center;
        		justify-content: center;
        		font-size: var(--cell-size);
      			place-items: center;
      			width: var(--cell-size);
      			height: var(--cell-size);
         		overflow: hidden;

      		}
      	}
      	`;
	document.head.appendChild(style);
}

class Tatrix {
	constructor(container, config = {}) {
		this.container =
			typeof container === "string"
				? document.querySelector(container)
				: container instanceof HTMLElement
					? container
					: null;

		if (!this.container) throw new Error("container is required");

		injectStyles();

		this.container.classList.add("tatrix-grid");
		this.config = config;
		this.state = {};
		this.cells = [];
		this.raf = null;
		this.setConfig(this.config);

		if (this.config.resize) {
			this.observer = new ResizeObserver((entries) => {
				for (const _ of entries) this.setConfig(this.config);
			});

			this.observer.observe(this.container);
		}
	}

	setConfig(cfg = {}) {
		const config = formatConfig(cfg);
		const lastState = this.state;

		this.config = config;

		const dims = this._getDimensions();
		let { rows, cols } = dims;
		let { cellSize, padding, color, gap, center, overflow } = config;
		if (overflow) {
			rows += 1;
			cols += 1;
		}
		cellSize = cellSize === "auto" ? dims.cellSize : cellSize;

		const space = this._calculateGap(
			padding,
			cellSize,
			rows,
			cols,
			padding === "auto",
		);

		this.container.classList.toggle("center", center);

		padding = padding === "auto" ? space : padding;

		this.state = {
			...this.state,
			cellSize,
			padding,
			color,
			rows,
			cols,
			gap:
				gap === "auto"
					? this._calculateGap(padding, cellSize, rows, cols)
					: gap,
		};

		if (lastState.rows !== rows || lastState.cols !== cols)
			this.rebuildCells();
		this.updateCssVars();
	}

	resize() {
		const { rows, cols } = this.state;
		const { nRows, nCols } = this.config;

		if (rows !== nRows || cols !== nCols) {
			this.state = {
				...this.state,
				rows: nRows,
				cols: nCols,
			};
			this.rebuildCells();
		}
	}

	updateCssVars() {
		this.container.style.setProperty("--rows", this.state.rows);
		this.container.style.setProperty("--cols", this.state.cols);
		this.container.style.setProperty(
			"--cell-size",
			`${this.state.cellSize}px`,
		);
		this.container.style.setProperty("--gap", `${this.state.gap}px`);
		this.container.style.setProperty(
			"--padding",
			`${this.state.padding}px`,
		);
		this.container.style.setProperty("--color", this.state.color);
	}

	rebuildCells() {
		this.container.innerHTML = "";
		this.cells = [];
		this.updateCssVars();

		for (let i = 0; i < this.state.rows; i++) {
			this.cells[i] = [];
			for (let j = 0; j < this.state.cols; j++) {
				const cell = document.createElement("span");
				cell.textContent = this.config.chars.c;
				cell.classList.add(`c${i}${j}`, "cell");
				this.container.appendChild(cell);
				this.cells[i].push(cell);
			}
		}
	}

	_getDimensions() {
		const { rows, cols, padding, cellSize } = this.config;

		const pad = typeof padding === "number" ? padding : 0;

		const availableW = this.container.clientWidth - pad * 2;
		const availableH = this.container.clientHeight - pad * 2;

		if (cellSize === "auto") {
			const maxCellH =
				typeof rows === "string" ? Infinity : availableH / rows;

			const maxCellW =
				typeof cols === "string" ? Infinity : availableW / cols;

			const size = Math.floor(Math.min(maxCellH, maxCellW));

			const gotRows =
				rows === "fit" ? Math.floor(availableH / size) : rows;
			const gotCols =
				cols === "fit" ? Math.floor(availableW / size) : cols;

			return {
				rows: gotRows,
				cols: gotCols,
				cellSize: size,
			};
		}

		const gotRows =
			rows === "fit" ? Math.floor(availableH / cellSize) : rows;
		const gotCols =
			cols === "fit" ? Math.floor(availableW / cellSize) : cols;

		return { rows: gotRows, cols: gotCols };
	}

	_calculateGap(padding, cellSize, rows, cols, pad) {
		if (rows <= 1 && cols <= 1) return 0;

		const padded = pad ? 0 : padding;

		const availableW = this.container.clientWidth - padded * 2;
		const availableH = this.container.clientHeight - padded * 2;

		const gapW = (availableW - cols * cellSize) / (cols - 1);
		const gapH = (availableH - rows * cellSize) / (rows - 1);

		let gap = Math.min(gapW, gapH);
		if (cols === 1) gap = gapH;
		if (rows === 1) gap = gapW;

		return gap < 0.3 ? 0 : gap;
	}
}

const tatrix = new Tatrix("#grid", {
	cellSize: "auto",
	cols: "fit",
	rows: 10,
	padding: "auto",
	center: true,
	overflow: true,
	chars: {
		c: "1",
	},
});
