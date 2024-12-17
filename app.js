const canvas = document.getElementById("gridCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// Grid and placement settings
const gridSize = 50;
let offsetX = 0, offsetY = 0;
let isDragging = false;
let dragStartX, dragStartY;

let selectedTool = { type: null, size: 1 };
const placedTiles = [];
let bearTrapPosition = null; // Center position of the bear trap
let isInPlacementMode = false;
let previewTile = null;

// City names management
let cityNames = [];
let nameAssignments = {};

// Modal elements
const modal = document.getElementById("nameModal");
const nameInput = document.getElementById("cityNamesInput");
const configureNamesBtn = document.getElementById("configureNames");
const saveNamesBtn = document.getElementById("saveNames");
const closeModalBtn = document.getElementById("closeModal");

// Open modal to configure city names
configureNamesBtn.addEventListener("click", () => {
    modal.style.display = "block";
});

// Save city names
saveNamesBtn.addEventListener("click", () => {
    cityNames = nameInput.value.split("\n").filter(name => name.trim() !== "");
    assignCityNames();
    modal.style.display = "none";
    drawGrid();
});

// Close modal
closeModalBtn.addEventListener("click", () => {
    modal.style.display = "none";
});

// Toolbox interaction
document.querySelectorAll(".tool").forEach(tool => {
    tool.addEventListener("click", () => {
        document.querySelectorAll(".tool").forEach(t => t.classList.remove("selected"));
        tool.classList.add("selected");
        selectedTool.type = tool.getAttribute("data-type");
        selectedTool.size = parseInt(tool.getAttribute("data-size"), 10);
        if (selectedTool.type !== "eraser") enterPlacementMode();
        else exitPlacementMode();
    });
});

// Mouse click logic
canvas.addEventListener("click", (e) => {
    const gridX = Math.floor((e.clientX + offsetX) / gridSize);
    const gridY = Math.floor((e.clientY + offsetY) / gridSize);

    // Erase tiles
    if (selectedTool.type === "eraser") {
        for (let i = 0; i < placedTiles.length; i++) {
            const tile = placedTiles[i];
            if (gridX >= tile.x && gridX < tile.x + tile.size &&
                gridY >= tile.y && gridY < tile.y + tile.size) {
                placedTiles.splice(i, 1);
                if (tile.type === "bear_trap") bearTrapPosition = null;
                assignCityNames();
                drawGrid();
                return;
            }
        }
    }

    // Re-enter placement mode
    if (!isInPlacementMode) {
        for (let i = 0; i < placedTiles.length; i++) {
            const tile = placedTiles[i];
            if (gridX >= tile.x && gridX < tile.x + tile.size &&
                gridY >= tile.y && gridY < tile.y + tile.size) {
                selectedTool = { type: tile.type, size: tile.size };
                jumpToTile(tile, i);
                return;
            }
        }
    }
});

// Enter placement mode
function enterPlacementMode() {
    isInPlacementMode = true;
    updatePreviewTile();
    drawGrid();
    renderPlacementButtons();
}

// Jump to the clicked tile for editing
function jumpToTile(tile, index) {
    placedTiles.splice(index, 1);
    offsetX = tile.x * gridSize - canvas.width / 2 + (tile.size * gridSize) / 2;
    offsetY = tile.y * gridSize - canvas.height / 2 + (tile.size * gridSize) / 2;
    previewTile = { ...tile };
    isInPlacementMode = true;
    drawGrid();
    renderPlacementButtons();
}

// Update the preview tile
function updatePreviewTile() {
    const gridCenterX = Math.floor((canvas.width / 2 + offsetX) / gridSize - selectedTool.size / 2);
    const gridCenterY = Math.floor((canvas.height / 2 + offsetY) / gridSize - selectedTool.size / 2);

    previewTile = {
        x: gridCenterX,
        y: gridCenterY,
        type: selectedTool.type,
        size: selectedTool.size
    };
}

// Confirm placement
function confirmPlacement() {
    if (previewTile) {
        if (previewTile.type === "bear_trap") {
            bearTrapPosition = { x: previewTile.x + 1.5, y: previewTile.y + 1.5 };
        }
        placedTiles.push(previewTile);
        assignCityNames();
        exitPlacementMode();
    }
}

// DOM elements
const configNameInput = document.getElementById("configName");
const configList = document.getElementById("configList");
const saveConfigBtn = document.getElementById("saveConfig");
const loadConfigBtn = document.getElementById("loadConfig");
const deleteConfigBtn = document.getElementById("deleteConfig");

// Load configurations from localStorage
function loadConfigList() {
    configList.innerHTML = '<option value="">-- Select Configuration --</option>';
    const configs = JSON.parse(localStorage.getItem("tileConfigs")) || {};
    for (let name in configs) {
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        configList.appendChild(option);
    }
}

// Save the current configuration
saveConfigBtn.addEventListener("click", () => {
    const configName = configNameInput.value.trim();
    if (!configName) {
        alert("Please enter a configuration name.");
        return;
    }

    const configs = JSON.parse(localStorage.getItem("tileConfigs")) || {};
    configs[configName] = {
        placedTiles: JSON.stringify(placedTiles),
        cityNames: cityNames
    };

    localStorage.setItem("tileConfigs", JSON.stringify(configs));
    loadConfigList();
    alert(`Configuration "${configName}" saved successfully!`);
});

// Load a configuration
loadConfigBtn.addEventListener("click", () => {
    const selectedConfig = configList.value;
    if (!selectedConfig) {
        alert("Please select a configuration to load.");
        return;
    }
    loadConfiguration(selectedConfig);
});

function loadConfiguration(configName) {
    const configs = JSON.parse(localStorage.getItem("tileConfigs")) || {};
    const config = configs[configName];
    if (config) {
        placedTiles.length = 0;
        placedTiles.push(...JSON.parse(config.placedTiles));
        cityNames = config.cityNames;

        // Recalculate bear trap position if necessary
        const bearTrap = placedTiles.find(tile => tile.type === "bear_trap");
        bearTrapPosition = bearTrap ? { x: bearTrap.x + 1.5, y: bearTrap.y + 1.5 } : null;

        assignCityNames();
        drawGrid();
        alert(`Configuration "${configName}" loaded successfully!`);
    }
}

// Delete a configuration
deleteConfigBtn.addEventListener("click", () => {
    const selectedConfig = configList.value;
    if (!selectedConfig) {
        alert("Please select a configuration to delete.");
        return;
    }

    const configs = JSON.parse(localStorage.getItem("tileConfigs")) || {};
    delete configs[selectedConfig];
    localStorage.setItem("tileConfigs", JSON.stringify(configs));
    loadConfigList();
    alert(`Configuration "${selectedConfig}" deleted successfully!`);
});

// Assign names to cities based on distance
function assignCityNames() {
    if (!bearTrapPosition) return;

    const cities = placedTiles.filter(tile => tile.type === "city");
    cities.sort((a, b) => {
        const distA = calculateDistance(a.x + 1, a.y + 1, bearTrapPosition.x, bearTrapPosition.y);
        const distB = calculateDistance(b.x + 1, b.y + 1, bearTrapPosition.x, bearTrapPosition.y);
        return distA - distB;
    });

    nameAssignments = {};
    cities.forEach((city, index) => {
        if (index < cityNames.length) {
            nameAssignments[`${city.x},${city.y}`] = cityNames[index];
        }
    });
}

// Exit placement mode
function exitPlacementMode() {
    isInPlacementMode = false;
    previewTile = null;
    clearPlacementButtons();
    drawGrid();
}

// Draw the grid
function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const startCol = Math.floor(offsetX / gridSize);
    const startRow = Math.floor(offsetY / gridSize);
    const endCol = startCol + Math.ceil(canvas.width / gridSize) + 1;
    const endRow = startRow + Math.ceil(canvas.height / gridSize) + 1;

    for (let col = startCol; col < endCol; col++) {
        const x = col * gridSize - offsetX;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.strokeStyle = "#ddd";
        ctx.stroke();
    }
    for (let row = startRow; row < endRow; row++) {
        const y = row * gridSize - offsetY;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.strokeStyle = "#ddd";
        ctx.stroke();
    }

    placedTiles.forEach(tile => drawTile(tile));

    if (isInPlacementMode) {
        updatePreviewTile();
        drawTile(previewTile, true);
    }
}

