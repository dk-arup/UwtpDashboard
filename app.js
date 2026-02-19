// Global variables
let map;
let markerLayer;
let boundaryLayer; // Global reference for Boundary Layer
let layerControl; // Global reference for Layer Control
let plantsData = []; // Normalized data
let advancedClauses = []; // Global for Advanced Query Filter
const INDIA_CENTER = [22.5937, 82.9629];
const DEFAULT_ZOOM = 4;

// State Name to GeoJSON Code Mapping
const STATE_CODES = {
    "Andaman & Nicobar Islands": "AN",
    "Andhra Pradesh": "AP",
    "Arunachal Pradesh": "AR",
    "Assam": "AS",
    "Bihar": "BR",
    "Chandigarh": "CH",
    "Chhattisgarh": "CT",
    "Dadra and Nagar Haveli and Daman and Diu": "DN",
    "Delhi": "DL",
    "Goa": "GA",
    "Gujarat": "GJ",
    "Haryana": "HR",
    "Himachal Pradesh": "HP",
    "Jammu & Kashmir": "JK",
    "Jharkhand": "JH",
    "Karnataka": "KA",
    "Kerala": "KL",
    "Lakshadweep": "LD",
    "Madhya Pradesh": "MP",
    "Maharashtra": "MH",
    "Manipur": "MN",
    "Meghalaya": "ML",
    "Mizoram": "MZ",
    "Nagaland": "NL",
    "Odisha": "OR",
    "Puducherry": "PY",
    "Punjab": "PB",
    "Rajasthan": "RJ",
    "Sikkim": "SK",
    "Tamil Nadu": "TN",
    "Telangana": "TG",
    "Tripura": "TR",
    "Uttar Pradesh": "UP",
    "Uttarakhand": "UT",
    "West Bengal": "WB"
};

// Parameter mapping for cleaner code
const PARAM_KEYS = ['BOD', 'COD', 'TSS', 'TP', 'TN', 'FC'];

// Global Accordion Handler
window.toggleAccordion = function(header) {
    header.classList.toggle('active');
    const content = header.nextElementSibling;
    if (content.style.display === "block") {
        content.style.display = "none";
    } else {
        content.style.display = "block";
    }
};

document.addEventListener('DOMContentLoaded', () => {
    initMap();
    initListeners();
    initAdvancedFilter(); // New Function
    loadBoundaries();
    loadData();
});

function initMap() {
    map = L.map('map').setView(INDIA_CENTER, DEFAULT_ZOOM);

    const streetLayer = L.tileLayer('http://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps'
    }).addTo(map);

    const satelliteLayer = L.tileLayer('http://{s}.google.com/vt/lyrs=s,h&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps Satellite'
    });

    const satelliteNoLabelsLayer = L.tileLayer('http://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '&copy; Google Maps Satellite (No Labels)'
    });

    // Create a pane for boundaries
    map.createPane('boundaries');
    map.getPane('boundaries').style.zIndex = 350;

    markerLayer = L.layerGroup().addTo(map);
    
    // Initialize Layer Control
    layerControl = L.control.layers({
        "Street Map": streetLayer,
        "Satellite (With Labels)": satelliteLayer,
        "Satellite (No Labels)": satelliteNoLabelsLayer
    }, {
        "Treatment Plants": markerLayer
    }).addTo(map);

    // Event listener for popup open to render charts
    map.on('popupopen', function(e) {
        if (e.popup.getElement()) {
            const canvas = e.popup.getElement().querySelector('canvas');
            if (canvas) {
                const plantId = canvas.getAttribute('data-plant-id');
                if (plantId) {
                    const plant = plantsData.find(p => p.id === plantId);
                    if (plant) {
                        try {
                           renderPopupChart(canvas, plant);
                        } catch (err) {
                            console.error("Chart render error", err);
                        }
                    }
                }
            }
        }
    });
}

let globalPopupChart = null;

