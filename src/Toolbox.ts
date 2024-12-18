import { SelectedTool, TileType } from "./types";

export type ToolSelectCallback = (tool: SelectedTool) => void;

export class Toolbox {
  private toolboxElement: HTMLElement;
  private selectedTool: SelectedTool = { type: null, size: 1 };
  private onToolSelect: ToolSelectCallback;

  constructor(toolboxId: string, onToolSelect: ToolSelectCallback) {
    const toolbox = document.getElementById(toolboxId);
    if (!toolbox) {
      throw new Error(`Toolbox element with ID "${toolboxId}" not found.`);
    }
    this.toolboxElement = toolbox;
    this.onToolSelect = onToolSelect;
    this.initializeTools();
  }

  private initializeTools(): void {
    this.toolboxElement
      .querySelectorAll<HTMLElement>(".tool")
      .forEach((tool) => {
        tool.addEventListener("click", () => this.selectTool(tool));
      });
  }

  private selectTool(toolElement: HTMLElement): void {
    this.toolboxElement
      .querySelectorAll<HTMLElement>(".tool")
      .forEach((t) => t.classList.remove("selected"));

    toolElement.classList.add("selected");

    const type = toolElement.getAttribute("data-type") as TileType | null;
    const sizeAttr = toolElement.getAttribute("data-size");
    const size = sizeAttr ? parseInt(sizeAttr, 10) : 1;
    this.selectedTool = { type, size };

    this.onToolSelect(this.selectedTool);
  }

  getSelectedTool(): SelectedTool {
    return this.selectedTool;
  }
}
