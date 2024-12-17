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

let colorScaleMin = 2; // Default minimum for color scale
let colorScaleMax = 6; // Default maximum for color scale

const bannerZoneColors = ["rgba(255, 0, 0, 0.2)", "rgba(0, 255, 0, 0.2)", "rgba(0, 0, 255, 0.2)",
    "rgba(255, 255, 0, 0.2)", "rgba(255, 0, 255, 0.2)", "rgba(0, 255, 255, 0.2)"];


function calculateBannerZones(tiles = placedTiles) {
    const visited = new Set();
    const zones = [];

    // Helper to generate a unique key for a coordinate
    function getKey(x, y) {
        return `${x},${y}`;
    }

    // Perform BFS to create a zone
    function bfs(startTile) {
        const queue = [{ x: startTile.x, y: startTile.y }];
        const zone = new Set();

        while (queue.length > 0) {
            const { x, y } = queue.shift();
            const key = getKey(x, y);

            // Skip if already visited
            if (visited.has(key)) continue;

            visited.add(key);
            zone.add(key);
            // Add neighbors within a 7x7 box
            for (let dx = -3; dx <= 3; dx++) {
                for (let dy = -3; dy <= 3; dy++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    const neighborKey = getKey(nx, ny);
                    zone.add(neighborKey);
                }
            }

            // Add neighbors within a 7x7 box
            for (let dx = -7; dx <= 7; dx++) {
                for (let dy = -7; dy <= 7; dy++) {
                    const nx = x + dx;
                    const ny = y + dy;
                    const neighborKey = getKey(nx, ny);

                    // Only enqueue neighbors if they are banner tiles and not visited
                    if (!visited.has(neighborKey) && tiles.some(t => t.x === nx && t.y === ny && t.type === "banner")) {
                        queue.push({ x: nx, y: ny });
                    }
                }
            }
        }

        return zone;
    }

    // Process all banner tiles
    const bannerTiles = tiles.filter(t => t.type === "banner");

    bannerTiles.forEach(tile => {
        const key = getKey(tile.x, tile.y);
        if (!visited.has(key)) {
            zones.push(bfs(tile));
        }
    });

    return zones;
}


function removeTileAt(gridX, gridY) {
    for (let i = 0; i < placedTiles.length; i++) {
        const tile = placedTiles[i];
        if (gridX >= tile.x && gridX < tile.x + tile.size &&
            gridY >= tile.y && gridY < tile.y + tile.size) {

            // Remove tile
            placedTiles.splice(i, 1);
            assignCityNames();
            drawGrid();
            return;
        }
    }
}


// Modal elements
const modal = document.getElementById("nameModal");
const nameInput = document.getElementById("cityNamesInput");
const configureNamesBtn = document.getElementById("configureNames");
const saveNamesBtn = document.getElementById("saveNames");
const closeModalBtn = document.getElementById("closeModal");

// New inputs for color scale
const colorMinInput = document.getElementById("colorMin");
const colorMaxInput = document.getElementById("colorMax");

// Open modal to configure city names
configureNamesBtn.addEventListener("click", () => {
    modal.style.display = "block";
});

// Save city names
saveNamesBtn.addEventListener("click", () => {
    cityNames = nameInput.value.split("\n").filter(name => name.trim() !== "");
    colorScaleMin = parseFloat(colorMinInput.value) || colorScaleMin;
    colorScaleMax = parseFloat(colorMaxInput.value) || colorScaleMax;

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

        if (selectedTool.type !== "eraser") {
            enterPlacementMode();
        } else {
            exitPlacementMode();
        }
    });

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

function isSpaceFree(tile) {
    for (let placed of placedTiles) {
        if (
            tile.x < placed.x + placed.size &&
            tile.x + tile.size > placed.x &&
            tile.y < placed.y + placed.size &&
            tile.y + tile.size > placed.y
        ) {
            return false; // Overlap detected
        }
    }
    return true;
}

function isPlacementValid(tile) {
    if (!isSpaceFree(tile)) return false;

    return true;
}

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

        // Update textarea to reflect city names
        nameInput.value = cityNames.join("\n");

        // Recalculate bear trap position if necessary
        const bearTrap = placedTiles.find(tile => tile.type === "bear_trap");
        bearTrapPosition = bearTrap ? { x: bearTrap.x + 1.5, y: bearTrap.y + 1.5 } : null;

        // Center view on the bear trap
        if (bearTrapPosition) {
            offsetX = (bearTrapPosition.x - canvas.width / (2 * gridSize)) * gridSize;
            offsetY = (bearTrapPosition.y - canvas.height / (2 * gridSize)) * gridSize;
        }

        assignCityNames();
        drawGrid();
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