function renderPopupChart(canvas, plant) {
    if (globalPopupChart) {
        globalPopupChart.destroy();
        globalPopupChart = null;
    }

    const ctx = canvas.getContext('2d');
    // Canvas is inside a div, which is inside popup-content. 
    // The select is a direct child of popup-content.
    // So we need to go up to popup-content to find the select.
    const popupContent = canvas.closest('.popup-content');
    const select = popupContent ? popupContent.querySelector('select') : null;
    
    // Function to get chart data for a specific parameter
    const getChartData = (param) => {
        const pData = plant.params[param];
        if (!pData || !pData.phases || Object.keys(pData.phases).length === 0) {
            return { labels: ['No Data'], values: [0] };
        }
        
        // Sort keys naturally: P1, P2, P3... or Gen
        const keys = Object.keys(pData.phases).sort((a, b) => {
            const na = parseInt(a.replace('P', '')) || 999;
            const nb = parseInt(b.replace('P', '')) || 999;
            return na - nb;
        });

        return {
            labels: keys,
            values: keys.map(k => pData.phases[k])
        };
    };

    const updateChart = (paramName) => {
        const { labels, values } = getChartData(paramName);

        // Destroy old if exists
        if (globalPopupChart) {
            globalPopupChart.destroy();
            globalPopupChart = null;
        }

        const isFC = paramName === 'FC';
        
        globalPopupChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: `${paramName} Values`, 
                    data: values,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)',
                    borderColor: 'rgba(54, 162, 235, 1)',
                    borderWidth: 1,
                    barThickness: 20
                }]
            },
            options: {
                indexAxis: 'y', // Horizontal
                animation: false, // Disable animation for snappier updates
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: isFC ? 'logarithmic' : 'linear',
                        beginAtZero: true,
                        title: { display: true, text: isFC ? 'MPN/100ml' : 'mg/L' }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                         callbacks: {
                            label: function(context) {
                                return context.raw + (isFC ? ' MPN' : ' mg/L');
                            }
                        }
                    }
                }
            }
        });
    };

    if (select) {
        // Remove old listeners involves cloning or managing manually. 
        // But since this DOM is fresh from popupopen, it should be fine.
        // Let's debug if listener attaches.
        select.onchange = (e) => {
            console.log('Chart param changed to:', e.target.value);
            updateChart(e.target.value);
        };
        // Initial render
        updateChart(select.value);
    } else {
        // Fallback
        updateChart('BOD');
    }
}


async function loadBoundaries() {
    try {
        const response = await fetch('data/state_boundary.json');
        if (!response.ok) throw new Error("Failed to load boundaries");
        const geoData = await response.json();
        
        boundaryLayer = L.geoJSON(geoData, {
            pane: 'boundaries',
            coordsToLatLng: function(coords) {
                return new L.LatLng(coords[0], coords[1]);
            },
            style: function(feature) {
                return {
                    color: '#2c3e50', 
                    weight: 2,
                    opacity: 0.8,
                    fillColor: '#f1f1f1', 
                    fillOpacity: 0.1 
                };
            },
            onEachFeature: function(feature, layer) {
                 if (feature.properties && feature.properties.State) {
                     // Add Code/Name if available
                     const stateCode = feature.properties.State;
                     // Find Name from Code (Reverse Lookup Optional or just show Code)
                     layer.bindTooltip(stateCode, {
                         permanent: false, 
                         direction: 'center',
                         className: 'state-label'
                     });
                 }
            }
        });
        
        boundaryLayer.addTo(map);
        
        // Add globally accessible layer to control
        if (layerControl) {
            layerControl.addOverlay(boundaryLayer, "State Boundaries");
        }

    } catch (error) {
        console.warn('Error loading boundaries:', error);
    }
}

