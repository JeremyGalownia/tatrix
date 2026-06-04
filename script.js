function formatConfig(cfg = {}) {
	let { rows, cols, gap, cellSize, padding, color } = cfg;
	let { t, b, l, r, c } = cfg.chars ?? {};

	rows = typeof rows === "number" ? Math.max(1, rows) : "fit";
	cols = typeof cols === "number" ? Math.max(1, cols) : "fit";

	gap = typeof gap === "number" ? Math.max(0.1, gap) : "auto";

	cellSize = typeof cellSize === "number" ? Math.max(1, cellSize) : 50;
	padding = typeof padding === "number" ? Math.max(0, padding) : 10;

	if (typeof color !== "string") color = "#777";

	if (typeof t !== "string") t = "│";
	if (typeof b !== "string") b = "╱";
	if (typeof l !== "string") l = "╲";
	if (typeof r !== "string") r = "─";
	if (typeof c !== "string") c = "☐";

	return {
		rows,
		cols,
		gap,
		cellSize,
		padding,
		color,
		chars: { t, b, l, r, c },
	};
}

function injectStyles() {
	if (document.getElementById("tatrix-styles")) return;

	const style = document.createElement("style");
	style.id = "tatrix-styles";
	style.textContent = `
    	.tatrix-grid {
      		display: grid;
      		grid-template-rows: repeat(var(--rows), var(--cell-size));
      		grid-template-columns: repeat(var(--cols), var(--cell-size));
      		color: var(--color);
      		gap: var(--gap);
      		padding: var(--padding);

      		.cell {
      			display: grid;
      			place-items: center;
      			width: var(--cell-size);
      			height: var(--cell-size);
      			border: 1px solid #222;
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
		this.config = formatConfig(config);
		this.state = {};
		this.cells = [];
		this.setConfig(this.config);
		this.updateLayout();
	}

	setConfig(cfg = {}) {
		if (cfg === null) return;
		const config = formatConfig(cfg);
		if (config === this.config) return;
		this.config = config;

		const { cellSize, padding, color } = config;
		const { rows, cols } = this._getDimensions();

		this.state = {
			...this.state,
			cellSize,
			padding,
			color,
			rows,
			cols,
			gap:
				config.gap === "auto"
					? this._calculateGap(padding, cellSize, rows, cols)
					: config.gap,
		};

		console.log(this.state);
		this.updateLayout();
	}

	updateLayout() {
		this.container.innerHTML = "";
		this.cells = [];

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

		for (let i = 0; i < this.state.rows; i++) {
			this.cells[i] = [];
			for (let j = 0; j < this.state.cols; j++) {
				const cell = document.createElement("span");
				// const span = document.createElement("span");
				cell.textContent = `${i},${j}`;
				cell.classList.add(`c${i}${j}`, "cell");
				// cell.appendChild(span);
				this.container.appendChild(cell);
				this.cells[i].push(cell);
			}
		}
	}

	_getDimensions() {
		const { rows, cols, padding, cellSize } = this.config;

		const availableW = this.container.clientWidth - padding * 2;
		const availableH = this.container.clientHeight - padding * 2;

		const gotRows =
			rows === "fit" ? Math.floor(availableH / cellSize) : rows;
		const gotCols =
			cols === "fit" ? Math.floor(availableW / cellSize) : cols;

		return { rows: gotRows, cols: gotCols };
	}

	_calculateGap(padding, cellSize, rows, cols) {
		if (rows <= 1 || cols <= 1) return 0;

		const availableW = this.container.clientWidth - padding * 2;
		const availableH = this.container.clientHeight - padding * 2;

		const gapW = (availableW - cols * cellSize) / (cols - 1);
		const gapH = (availableH - rows * cellSize) / (rows - 1);
		const gap = Math.min(gapW, gapH);
		return gap < 0.1 ? 0 : gap;
	}
}

const tatrix = new Tatrix("#grid");