let offscreenCanvas = null; // Persistent offscreen canvas
let offscreenCtx = null;

// Initialize or resize the offscreen canvas
function initializeOffscreenCanvas() {
    if (!offscreenCanvas) {
        offscreenCanvas = document.createElement("canvas");
        offscreenCtx = offscreenCanvas.getContext("2d");
    }
    if (offscreenCanvas.width !== canvas.width || offscreenCanvas.height !== canvas.height) {
        offscreenCanvas.width = canvas.width;
        offscreenCanvas.height = canvas.height;
    }
}

function drawGrid() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Calculate grid bounds
    const startCol = Math.floor(offsetX / gridSize);
    const startRow = Math.floor(offsetY / gridSize);
    const endCol = startCol + Math.ceil(canvas.width / gridSize) + 1;
    const endRow = startRow + Math.ceil(canvas.height / gridSize) + 1;

    // Draw gridlines
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

    // Combine placedTiles with the previewTile
    const tempTiles = [...placedTiles];
    if (previewTile && previewTile.type === "banner") {
        tempTiles.push(previewTile);
    }

    // Safely calculate zones
    const tempZones = calculateBannerZones(tempTiles);

    // Draw banner zones
    initializeOffscreenCanvas();
    offscreenCtx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);

    const zoneBounds = new Set(); // To track which grid cells are already drawn

    tempZones.forEach((zone, index) => {
        const color = bannerZoneColors[index % bannerZoneColors.length];
        offscreenCtx.fillStyle = color;

        zone.forEach(key => {
            const [zoneX, zoneY] = key.split(",").map(Number);
            const x = zoneX * gridSize - offsetX;
            const y = zoneY * gridSize - offsetY;
            const cellKey = `${x},${y}`;

            // Draw only if this grid cell has not been drawn yet
            if (!zoneBounds.has(cellKey)) {
                zoneBounds.add(cellKey);
                offscreenCtx.fillRect(x, y, gridSize, gridSize);
            }
        });
    });

    // Draw placed tiles
    placedTiles.forEach(tile => drawTile(tile, false, tempZones));

    ctx.drawImage(offscreenCanvas, 0, 0);


    // Draw preview tile
    if (isInPlacementMode) {
        drawTile(previewTile, true, tempZones);
        updateConfirmButton();
    }
}

// Draw a tile
function drawTile(tile, isPreview, bannerZones) {
    const x = tile.x * gridSize - offsetX;
    const y = tile.y * gridSize - offsetY;
    const size = tile.size * gridSize;

    let fillColor = getTileColor(tile.type);
    let distanceText = "";
    let textColor = "black";

    // Handle city-specific distance-based color scale
    if (tile.type === "city" && bearTrapPosition) {
        const cityCenterX = tile.x + tile.size / 2;
        const cityCenterY = tile.y + tile.size / 2;
        const distance = calculateDistance(cityCenterX, cityCenterY, bearTrapPosition.x, bearTrapPosition.y);
        const minColor = [0, 255, 0]; // Green at min distance
        const maxColor = [255, 0, 0]; // Red at max distance

        fillColor = interpolateColor(minColor, maxColor, colorScaleMin, colorScaleMax, distance);
        distanceText = `${distance.toFixed(2)} tiles`;
    }

    // Draw the tile fill
    ctx.fillStyle = isPreview ? "rgba(0, 0, 255, 0.3)" : fillColor;
    ctx.fillRect(x, y, size, size);

    // Territory-based colors and crossing out
    const territoryColor = findTerritoryColor(tile, bannerZones); // Get territory color
    const fullyInside = isTileFullyInsideTerritory(tile, bannerZones);

    // Draw the territory outline
    ctx.strokeStyle = territoryColor || "black";
    ctx.lineWidth = fullyInside ? 4 : 2;
    ctx.strokeRect(x, y, size, size);

    // Draw red "cross-out" if tile is partially outside a territory
    if (!fullyInside) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + size, y + size);
        ctx.moveTo(x + size, y);
        ctx.lineTo(x, y + size);
        ctx.strokeStyle = "red";
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    // Add city name and distance label
    ctx.fillStyle = textColor;
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const label = getTileLabel(tile);
    if (tile.type === "city") {
        ctx.fillText(label, x + size / 2, y + size / 2 - 10); // City name above center
        ctx.font = "12px Arial";
        ctx.fillText(distanceText, x + size / 2, y + size / 2 + 10); // Distance below center
    } else {
        ctx.fillText(label, x + size / 2, y + size / 2); // Default tile label
    }
}