function initListeners() {
    // 1. State Filter
    const stateSelect = document.getElementById('state-select');
    if (stateSelect) {
        stateSelect.addEventListener('change', () => updateMap(true));
    }

    // 2. Capacity Button
    const btn = document.getElementById('btn-filter-cap');
    if (btn) {
        // Prevent default form submission if inside a form
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Filter button clicked');
            updateMap();
        });
    }

    // 3. Pollution Toggle
    const toggle = document.getElementById('enable-pollution');
    const pollutionContainer = document.getElementById('pollution-container');
    const pollutionInputs = document.getElementById('pollution-inputs');
    const scoreInputs = document.getElementById('score-inputs');

    if (toggle && pollutionContainer) {
        toggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                pollutionContainer.style.opacity = '1';
                pollutionContainer.style.pointerEvents = 'auto';
            } else {
                pollutionContainer.style.opacity = '0.5';
                pollutionContainer.style.pointerEvents = 'none';
            }
            updateMap();
        });
    }

    // 4. Pollution Sub-Mode Switch
    document.querySelectorAll('input[name="poll-mode"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'analysis') {
                pollutionInputs.style.display = 'block';
                scoreInputs.style.display = 'none';
            } else {
                pollutionInputs.style.display = 'none';
                scoreInputs.style.display = 'block';
            }
            updateMap();
        });
    });

    // Add change listeners to POLLUTION inputs
    const pInputs = ['bod-min', 'bod-max', 'cod', 'tss', 'tp', 'tn', 'fc', 'min-score', 'max-score'];
    pInputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updateMap);
    });

    // 5. Query Filter Logic
    const qToggle = document.getElementById('enable-query-filter');
    const qContainer = document.getElementById('query-builder-container');
    const btnAddClause = document.getElementById('btn-add-clause');

    if (qToggle) {
        qToggle.addEventListener('change', (e) => {
            if (e.target.checked) {
                qContainer.style.opacity = '1';
                qContainer.style.pointerEvents = 'auto';
            } else {
                qContainer.style.opacity = '0.5';
                qContainer.style.pointerEvents = 'none';
            }
            updateMap();
        });
    }

    if (btnAddClause) {
        btnAddClause.addEventListener('click', () => {
            const field = document.getElementById('qb-field').value;
            const op = document.getElementById('qb-operator').value;
            const val = document.getElementById('qb-value').value;
            
            if (val === '') {
                alert('Please enter a value');
                return;
            }
            const num = parseFloat(val);
            addClause(field, op, num);
        });
    }
}

let activeClauses = [];

function addClause(field, operator, value) {
    activeClauses.push({ field, operator, value });
    renderClauses();
    updateMap();
}

// Make removeClause global or attach to window for HTML onClick compatibility
window.removeClause = function(index) {
    activeClauses.splice(index, 1);
    renderClauses();
    updateMap();
};

function renderClauses() {
    const list = document.getElementById('query-clauses-list');
    list.innerHTML = '';
    
    if (activeClauses.length === 0) {
        list.style.display = 'none';
        return;
    }
    list.style.display = 'block';

    activeClauses.forEach((c, idx) => {
        const div = document.createElement('div');
        div.style.cssText = 'background:#e0f7fa; padding:6px; margin-bottom:4px; border-radius:4px; display:flex; justify-content:space-between; align-items:center; font-size:0.85rem; border:1px solid #b2ebf2;';
        
        div.innerHTML = `
            <span><span style="color:#00838f;">${c.field}</span> <strong>${c.operator}</strong> ${c.value}</span>
            <span onclick="window.removeClause(${idx})" style="cursor:pointer; color:#c0392b; font-weight:bold; margin-left:8px; font-size:1.1rem;">×</span>
        `;
        list.appendChild(div);
    });
}


/* =========================================
   ADVANCED QUERY BUILDER LOGIC
   ========================================= */

const QB_FIELDS = [
    { label: 'Design Capacity', value: 'capacity' },
    { label: 'Operational Capacity', value: 'opCapacity' },
    { label: 'Operational %', value: 'opPercent' },
    { label: 'Total Score', value: 'totalScore' },
    
    // BOD
    { label: 'BOD (General/Max)', value: 'BOD' },
    { label: 'BOD - Phase 1', value: 'BOD_P1' },
    { label: 'BOD - Phase 2', value: 'BOD_P2' },
    { label: 'BOD - Phase 3', value: 'BOD_P3' },

    // COD
    { label: 'COD (General/Max)', value: 'COD' },
    { label: 'COD - Phase 1', value: 'COD_P1' },
    { label: 'COD - Phase 2', value: 'COD_P2' },
    { label: 'COD - Phase 3', value: 'COD_P3' },

    // TSS
    { label: 'TSS (General/Max)', value: 'TSS' },
    { label: 'TSS - Phase 1', value: 'TSS_P1' },
    { label: 'TSS - Phase 2', value: 'TSS_P2' },
    { label: 'TSS - Phase 3', value: 'TSS_P3' },

    // TP
    { label: 'Total Phosphorus (Max)', value: 'TP' },
    { label: 'TP - Phase 1', value: 'TP_P1' },
    { label: 'TP - Phase 2', value: 'TP_P2' },
    { label: 'TP - Phase 3', value: 'TP_P3' },

    // TN
    { label: 'Total Nitrogen (Max)', value: 'TN' },
    { label: 'TN - Phase 1', value: 'TN_P1' },
    { label: 'TN - Phase 2', value: 'TN_P2' },
    { label: 'TN - Phase 3', value: 'TN_P3' },

    // FC
    { label: 'Fecal Coliform (Max)', value: 'FC' },
    { label: 'FC - Phase 1', value: 'FC_P1' },
    { label: 'FC - Phase 2', value: 'FC_P2' },
    { label: 'FC - Phase 3', value: 'FC_P3' }
];

