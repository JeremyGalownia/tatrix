const DEFAULT_CONFIG = {
  rows: "fit",
  cols: "fit",
  gap: "auto",
  cellSize: 50,
  padding: 10,
  color: "#777",
};

class Tatrix {
  constructor(container, config = DEFAULT_CONFIG) {
    if (typeof container === "string")
      this.container = document.querySelector(container);
    else if (container instanceof HTMLElement) this.container = container;
    if (!this.container) throw new Error("container is required");
    this.container.classList.add("tatrix-grid");

    this.cols = null;
    this.rows = null;
    this.cellSize = null;
    this.gap = null;
    this.padding = null;
    this.cells = [];

    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setConfig(this.config);
    this.injectStyle();
    this.updateLayout();
  }

  _calculateGap() {
    const availableW = this.container.clientWidth - this.padding * 2;
    const availableH = this.container.clientHeight - this.padding * 2;

    const gapW = (availableW - this.cols * this.cellSize) / (this.cols - 1);
    const gapH = (availableH - this.rows * this.cellSize) / (this.rows - 1);
    console.log(gapW, gapH);
    return Math.min(gapW, gapH);
  }

  setConfig(config = {}) {
    if (config === null) return;
    const { rows, cols, cellSize, padding, color, width, height, gap } = config;

    if (typeof cellSize === "number" && cellSize > 0) this.cellSize = cellSize;
    if (typeof padding === "number" && padding >= 0) this.padding = padding;
    if (typeof color === "string") this.color = color;

    if (typeof width === "string" || typeof width === "number")
      this.width = width;
    if (typeof height === "string" || typeof height === "number")
      this.height = height;

    const formattedRows = this._formatDimension(rows, "rows");
    const formattedCols = this._formatDimension(cols, "cols");

    if (formattedRows !== null) this.rows = formattedRows;
    if (formattedCols !== null) this.cols = formattedCols;

    if (this.gap === null) this.gap = this._calculateGap();

    console.log(
      this.rows,
      this.cols,
      this.cellSize,
      this.padding,
      this.color,
      this.gap,
    );
  }

  injectStyle() {
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
        width: ${this.cellSize}px;
        height: ${this.cellSize}px;
        border: 1px solid #222;
      }
    }
    `;
    document.head.appendChild(style);
  }

  updateLayout() {
    this.container.innerHTML = "";
    this.cells = [];

    this.container.style.setProperty("--rows", this.rows);
    this.container.style.setProperty("--cols", this.cols);
    this.container.style.setProperty("--cell-size", `${this.cellSize}px`);
    this.container.style.setProperty("--gap", `${this.gap}px`);
    this.container.style.setProperty("--padding", `${this.padding}px`);
    this.container.style.setProperty("--color", this.color);

    for (let i = 0; i < this.rows; i++) {
      this.cells[i] = [];
      for (let j = 0; j < this.cols; j++) {
        const cell = document.createElement("div");
        const span = document.createElement("span");
        span.textContent = `${i},${j}`;
        cell.classList.add(`c${i}${j}`, "cell");
        cell.appendChild(span);
        this.container.appendChild(cell);
        this.cells[i].push(cell);
      }
    }
  }

  _formatDimension(val, type) {
    const length =
      type === "rows"
        ? this.container.clientHeight
        : this.container.clientWidth;

    const available = length - 2 * this.padding;
    const gap = parseInt(this.gap) || 0;
    if (val === "fit") return Math.floor(available / this.cellSize)
    if (typeof val === "number" && val > 0) return val;
    return null;
  }
}

const tatrix = new Tatrix("#grid");