function findTerritoryColor(tile, bannerZones) {
    for (let i = 0; i < bannerZones.length; i++) {
        const zone = bannerZones[i];
        const key = `${tile.x},${tile.y}`;
        if (zone.has(key)) {
            return bannerZoneColors[i % bannerZoneColors.length].replace("0.2", "1.0");
        }
    }
    return null;
}


function isTileFullyInsideTerritory(tile, bannerZones) {
    for (let dx = 0; dx < tile.size; dx++) {
        for (let dy = 0; dy < tile.size; dy++) {
            const key = `${tile.x + dx},${tile.y + dy}`;
            const isInAnyZone = bannerZones.some(zone => zone.has(key));
            if (!isInAnyZone) return false; // At least one grid part is not inside a territory
        }
    }
    return true;
}


function getTileLabel(tile) {
    switch (tile.type) {
        case "city": return nameAssignments[`${tile.x},${tile.y}`] || "City";
        case "banner": return "Banner";
        case "bear_trap": return "Bear Trap";
        case "resource": return "Resource";
        default: return tile.type.charAt(0).toUpperCase() + tile.type.slice(1);
    }
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
    // Remove existing placement buttons first
    clearPlacementButtons();

    const container = document.createElement("div");
    container.id = "placement-buttons";
    container.style.position = "absolute";

    const confirmButton = document.createElement("button");
    confirmButton.id = "confirm-btn";
    confirmButton.textContent = "✓";
    confirmButton.style.color = "green";
    confirmButton.disabled = !isPlacementValid(previewTile); // Validate placement

    confirmButton.addEventListener("click", () => {
        confirmPlacement();
        clearPlacementButtons(); // Remove buttons after confirming
    });

    const cancelButton = document.createElement("button");
    cancelButton.textContent = "X";
    cancelButton.style.color = "red";

    cancelButton.addEventListener("click", () => {
        exitPlacementMode();
        clearPlacementButtons(); // Remove buttons after canceling
    });

    container.appendChild(confirmButton);
    container.appendChild(cancelButton);
    document.body.appendChild(container);
}

function clearPlacementButtons() {
    const existingContainer = document.getElementById("placement-buttons");
    if (existingContainer) {
        existingContainer.remove(); // Remove the button container
    }
}

function updateConfirmButton() {
    const confirmButton = document.getElementById("confirm-btn");
    if (confirmButton) {
        confirmButton.disabled = !isPlacementValid(previewTile);
        confirmButton.style.opacity = confirmButton.disabled ? "0.5" : "1.0";
        confirmButton.style.cursor = confirmButton.disabled ? "not-allowed" : "pointer";
    }
}

const dragThreshold = 20; // Threshold in pixels to distinguish drag from a click
let dragDistance = 0; // Track the distance moved

canvas.addEventListener("pointerdown", (e) => {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragDistance = 0; // Reset drag distance
});

canvas.addEventListener("pointermove", (e) => {
    if (isDragging) {
        const deltaX = e.clientX - dragStartX;
        const deltaY = e.clientY - dragStartY;
        dragDistance += Math.hypot(deltaX, deltaY); // Calculate total drag distance

        offsetX -= deltaX;
        offsetY -= deltaY;
        dragStartX = e.clientX;
        dragStartY = e.clientY;
        if (isInPlacementMode) {
            updatePreviewTile(); // Dynamically update the preview tile's position
        }
        drawGrid();
    }
});

canvas.addEventListener("pointerup", (e) => {
    isDragging = false;
    // If drag distance is small enough, treat it as a click (edit mode)
    if (dragDistance < dragThreshold) {
        handleClick(e);
    }
});

function handleClick(e) {
    const gridX = Math.floor((e.clientX + offsetX) / gridSize);
    const gridY = Math.floor((e.clientY + offsetY) / gridSize);

    // Erase tiles
    if (selectedTool.type === "eraser") {
        removeTileAt(gridX, gridY);
        return;
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
}

canvas.addEventListener("pointerout", () => isDragging = false);

window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawGrid();
});

loadConfigList();
drawGrid();