function initAdvancedFilter() {
    const modal = document.getElementById('query-modal');
    const btnOpen = document.getElementById('open-advanced-filter');
    const btnClose = document.querySelectorAll('.close-modal');
    const btnAdd = document.getElementById('add-condition-btn');
    const btnApply = document.getElementById('apply-query-btn');
    const statusDiv = document.getElementById('filter-status');

    if (!btnOpen || !modal) return;

    // Open
    btnOpen.addEventListener('click', () => {
        modal.classList.add('active');
        // If empty, add one row by default
        const container = document.getElementById('query-rows-container');
        if (container.children.length === 0) {
            addQueryRow();
        }
        updatePreview();
    });

    // Close
    btnClose.forEach(b => b.addEventListener('click', () => {
        modal.classList.remove('active');
    }));

    // Add Row
    btnAdd.addEventListener('click', () => {
        addQueryRow();
        updatePreview();
    });

    // Apply
    btnApply.addEventListener('click', () => {
        // Harvest clauses
        advancedClauses = []; 
        const rows = document.querySelectorAll('.query-builder-row');
        
        rows.forEach(row => {
            const field = row.querySelector('.qb-field').value;
            const op = row.querySelector('.qb-operator').value;
            const val = parseFloat(row.querySelector('.qb-value').value);

            if (!isNaN(val)) {
                advancedClauses.push({ field, op, val });
            }
        });

        // Update UI
        if (advancedClauses.length > 0) {
            statusDiv.textContent = `Active: ${advancedClauses.length} condition(s)`;
            statusDiv.style.color = '#27ae60';
            statusDiv.style.fontWeight = 'bold';
        } else {
            statusDiv.textContent = 'No active advanced filter';
            statusDiv.style.color = '#7f8c8d';
            statusDiv.style.fontWeight = 'normal';
        }

        modal.classList.remove('active');
        updateMap();
    });
}

function addQueryRow(defaultData = null) {
    const container = document.getElementById('query-rows-container');
    const row = document.createElement('div');
    row.className = 'query-builder-row';

    // Build Options
    let optionsHtml = '';
    QB_FIELDS.forEach(f => {
        optionsHtml += `<option value="${f.value}">${f.label}</option>`;
    });

    row.innerHTML = `
        <select class="qb-field">${optionsHtml}</select>
        <select class="qb-operator">
            <option value=">">Unsatisfactory (>)</option> 
            <option value=">=">≥</option>
            <option value="<">Satisfactory (<)</option>
            <option value="<=">≤</option>
            <option value="=">=</option>
        </select>
        <input type="number" class="qb-value" placeholder="Value">
        <button class="remove-row-btn">&times;</button>
    `;

    // Events for live preview
    row.querySelectorAll('select, input').forEach(el => {
        el.addEventListener('change', updatePreview);
        el.addEventListener('input', updatePreview);
    });

    row.querySelector('.remove-row-btn').addEventListener('click', () => {
        row.remove();
        updatePreview();
    });

    container.appendChild(row);
}

function updatePreview() {
    // Calculate how many plants match the CURRENT modal state (not the applied state)
    const currentClauses = [];
    const rows = document.querySelectorAll('.query-builder-row');
        
    rows.forEach(row => {
        const field = row.querySelector('.qb-field').value;
        const op = row.querySelector('.qb-operator').value;
        const val = parseFloat(row.querySelector('.qb-value').value);

        if (!isNaN(val)) {
            currentClauses.push({ field, op, val });
        }
    });

    const count = getMatchingCount(currentClauses);
    document.getElementById('preview-count').textContent = count;
}