// Draw a tile
function drawTile(tile, isPreview = false) {
    const x = tile.x * gridSize - offsetX;
    const y = tile.y * gridSize - offsetY;
    const size = tile.size * gridSize;

    let fillColor = isPreview ? "rgba(0, 0, 255, 0.3)" : getTileColor(tile.type);

    if (tile.type === "city" && bearTrapPosition) {
        const cityCenterX = tile.x + 1;
        const cityCenterY = tile.y + 1;
        const distance = calculateDistance(cityCenterX, cityCenterY, bearTrapPosition.x, bearTrapPosition.y);
        fillColor = interpolateColor([0, 255, 0], [255, 0, 0], 2, 6, distance);

        ctx.fillStyle = fillColor;
        ctx.fillRect(x, y, size, size);
        ctx.strokeStyle = isPreview ? "blue" : "black";
        ctx.strokeRect(x, y, size, size);

        ctx.fillStyle = "black";
        ctx.font = "14px Arial";
        const name = nameAssignments[`${tile.x},${tile.y}`] || "";
        ctx.fillText(`D: ${distance.toFixed(1)} ${name}`, x + 5, y + size / 2);
        return;
    }

    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, size, size);
    ctx.strokeStyle = isPreview ? "blue" : "black";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, size, size);
}

function getTileColor(type) {
    switch (type) {
        case "bear_trap": return "#f88";
        case "city": return "#8f8";
        case "banner": return "#88f";
        case "resource": return "#ff8";
        default: return "#ccc";
    }
}

