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
		border,
	} = cfg;
	let { t, b, l, r, c } = cfg.chars ?? {};

	rows = typeof rows === "number" ? Math.max(1, rows) : "auto";
	cols = typeof cols === "number" ? Math.max(1, cols) : "auto";

	gap = typeof gap === "number" ? Math.max(0, gap) : "auto";

	cellSize =
		typeof cellSize === "number"
			? Math.max(10, cellSize)
			: cellSize !== "auto"
				? 50
				: "auto";

	padding = typeof padding === "number" ? Math.max(0, padding) : "auto";

	center = typeof center === "boolean" ? center : false;
	overflow = typeof overflow === "boolean" ? overflow : false;
	speed = typeof speed === "number" ? Math.max(0, speed) : 0;
	resize = typeof resize === "boolean" ? resize : true;
	border = typeof border === "string" ? border : "unset";

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
		border,
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
			padding: var(--padV) var(--padH);
			overflow: hidden;
			&.center {
				place-content: center;
			}

      		.cell {
        		border: var(--border);
        		display: inline-grid;
        		place-content: center;
        		font-size: var(--cell-size);
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
		this.running = false;
		this.setConfig(this.config, true);

		if (this.config.resize) {
			this.observer = new ResizeObserver((entries) => {
				for (const _ of entries) this.setConfig(this.config);
			});

			this.observer.observe(this.container);
		}
	}

	updateConfig(cfg = {}) {
		const config = formatConfig({ ...this.config, ...cfg });
		this.setConfig(config);
	}

	setConfig(cfg = {}, rebuild = false) {
		const config = formatConfig(cfg);
		const lastState = this.state;
		const {
			rows: lastRows,
			cols: lastCols,
			overflow: lastOverflow,
		} = lastState;

		this.config = config;

		const dims = this._getDimensions();
		let { rows, cols } = dims;
		let { cellSize, padding, color, gap, center, overflow, border } =
			config;

		cellSize = cellSize === "auto" ? dims.cellSize : cellSize;

		if (overflow) {
			rows += 2;
			cols += 2;
		}

		const {
			gap: gapF,
			padH,
			padV,
		} = this._calculateSpacing(padding, cellSize, rows, cols, gap);

		this.container.classList.toggle("center", center);

		this.state = {
			...this.state,
			cellSize,
			color,
			rows,
			cols,
			overflow,
			padH,
			padV,
			border,
			gap: gapF,
		};

		this.updateCssVars();
		if (rebuild) this.rebuildCells();
		else if (
			lastRows !== rows ||
			lastCols !== cols ||
			lastOverflow !== overflow
		)
			this.updateCells(lastState);
	}

	updateCssVars() {
		this.container.style.setProperty("--rows", this.state.rows);
		this.container.style.setProperty("--border", this.state.border);
		this.container.style.setProperty("--cols", this.state.cols);
		this.container.style.setProperty(
			"--cell-size",
			`${this.state.cellSize}px`,
		);
		this.container.style.setProperty("--gap", `${this.state.gap}px`);
		this.container.style.setProperty("--padH", `${this.state.padH}px`);
		this.container.style.setProperty("--padV", `${this.state.padV}px`);
		this.container.style.setProperty("--color", this.state.color);
	}

	rebuildCells() {
		this.container.innerHTML = "";
		this.cells = [];

		for (let i = 0; i < this.state.rows; i++) {
			this.cells[i] = [];
			for (let j = 0; j < this.state.cols; j++) {
				const cell = document.createElement("span");
				cell.textContent = this.config.chars.c;
				cell.classList.add(`c${i}-${j}`, "cell");
				this.container.appendChild(cell);
				this.cells[i].push(cell);
			}
		}
	}

	updateCells(lastState) {
		const lastRows = lastState?.rows ?? 0;
		const lastCols = lastState?.cols ?? 0;

		const currRows = this.state.rows;
		const currCols = this.state.cols;

		const diffRows = currRows - lastRows;
		const diffCols = currCols - lastCols;

		if (diffRows < 0)
			for (let i = currRows; i < lastRows; i++)
				for (const cell of this.cells.pop()) cell.remove();

		if (diffCols < 0)
			for (let i = 0; i < -diffCols; i++)
				for (const row of this.cells) row.pop().remove();

		if (diffRows > 0) {
			const frag = document.createDocumentFragment();
			for (let i = lastRows; i < currRows; i++) {
				this.cells.push([]);
				const row = [];
				for (let c = 0; c < currCols; c++) {
					const cell = document.createElement("span");
					cell.textContent = this.config.chars.c;
					cell.classList.add(
						`c${this.cells.length - 1}-${c}`,
						"cell",
					);
					frag.appendChild(cell);
					row.push(cell);
				}

				this.cells.push(row);
			}
			this.container.appendChild(frag);
		}

		if (diffCols > 0) {
			for (let r = 0; r < this.cells.length; r++) {
				const row = this.cells[r];

				for (let i = 0; i < diffCols; i++) {
					const cell = document.createElement("span");
					cell.textContent = this.config.chars.c;
					cell.className = `c${r}-${i + lastCols} cell`;

					const ref = this._getInsertBefore(r, i + lastCols);

					this.container.insertBefore(cell, ref);
					row.push(cell);
				}
			}
		}
	}

	_getInsertBefore(rowIndex, colIndex) {
		const rows = this.cells.length;
		const cols = this.cells[0]?.length ?? 0;

		const flatIndex = rowIndex * cols + colIndex;
		return this.container.children[flatIndex] || null;
	}

	_getDimensions() {
		const { rows, cols, padding, cellSize } = this.config;

		const padded = typeof padding === "number" ? padding : 0;

		const availableW = Math.max(this.container.clientWidth - padded * 2, 0);
		const availableH = Math.max(
			this.container.clientHeight - padded * 2,
			0,
		);

		if (!isFinite(availableW) || !isFinite(availableH)) {
			return { rows: 1, cols: 1, cellSize: 10 };
		}

		if (cellSize === "auto") {
			const maxCellH =
				typeof rows === "string"
					? Infinity
					: Math.min(availableH / rows, availableW / rows);

			const maxCellW =
				typeof cols === "string"
					? Infinity
					: Math.min(availableW / cols, availableH / cols);

			let size = Math.floor(Math.min(maxCellH, maxCellW));

			if (!isFinite(size) || size <= 0)
				return {
					rows: 0,
					cols: 0,
					cellSize: 0,
				};

			const gotRows =
				rows === "auto" ? Math.floor(availableH / size) : rows;

			const gotCols =
				cols === "auto" ? Math.floor(availableW / size) : cols;

			return {
				rows: gotRows,
				cols: gotCols,
				cellSize: size,
			};
		}

		const gotRows =
			rows === "auto" ? Math.floor(availableH / cellSize) : rows;
		const gotCols =
			cols === "auto" ? Math.floor(availableW / cellSize) : cols;

		return { rows: gotRows, cols: gotCols };
	}

	_calculateSpacing(padding, cellSize, rows, cols, gapp) {
		const autoPad = padding === "auto";
		const padded = autoPad ? 0 : padding;
		const gapped = gapp === "auto" ? 0 : gapp;

		const availableW = Math.max(this.container.clientWidth - padded * 2, 0);
		const availableH = Math.max(
			this.container.clientHeight - padded * 2,
			0,
		);

		const gapWidth = (cols - 1) * gapped;
		const gapHeight = (rows - 1) * gapped;

		let colsFormated = cols - 1;
		let rowsFormated = rows - 1;

		if (colsFormated == 0) colsFormated = 1;
		if (rowsFormated == 0) rowsFormated = 1;

		const takenH = cols * cellSize + gapWidth;
		const takenV = rows * cellSize + gapHeight;

		const leftH = Math.max(availableW - takenH, 0);
		const leftV = Math.max(availableH - takenV, 0);

		const spaceH = leftH / (colsFormated + (autoPad ? 2 : 0));
		const spaceV = leftV / (rowsFormated + (autoPad ? 2 : 0));

		const gap = Math.max(spaceH, spaceV);

		return {
			gap: gapp === "auto" ? (gap < 0.2 ? 0 : gap) : gapp,
			padH: autoPad ? spaceH : padded,
			padV: autoPad ? spaceV : padded,
		};
	}
}

window.tatrix = new Tatrix("#grid", {
	cellSize: 50,
	rows: 4,
	cols: 4,
	center: true,
	overflow: true,
	gap: 0,
	border: "1px solid #222",
});