function getMatchingCount(clauses) {
    if (clauses.length === 0) return plantsData.length;
    
    return plantsData.filter(plant => {
        return checkPlantAgainstClauses(plant, clauses);
    }).length; 
}

function checkPlantAgainstClauses(plant, clauses) {
    for (const clause of clauses) {
        let plantVal = null;
        const f = clause.field;

        // 1. Direct Properties
        if (['capacity', 'opCapacity', 'opPercent', 'totalScore'].includes(f)) {
            plantVal = plant[f];
        } 
        // 2. Complex Params
        else {
            // Check if it's a specific phase e.g. BOD_P1
            const parts = f.split('_');
            const paramName = parts[0]; // BOD
            const phase = parts[1];     // P1, or undefined

            if (plant.params && plant.params[paramName]) {
                if (phase) {
                    // Specific phase
                    // Data structure: plant.params.BOD.phases.P1
                    if (plant.params[paramName].phases && plant.params[paramName].phases[phase] !== undefined) {
                        plantVal = plant.params[paramName].phases[phase];
                    } else {
                        // Phase doesn't exist for this plant => Fail or Null?
                        // Return false immediately reduces complexity
                        return false; 
                    }
                } else {
                    // General/Max
                    plantVal = plant.params[paramName].max;
                }
            } else {
                return false; 
            }
        }

        if (plantVal === null || plantVal === undefined) return false;

        // Comparison
        const op = clause.op;
        const limit = clause.val;
        
        if (op === '>') { if (!(plantVal > limit)) return false; }
        else if (op === '>=') { if (!(plantVal >= limit)) return false; }
        else if (op === '<') { if (!(plantVal < limit)) return false; }
        else if (op === '<=') { if (!(plantVal <= limit)) return false; }
        else if (op === '=') { if (!(plantVal == limit)) return false; }
    }
    return true;
}


async function loadData() {
    try {
        const response = await fetch('data/csvjson.json');
        if (!response.ok) throw new Error("Failed to load data");
        
        const rawData = await response.json();
        normalizeData(rawData);
        
        populateStateFilter();
        updateMap();
        
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Error loading plant data. See console for details.');
    }
}

function normalizeData(rawData) {
    plantsData = rawData.map(row => {
        // Basic Info
        const id = row['UWTP ID'];
        const state = row['State'];
        const lat = parseFloat(row['Latitude']);
        const lng = parseFloat(row['Longitude']);

        if (isNaN(lat) || isNaN(lng)) return null;

        // Capacity Metrics
        const capacity = parseFloat(row['Design capacity (MLD)']) || 0; 
        const opCapacity = parseFloat(row['Operational capacity (MLD)']) || 0;
        const opPercent = parseFloat(row['Operational Capacity']) || 0; 

        // Score
        const totalScore = parseFloat(row['TOTAL SCORE  (MAX. 60)']) || 0;

        // Pollution Params - Extract all phases
        const params = {
            BOD: getAllPhases(row, 'BOD'),
            COD: getAllPhases(row, 'COD'),
            TSS: getAllPhases(row, 'TSS'),
            TP:  getAllPhases(row, 'TP'),
            TN:  getAllPhases(row, 'TN'),
            FC:  getAllPhases(row, 'FC')
        };

        return {
            id, state, 
            capacity, opCapacity, opPercent,
            totalScore,
            lat, lng, params
        };
    }).filter(item => item !== null); 
    
    console.log(`Loaded ${plantsData.length} valid plants.`);
}

function getAllPhases(row, paramName) {
    // Return an object with all phases found { P1: val, P2: val, ... }
    const phases = {};
    let maxVal = -1;
    
    // Check for specific phases P1, P2, P3, etc.
    const regex = new RegExp(`^${paramName}_P(\\d+)`, 'i');
    for (const [key, value] of Object.entries(row)) {
        const match = key.match(regex);
        if (match) {
            if (value === null || value === undefined || value === "") continue;
            const num = parseFloat(value);
            if (!isNaN(num)) {
                const phaseNum = match[1]; // "1", "2", etc.
                phases[`P${phaseNum}`] = num;
                if (num > maxVal) maxVal = num;
            }
        }
    }

    // Also check for the base parameter name without suffix (treat as "Avg" or "Outlet" or generic)
    if (row[paramName] !== undefined && row[paramName] !== "") {
         const num = parseFloat(row[paramName]);
         if (!isNaN(num)) {
             // If no phases exist, this is the only value.
             // If phases exist, what is this? Maybe an average? 
             // Let's store it as 'Gen' (General) if phases are empty, or just ignore if we prefer phases.
             // For safety, let's keep it if phases are empty.
             if (Object.keys(phases).length === 0) {
                 phases['Gen'] = num;
                 maxVal = num;
             }
         }
    }

    // Return structure used by both map coloring (max) and chart (phases)
    return {
        max: maxVal === -1 ? null : maxVal,
        phases: phases
    };
}