function interpolateColor(minColor, maxColor, minDist, maxDist, distance) {
    const ratio = Math.min(1, Math.max(0, (distance - minDist) / (maxDist - minDist)));
    const r = Math.round(minColor[0] + ratio * (maxColor[0] - minColor[0]));
    const g = Math.round(minColor[1] + ratio * (maxColor[1] - minColor[1]));
    const b = Math.round(minColor[2] + ratio * (maxColor[2] - minColor[2]));
    return `rgb(${r}, ${g}, ${b})`;
}

function calculateDistance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

function renderPlacementButtons() {
    const container = document.createElement("div");
    container.id = "placement-buttons";

    const confirmButton = document.createElement("button");
    confirmButton.textContent = "✓";
    confirmButton.style.color = "green";
    confirmButton.onclick = confirmPlacement;

    const cancelButton = document.createElement("button");
    cancelButton.textContent = "X";
    cancelButton.style.color = "red";
    cancelButton.onclick = exitPlacementMode;

    container.appendChild(confirmButton);
    container.appendChild(cancelButton);
    document.body.appendChild(container);
}

function clearPlacementButtons() {
    const container = document.getElementById("placement-buttons");
    if (container) container.remove();
}

canvas.addEventListener("pointerdown", (e) => {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
});
canvas.addEventListener("pointermove", (e) => {
    if (isDragging) {
        offsetX -= e.clientX - dragStartX;
        offsetY -= e.clientY - dragStartY;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        drawGrid();
    }
});
canvas.addEventListener("pointerup", () => isDragging = false);
canvas.addEventListener("pointerout", () => isDragging = false);

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawGrid();
});

loadConfigList();
drawGrid();