function populateStateFilter() {
    const select = document.getElementById('state-select');
    if (!select) return;
    const states = [...new Set(plantsData.map(p => p.state).filter(s => s))].sort();
    select.innerHTML = '<option value="All">All States</option>';
    states.forEach(state => {
        const option = document.createElement('option');
        option.value = state;
        option.textContent = state;
        select.appendChild(option);
    });
}

function updateMap(shouldFitBounds = false) {
    markerLayer.clearLayers();
    
    // 1. Get Inputs
    const stateFilter = document.getElementById('state-select').value;
    
    // Update Boundary Layer Style based on Filter
    let boundaryBounds = null;
    if (boundaryLayer) {
        const targetCode = (stateFilter !== 'All') ? STATE_CODES[stateFilter] : null;
        
        boundaryLayer.eachLayer(layer => {
            const props = layer.feature.properties;
            const layerStateCode = props.State; // e.g. "TN"

            if (stateFilter === 'All') {
                // Reset to default
                layer.setStyle({
                    color: '#2c3e50', 
                    weight: 2,
                    opacity: 0.8,
                    fillColor: '#f1f1f1', 
                    fillOpacity: 0.1
                });
            } else if (targetCode && layerStateCode === targetCode) {
                // Highlight selected state
                layer.setStyle({
                    color: '#d35400', // Highlight Orange/Red
                    weight: 4,
                    opacity: 1,
                    fillColor: '#e67e22',
                    fillOpacity: 0.2
                });
                boundaryBounds = layer.getBounds();
                layer.bringToFront();
            } else {
                // Dim others
                layer.setStyle({
                    color: '#95a5a6', 
                    weight: 1,
                    opacity: 0.2, // Very faint
                    fillColor: '#fff',
                    fillOpacity: 0
                });
            }
        });
    }
    
    // Capacity Inputs (Safe Parsing)
    const getVal = (id, def) => {
        const el = document.getElementById(id);
        return (el && el.value !== '') ? parseFloat(el.value) : def;
    };

    const capMin = getVal('cap-min', 0);
    const capMax = getVal('cap-max', 99999);
    const opMin = getVal('op-cap-min', 0);
    const opMax = getVal('op-cap-max', 99999);
    const perfMin = getVal('op-perf-min', 0);
    const perfMax = getVal('op-perf-max', 100);

    // Pollution Mode Check
    const isPollutionEnabled = document.getElementById('enable-pollution').checked;
    
    // Sub-mode: 'analysis' or 'score'
    const pollMode = document.querySelector('input[name="poll-mode"]:checked').value;
    
    // Get thresholds dynamically
    const thresholds = {
        BOD: { min: getVal('bod-min', 0), max: getVal('bod-max', 30) },
        COD: getVal('cod', 0),
        TSS: getVal('tss', 0), TP: getVal('tp', 0),
        TN: getVal('tn', 0), FC: getVal('fc', 0)
    };
    
    // Score Range
    const scoreMin = getVal('min-score', 0);
    const scoreMax = getVal('max-score', 60);
    
    
    // Query Filter Check
    // (We now rely on the advancedClauses array being populated by the modal)
    
    let shownCount = 0;
    const visibleBounds = [];

    plantsData.forEach(plant => {
        // 2. Filters
        if (stateFilter !== 'All' && plant.state !== stateFilter) return;
        if (plant.capacity < capMin || plant.capacity > capMax) return;
        if (plant.opCapacity < opMin || plant.opCapacity > opMax) return;
        if (plant.opPercent < perfMin || plant.opPercent > perfMax) return;

        // Score Filter (applies only if Score Mode is active)
        if (isPollutionEnabled && pollMode === 'score') {
             if (plant.totalScore < scoreMin || plant.totalScore > scoreMax) return;
        }

        // Advanced Query Filter (New Logic)
        if (typeof advancedClauses !== 'undefined' && advancedClauses.length > 0) {
            // Helper function defined at bottom of file
            // Note: Function name corrected to match definition
            if (!checkPlantAgainstClauses(plant, advancedClauses)) return; 
        }

        // 3. Visualization
        shownCount++;
        visibleBounds.push([plant.lat, plant.lng]);

        let color = '#3498db'; // Default Blue
        let popupContent = '';
        const radius = Math.min(Math.max(5, Math.sqrt(plant.capacity)), 20);

        if (isPollutionEnabled) {
            if (pollMode === 'analysis') {
                const status = checkCompliance(plant, thresholds);
                color = status.isCompliant ? '#27ae60' : '#c0392b';
                popupContent = createCompliancePopup(plant, status);
            } else {
                // Score Mode Visualization
                // Gradient or simple threshold? Let's use simple Logic:
                // High Score = Good? Based on JSON BOD Score (10), 10 seems good if 42mg/L is Fail.
                // Wait, typically pollution scores are lower is better? 
                // Or "Compliance Score" where higher is better?
                // The JSON has "TOTAL SCORE (MAX. 60)". 60 is max.
                // Let's assume higher is better.
                // Color Gradient: Red (0) -> Yellow (30) -> Green (60)
                
                color = getColorForScore(plant.totalScore);
                popupContent = createScorePopup(plant);
            }
        } else {
            popupContent = createCapacityPopup(plant);
        }

        const circle = L.circleMarker([plant.lat, plant.lng], {
            radius: radius,
            fillColor: color,
            color: '#fff',
            weight: 1,
            opacity: 1,
            fillOpacity: 0.7
        });

        circle.bindPopup(popupContent);
        circle.addTo(markerLayer);
    });

    document.getElementById('count-total').textContent = shownCount;

    // Zoom Logic
    // Recalculate boundary bounds if needed (e.g. if logic above missed it or scope issue)
    if (boundaryLayer && stateFilter !== 'All' && !boundaryBounds) {
         const code = STATE_CODES[stateFilter];
         boundaryLayer.eachLayer(l => {
             if (l.feature.properties.State === code) {
                 boundaryBounds = l.getBounds();
             }
         });
    }

    if (shouldFitBounds) {
        if (stateFilter !== 'All' && boundaryBounds) {
            // Priority: Fit to State Boundary
            map.flyToBounds(boundaryBounds, { padding: [50, 50], maxZoom: 8 });
        } else if (visibleBounds.length > 0) {
             // Fallback: Fit to Markers
             if (stateFilter === 'All') map.flyTo(INDIA_CENTER, DEFAULT_ZOOM);
             else map.flyToBounds(visibleBounds, { padding: [50, 50], maxZoom: 10 });
        } else {
             map.flyTo(INDIA_CENTER, DEFAULT_ZOOM);
        }
    }
}

function checkCompliance(plant, thresholds) {
    let isCompliant = true;
    const failures = [];
    PARAM_KEYS.forEach(key => {
        // Use the 'max' property for compliance check
        const val = plant.params[key].max;
        const limit = thresholds[key];

        if (val === null) return;

        // Custom Range Check (e.g. BOD)
        if (typeof limit === 'object') {
            const min = limit.min;
            const max = limit.max;
            if (val < min || val > max) {
                isCompliant = false;
                failures.push({ param: key, val: val, limit: `${min}-${max}` });
            }
            return;
        }

        // Standard Max Threshold
        if (val > limit) {
            isCompliant = false;
            failures.push({ param: key, val: val, limit: limit });
        }
    });
    return { isCompliant, failures };
}

function createCapacityPopup(plant) {
    return `
        <div class="popup-content">
            <div class="popup-header">UWTP: ${plant.id}</div>
            <span class="popup-sub">${plant.state}</span>
            <div style="font-size:0.9rem; margin:8px 0;">
                <div><strong>Design Cap:</strong> ${plant.capacity} MLD</div>
                <div><strong>Op. Cap:</strong> ${plant.opCapacity} MLD</div>
                <div><strong>Op. Perf:</strong> ${plant.opPercent}%</div>
            </div>
            <select id="chart-param-select" class="chart-select" style="width:100%; margin-top:8px; padding:4px; border:1px solid #ddd; border-radius:4px;">
                <option value="BOD">BOD</option>
                <option value="COD">COD</option>
                <option value="TSS">TSS</option>
                <option value="TP">Total Phosphorus</option>
                <option value="TN">Total Nitrogen</option>
                <option value="FC">Fecal Coliform</option>
            </select>
            <div style="width: 280px; height: 200px; margin-top: 5px;">
                <canvas id="popup-chart-canvas" data-plant-id="${plant.id}"></canvas>
            </div>
        </div>
    `;
}

function createCompliancePopup(plant, status) {
    let statusHTML = status.isCompliant 
        ? `<div style="color:#27ae60; font-weight:bold;">✅ Compliant</div>`
        : `<div style="color:#c0392b; font-weight:bold;">❌ Non-Compliant</div>`;

    let details = '';
    if (!status.isCompliant) {
        details = '<div style="margin-top:5px; border-top:1px solid #eee; font-size:0.8rem;">';
        status.failures.forEach(f => {
            // Check if limit is range "0-30" or just "30"
            const symbol = String(f.limit).includes('-') ? '∉' : '>';
            details += `<div style="color:#c0392b;">${f.param}: ${f.val} ${symbol} ${f.limit}</div>`;
        });
        details += '</div>';
    }

    return `
        <div class="popup-content">
            <div class="popup-header">UWTP: ${plant.id}</div>
            <span class="popup-sub">${plant.state}</span>
            ${statusHTML}
            ${details}
            <select id="chart-param-select" class="chart-select" style="width:100%; margin-top:8px; padding:4px; border:1px solid #ddd; border-radius:4px;">
                <option value="BOD">BOD</option>
                <option value="COD">COD</option>
                <option value="TSS">TSS</option>
                <option value="TP">Total Phosphorus</option>
                <option value="TN">Total Nitrogen</option>
                <option value="FC">Fecal Coliform</option>
            </select>
            <div style="width: 280px; height: 200px; margin-top: 5px;">
                <canvas id="popup-chart-canvas" data-plant-id="${plant.id}"></canvas>
            </div>
        </div>
    `;
}

function getColorForScore(score) {
    if (score == null) return '#95a5a6';
    if (score >= 50) return '#27ae60'; // Excellent
    if (score >= 40) return '#2ecc71'; // Good
    if (score >= 30) return '#f1c40f'; // Average
    if (score >= 20) return '#e67e22'; // Poor
    return '#c0392b'; // Very Poor
}

function createScorePopup(plant) {
    const score = plant.totalScore !== null ? plant.totalScore : 'N/A';
    const color = getColorForScore(score);
    
    return `
        <div class="popup-content">
            <div class="popup-header">UWTP: ${plant.id}</div>
            <span class="popup-sub">${plant.state}</span>
            <div style="margin-top:10px; text-align:center;">
                <div style="font-size:0.8rem; color:#7f8c8d; margin-bottom:4px;">TOTAL SCORE (Max 60)</div>
                <div style="font-size:1.8rem; font-weight:bold; color:${color}; line-height:1;">
                    ${score}
                </div>
            </div>
            <select id="chart-param-select" class="chart-select" style="width:100%; margin-top:8px; padding:4px; border:1px solid #ddd; border-radius:4px;">
                <option value="BOD">BOD</option>
                <option value="COD">COD</option>
                <option value="TSS">TSS</option>
                <option value="TP">Total Phosphorus</option>
                <option value="TN">Total Nitrogen</option>
                <option value="FC">Fecal Coliform</option>
            </select>
            <div style="width: 280px; height: 200px; margin-top: 5px;">
                <canvas id="popup-chart-canvas" data-plant-id="${plant.id}"></canvas>
            </div>
        </div>
    `;
}

// Contact Form Handler
document.addEventListener('DOMContentLoaded', function() {
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            // In a real app, you would send data to a backend here.
            // For now, we simulate a successful submission.
            const name = document.getElementById('contact-name').value;
            alert('Thank you, ' + name + '! Your message has been sent.');
            contactForm.reset();
        });
    }
});

