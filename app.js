// OSRS Herb Profit Calculator - Mobile App
// Main JavaScript file

// Constants
const API_URL = 'https://prices.runescape.wiki/api/v1/osrs/latest';
const BASE_HARVEST_LIVES = 3;

// Herb data: [name, seed_id, grimy_id, clean_id, unf_potion_id, lowCTS, highCTS]
const HERB_DATA = [
    ['Guam', 5291, 199, 249, 91, 25, 80],
    ['Marrentill', 5292, 201, 251, 93, 28, 80],
    ['Tarromin', 5293, 203, 253, 95, 31, 80],
    ['Harralander', 5294, 205, 255, 97, 36, 80],
    ['Ranarr', 5295, 207, 257, 99, 39, 80],
    ['Toadflax', 5296, 3049, 2998, 3002, 43, 80],
    ['Irit', 5297, 209, 259, 101, 46, 80],
    ['Avantoe', 5298, 211, 261, 103, 50, 80],
    ['Kwuarm', 5299, 213, 263, 105, 54, 80],
    ['Snapdragon', 5300, 3051, 3000, 3004, 57, 80],
    ['Cadantine', 5301, 215, 265, 107, 60, 80],
    ['Lantadyme', 5302, 2485, 2481, 2483, 64, 80],
    ['Dwarf weed', 5303, 217, 267, 109, 67, 80],
    ['Torstol', 5304, 219, 269, 111, 71, 80]
];

// Coral data: [name, fragId, coralId, lowCTS, highCTS, protectionItemId, protectionQtyPerPatch]
const GIANT_SEAWEED_ID = 21504;
const CORAL_DATA = [
    ['Elkhorn coral', 31511, 31481,  100, 205, GIANT_SEAWEED_ID, 5],
    ['Pillar coral',  31513, 31484,   48, 205, 31481,            5],
    ['Umbral coral',  31515, 31487, -110, 205, 31484,            5],
];
const CORAL_HARVEST_LIVES = 4;
const CORAL_NUM_PATCHES = 2;

// Allotment data: [name, seedId, cropId, lowCTS, highCTS, levelReq, protItemId, protQtyPerPatch, protDesc]
// Note: CTS values are approximate estimates based on OSRS wiki data — verify against wiki if precision matters.
// protItemId = null means payment is in-kind with crops and not GE-tradeable in convenient form.
const ALLOTMENT_DATA = [
    ['Potato',       5318,  1942,  25,  80,  1, null,  0, 'N/A'],
    ['Onion',        5319,  1957,  25,  80,  5, null,  0, 'N/A'],
    ['Cabbage',      5324,  1965,  25,  80,  7, null,  0, 'N/A'],
    ['Tomato',       5322,  1982,  30, 100, 12, null,  0, 'N/A'],
    ['Sweetcorn',    5320,  5986,  40, 120, 20, 5931, 10, '10 Jute fibres'],
    ['Strawberry',   5323,  5504,  45, 133, 31, 5376,  1, '1 Basket of apples'],
    ['Watermelon',   5321,  5982,  55, 155, 47, 5763, 10, '10 Curry leaves'],
    ['Snape grass',  22879,  231,  65, 170, 61,  247,  5, '5 Jangerberries'],
];
const WHITE_LILY_SEED_ID = 22875; // Grown in flower patches to auto-protect adjacent allotments
const ALLOTMENT_BASE_LIVES = 3;

// Farming parameters (defaults)
let farmingParams = {
    level: 99,
    numPatches: 10, // Total patches
    runsPerDay: 6,  // How many runs the player does per day (max 18 — herbs grow every 80 min)
    compostType: 3, // 0=none, 1=compost, 2=super, 3=ultra
    magicSecateurs: true,
    farmingCape: true,
    attasSeed: true,
    coralProtection: true,
    // Diary bonuses
    kandarinDiaryBonus: 10, // 0, 10, 17, or 25 (None, Medium, Hard, Elite)
    kourendDiary: true, // Kourend & Kebos Hard completed
    // Protected patches (user-selectable)
    patches: {
        weiss: true,
        trollheim: true,
        harmony: true,
        hosidius: true,
        civitas: false
    },
    // Allotment parameters
    numAllotmentPatches: 9, // Standard areas: Falador, Ardougne, Catherby, Canifis, Port Phasmatys, Hosidius + more
    allotmentProtection: false, // Pay gardener per patch
    whiteLily: false,           // Grow white lily in flower patches (1 seed per 2 allotment patches)
};

// Persistence
const STORAGE_KEY = 'osrs_farming_params';

function saveParams() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(farmingParams));
}

function loadParams() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            // Merge saved values onto defaults to handle new keys added in future
            farmingParams = Object.assign({}, farmingParams, parsed, {
                patches: Object.assign({}, farmingParams.patches, parsed.patches || {})
            });
        }
    } catch (e) {
        console.warn('Failed to load saved params:', e);
    }
}

function syncUIToParams() {
    farmingLevelInput.value = farmingParams.level;
    farmingLevelValue.textContent = farmingParams.level;
    numPatchesInput.value = farmingParams.numPatches;
    numPatchesValue.textContent = farmingParams.numPatches;
    runsPerDayInput.value = farmingParams.runsPerDay;
    runsPerDayValue.textContent = farmingParams.runsPerDay;
    compostTypeSelect.value = farmingParams.compostType;
    magicSecateursCheck.checked = farmingParams.magicSecateurs;
    farmingCapeCheck.checked = farmingParams.farmingCape;
    attasSeedCheck.checked = farmingParams.attasSeed;
    kandarinDiarySelect.value = farmingParams.kandarinDiaryBonus;
    kourendDiaryCheck.checked = farmingParams.kourendDiary;
    patchWeissCheck.checked = farmingParams.patches.weiss;
    patchTrollheimCheck.checked = farmingParams.patches.trollheim;
    patchHarmonyCheck.checked = farmingParams.patches.harmony;
    patchHosidiusCheck.checked = farmingParams.patches.hosidius;
    patchCivitasCheck.checked = farmingParams.patches.civitas;
    document.getElementById('coralProtection').checked = farmingParams.coralProtection;
    document.getElementById('numAllotmentPatches').value = farmingParams.numAllotmentPatches;
    document.getElementById('numAllotmentPatchesValue').textContent = farmingParams.numAllotmentPatches;
    document.getElementById('allotmentProtection').checked = farmingParams.allotmentProtection;
    document.getElementById('whiteLily').checked = farmingParams.whiteLily;
}

// Global state
let priceData = {};
let herbsData = [];
let coralData = [];
let allotmentData = [];
let currentSort = 'profit';
let activeTab = 'herbs';

// DOM Elements
const refreshBtn = document.getElementById('refreshBtn');
const statusText = document.getElementById('statusText');
const lastUpdated = document.getElementById('lastUpdated');
const loadingSpinner = document.getElementById('loadingSpinner');
const herbsContainer = document.getElementById('herbsContainer');
const coralContainer = document.getElementById('coralContainer');
const allotmentContainer = document.getElementById('allotmentContainer');
const errorMessage = document.getElementById('errorMessage');
const sortSelect = document.getElementById('sortSelect');
const installPrompt = document.getElementById('installPrompt');
const installBtn = document.getElementById('installBtn');
const dismissInstall = document.getElementById('dismissInstall');

// Parameter controls
const toggleParamsBtn = document.getElementById('toggleParams');
const paramsContent = document.getElementById('paramsContent');
const toggleIcon = document.getElementById('toggleIcon');
const farmingLevelInput = document.getElementById('farmingLevel');
const farmingLevelValue = document.getElementById('farmingLevelValue');
const numPatchesInput = document.getElementById('numPatches');
const numPatchesValue = document.getElementById('numPatchesValue');
const runsPerDayInput = document.getElementById('runsPerDay');
const runsPerDayValue = document.getElementById('runsPerDayValue');
const compostTypeSelect = document.getElementById('compostType');
const magicSecateursCheck = document.getElementById('magicSecateurs');
const farmingCapeCheck = document.getElementById('farmingCape');
const attasSeedCheck = document.getElementById('attasSeed');
const kandarinDiarySelect = document.getElementById('kandarinDiary');
const kourendDiaryCheck = document.getElementById('kourendDiary');

// Patch checkboxes
const patchWeissCheck = document.getElementById('patchWeiss');
const patchTrollheimCheck = document.getElementById('patchTrollheim');
const patchHarmonyCheck = document.getElementById('patchHarmony');
const patchHosidiusCheck = document.getElementById('patchHosidius');
const patchCivitasCheck = document.getElementById('patchCivitas');

const patchesDisplay = document.getElementById('patchesDisplay');
const yieldDisplay = document.getElementById('yieldDisplay');
const formulaText = document.getElementById('formulaText');

// PWA Install prompt
let deferredPrompt;

// Event Listeners
refreshBtn.addEventListener('click', loadPrices);
sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    if (activeTab === 'herbs') {
        renderHerbs();
    } else if (activeTab === 'coral') {
        renderCoral();
    } else {
        renderAllotments();
    }
});

// Parameter toggle
toggleParamsBtn.addEventListener('click', () => {
    paramsContent.classList.toggle('hidden');
    toggleIcon.classList.toggle('rotated');
});

// Parameter controls
farmingLevelInput.addEventListener('input', (e) => {
    farmingParams.level = parseInt(e.target.value);
    farmingLevelValue.textContent = e.target.value;
    updateCalculations();
});

numPatchesInput.addEventListener('input', (e) => {
    farmingParams.numPatches = parseInt(e.target.value);
    numPatchesValue.textContent = e.target.value;
    updateCalculations();
});

runsPerDayInput.addEventListener('input', (e) => {
    farmingParams.runsPerDay = parseInt(e.target.value);
    runsPerDayValue.textContent = e.target.value;
    updateCalculations();
});

compostTypeSelect.addEventListener('change', (e) => {
    farmingParams.compostType = parseInt(e.target.value);
    updateCalculations();
});

magicSecateursCheck.addEventListener('change', (e) => {
    farmingParams.magicSecateurs = e.target.checked;
    updateCalculations();
});

farmingCapeCheck.addEventListener('change', (e) => {
    farmingParams.farmingCape = e.target.checked;
    updateCalculations();
});

attasSeedCheck.addEventListener('change', (e) => {
    farmingParams.attasSeed = e.target.checked;
    updateCalculations();
});

kandarinDiarySelect.addEventListener('change', (e) => {
    farmingParams.kandarinDiaryBonus = parseInt(e.target.value);
    updateCalculations();
});

kourendDiaryCheck.addEventListener('change', (e) => {
    farmingParams.kourendDiary = e.target.checked;
    updateCalculations();
});

// Patch selection listeners
patchWeissCheck.addEventListener('change', (e) => {
    farmingParams.patches.weiss = e.target.checked;
    updateCalculations();
});

patchTrollheimCheck.addEventListener('change', (e) => {
    farmingParams.patches.trollheim = e.target.checked;
    updateCalculations();
});

patchHarmonyCheck.addEventListener('change', (e) => {
    farmingParams.patches.harmony = e.target.checked;
    updateCalculations();
});

patchHosidiusCheck.addEventListener('change', (e) => {
    farmingParams.patches.hosidius = e.target.checked;
    updateCalculations();
});

patchCivitasCheck.addEventListener('change', (e) => {
    farmingParams.patches.civitas = e.target.checked;
    updateCalculations();
});

// Tab navigation
document.getElementById('tabHerbs').addEventListener('click', () => switchTab('herbs'));
document.getElementById('tabCoral').addEventListener('click', () => switchTab('coral'));
document.getElementById('tabAllotments').addEventListener('click', () => switchTab('allotments'));

document.getElementById('coralProtection').addEventListener('change', (e) => {
    farmingParams.coralProtection = e.target.checked;
    updateCalculations();
});

// Allotment parameter listeners
document.getElementById('numAllotmentPatches').addEventListener('input', (e) => {
    farmingParams.numAllotmentPatches = parseInt(e.target.value);
    document.getElementById('numAllotmentPatchesValue').textContent = e.target.value;
    updateCalculations();
});

document.getElementById('allotmentProtection').addEventListener('change', (e) => {
    farmingParams.allotmentProtection = e.target.checked;
    updateCalculations();
});

document.getElementById('whiteLily').addEventListener('change', (e) => {
    farmingParams.whiteLily = e.target.checked;
    updateCalculations();
});

// PWA Install handlers
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;

    // Show install prompt after 3 seconds
    setTimeout(() => {
        if (installPrompt) {
            installPrompt.classList.remove('hidden');
        }
    }, 3000);
});

if (installBtn) {
    installBtn.addEventListener('click', async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            deferredPrompt = null;
            installPrompt.classList.add('hidden');
        }
    });
}

if (dismissInstall) {
    dismissInstall.addEventListener('click', () => {
        installPrompt.classList.add('hidden');
    });
}

// Yield Calculation Functions
function skillInterp(low, high, level) {
    // Wiki formula: weighted interpolation with floor operations
    const value = Math.floor(low * (99 - level) / 98) + Math.floor(high * (level - 1) / 98) + 1;
    // Divide by 256 and clamp to [0, 1]
    return Math.min(Math.max(value / 256, 0), 1);
}

function calculateDeathRate(compostType) {
    // Base death rate for herbs is ~65.4% without compost at high farming levels
    // Compost reduces death rate:
    // None: base rate
    // Compost: 50% reduction
    // Supercompost: 80% reduction
    // Ultracompost: 90% reduction

    // Using observed values from wiki at level 99:
    // With ultracompost: 6.868% death rate
    const baseDeathRate = 0.6868; // 68.68% base rate

    const reductionMultipliers = [
        1.0,    // No compost: full base rate
        0.5,    // Compost: 50% of base
        0.2,    // Supercompost: 20% of base
        0.1     // Ultracompost: 10% of base
    ];

    return baseDeathRate * reductionMultipliers[compostType];
}

function calculateChanceToSave(lowCTS, highCTS, farmingLevel, diaryBonus = 0) {
    // Calculate item bonus
    let itemBonus = 0;
    if (farmingParams.magicSecateurs) itemBonus += 0.1;
    if (farmingParams.farmingCape) itemBonus += 0.05;

    // Step 1: Apply item bonus with floor
    let lowCTSFinal = Math.floor(lowCTS * (1 + itemBonus));
    let highCTSFinal = Math.floor(highCTS * (1 + itemBonus));

    // Step 2: Add diary bonus (flat addition)
    lowCTSFinal = lowCTSFinal + diaryBonus;
    highCTSFinal = highCTSFinal + diaryBonus;

    // Step 3: Apply Attas bonus with floor
    if (farmingParams.attasSeed) {
        lowCTSFinal = Math.floor(lowCTSFinal * 1.05);
        highCTSFinal = Math.floor(highCTSFinal * 1.05);
    }

    // skillInterp returns a probability (0-1) directly
    return skillInterp(lowCTSFinal, highCTSFinal, farmingLevel);
}

function calculateExpectedYield(lowCTS, highCTS, diaryBonus = 0) {
    // Calculate harvest lives based on compost
    const harvestLives = BASE_HARVEST_LIVES + farmingParams.compostType;

    // Calculate chance to save with diary bonus
    const chanceToSave = calculateChanceToSave(lowCTS, highCTS, farmingParams.level, diaryBonus);

    // Expected yield per patch = harvestLives / (1 - chanceToSave)
    const yieldPerPatch = harvestLives / (1 - chanceToSave);

    return yieldPerPatch;
}

function calculateTotalYield(lowCTS, highCTS) {
    // Calculate death rate for non-protected patches
    const deathRate = calculateDeathRate(farmingParams.compostType);
    const survivalRate = 1 - deathRate;

    let totalYield = 0;
    let patchesUsed = 0;

    // Protected patches (0% death rate)
    if (farmingParams.patches.weiss && patchesUsed < farmingParams.numPatches) {
        const yieldPerPatch = calculateExpectedYield(lowCTS, highCTS, 0);
        totalYield += yieldPerPatch;
        patchesUsed++;
    }

    if (farmingParams.patches.trollheim && patchesUsed < farmingParams.numPatches) {
        const yieldPerPatch = calculateExpectedYield(lowCTS, highCTS, 0);
        totalYield += yieldPerPatch;
        patchesUsed++;
    }

    if (farmingParams.patches.harmony && patchesUsed < farmingParams.numPatches) {
        const yieldPerPatch = calculateExpectedYield(lowCTS, highCTS, 0);
        totalYield += yieldPerPatch;
        patchesUsed++;
    }

    if (farmingParams.patches.hosidius && patchesUsed < farmingParams.numPatches) {
        const diaryBonus = farmingParams.kourendDiary ? 10 : 0;
        const yieldPerPatch = calculateExpectedYield(lowCTS, highCTS, diaryBonus);
        totalYield += yieldPerPatch; // Protected (0% death)
        patchesUsed++;
    }

    if (farmingParams.patches.civitas && patchesUsed < farmingParams.numPatches) {
        const yieldPerPatch = calculateExpectedYield(lowCTS, highCTS, 0);
        totalYield += yieldPerPatch;
        patchesUsed++;
    }

    // Non-protected patches (have death rate)
    // Catherby - included if Kandarin diary is selected
    if (farmingParams.kandarinDiaryBonus > 0 && patchesUsed < farmingParams.numPatches) {
        const yieldPerPatch = calculateExpectedYield(lowCTS, highCTS, farmingParams.kandarinDiaryBonus);
        totalYield += yieldPerPatch * survivalRate;
        patchesUsed++;
    }

    // Farming Guild - included if Kourend diary is checked
    if (farmingParams.kourendDiary && patchesUsed < farmingParams.numPatches) {
        const diaryBonus = 10;
        const yieldPerPatch = calculateExpectedYield(lowCTS, highCTS, diaryBonus);
        totalYield += yieldPerPatch * survivalRate;
        patchesUsed++;
    }

    // Remaining patches are standard (no diary bonus, have death rate)
    const remainingPatches = farmingParams.numPatches - patchesUsed;
    if (remainingPatches > 0) {
        const yieldPerPatch = calculateExpectedYield(lowCTS, highCTS, 0);
        totalYield += yieldPerPatch * survivalRate * remainingPatches;
    }

    return totalYield;
}

function calculateCoralTotalYield(lowCTS, highCTS) {
    const chanceToSave = calculateChanceToSave(lowCTS, highCTS, farmingParams.level, 0);
    return CORAL_HARVEST_LIVES / (1 - chanceToSave) * CORAL_NUM_PATCHES;
}

function calculateAllotmentYieldPerPatch(lowCTS, highCTS) {
    const harvestLives = ALLOTMENT_BASE_LIVES + farmingParams.compostType;
    const chanceToSave = calculateChanceToSave(lowCTS, highCTS, farmingParams.level, 0);
    return harvestLives / (1 - chanceToSave);
}

function calculateAllotmentTotalYield(lowCTS, highCTS) {
    const yieldPerPatch = calculateAllotmentYieldPerPatch(lowCTS, highCTS);
    const isProtected = farmingParams.whiteLily || farmingParams.allotmentProtection;
    const deathRate = isProtected ? 0 : calculateDeathRate(farmingParams.compostType);
    return yieldPerPatch * farmingParams.numAllotmentPatches * (1 - deathRate);
}

// Utility Functions
function formatGP(amount) {
    if (!amount && amount !== 0) return 'N/A';
    return Math.round(amount).toLocaleString() + ' gp';
}

function formatProfit(profit) {
    if (!profit && profit !== 0) return 'N/A';
    const rounded = Math.round(profit);
    const sign = rounded >= 0 ? '+' : '';
    return sign + rounded.toLocaleString() + ' gp';
}

function formatROI(roi) {
    if (!roi && roi !== 0) return 'N/A';
    const sign = roi >= 0 ? '+' : '';
    return sign + roi.toFixed(1) + '%';
}

function getPrice(itemId) {
    const item = priceData[itemId.toString()];
    if (!item) return null;

    const high = item.high || 0;
    const low = item.low || 0;

    if (high && low) {
        return Math.floor((high + low) / 2);
    }
    return high || low || null;
}

function calculateProfit(seedPrice, unfPotionPrice, totalYield, totalPatches) {
    if (!seedPrice || !unfPotionPrice) return { profit: 0, roi: 0, yieldPerPatch: 0 };

    const investment = totalPatches * seedPrice;
    const revenue = totalYield * unfPotionPrice;
    const profit = revenue - investment;
    const roi = investment > 0 ? (profit / investment * 100) : 0;
    const yieldPerPatch = totalPatches > 0 ? totalYield / totalPatches : 0;

    return { profit, roi, yieldPerPatch };
}

// Main Functions
async function loadPrices() {
    try {
        // Update UI state
        setLoading(true);
        errorMessage.classList.add('hidden');
        herbsContainer.innerHTML = '';
        coralContainer.innerHTML = '';
        allotmentContainer.innerHTML = '';
        statusText.textContent = 'Fetching prices...';

        // Fetch data from API
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error('Failed to fetch prices');
        }

        const data = await response.json();
        priceData = data.data || {};

        // Process herb, coral, and allotment data
        processHerbData();
        processCoralData();
        processAllotmentData();

        // Update UI
        renderHerbs();
        renderCoral();
        renderAllotments();
        updateDisplays();

        // Update status
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
        lastUpdated.textContent = `Updated: ${timeString}`;
        statusText.textContent = 'Prices loaded successfully';

        setLoading(false);

    } catch (error) {
        console.error('Error loading prices:', error);
        setLoading(false);
        errorMessage.classList.remove('hidden');
        statusText.textContent = 'Failed to load prices';
    }
}

function processHerbData() {
    herbsData = [];

    HERB_DATA.forEach(([name, seedId, grimyId, cleanId, unfId, lowCTS, highCTS]) => {
        const seedPrice = getPrice(seedId);
        const grimyPrice = getPrice(grimyId);
        const cleanPrice = getPrice(cleanId);
        const unfPotionPrice = getPrice(unfId);

        if (seedPrice && unfPotionPrice) {
            const totalYield = calculateTotalYield(lowCTS, highCTS);
            const totalPatches = getTotalPatches();
            const { profit, roi, yieldPerPatch } = calculateProfit(seedPrice, unfPotionPrice, totalYield, totalPatches);

            herbsData.push({
                name,
                seedPrice,
                grimyPrice,
                cleanPrice,
                unfPotionPrice,
                profit,
                roi,
                investment: totalPatches * seedPrice,
                totalYield: totalYield,
                yieldPerPatch: yieldPerPatch,
                lowCTS,
                highCTS
            });
        }
    });
}

function processCoralData() {
    coralData = [];

    CORAL_DATA.forEach(([name, fragId, coralId, lowCTS, highCTS, protectionItemId, protectionQtyPerPatch]) => {
        const fragPrice = getPrice(fragId);
        const coralPrice = getPrice(coralId);
        const protectionItemPrice = getPrice(protectionItemId);

        if (fragPrice && coralPrice) {
            const totalYield = calculateCoralTotalYield(lowCTS, highCTS);
            const yieldPerPatch = totalYield / CORAL_NUM_PATCHES;
            const investment = CORAL_NUM_PATCHES * fragPrice;
            const protectionCost = farmingParams.coralProtection && protectionItemPrice
                ? protectionItemPrice * protectionQtyPerPatch * CORAL_NUM_PATCHES
                : 0;
            const revenue = totalYield * coralPrice;
            const profit = revenue - investment - protectionCost;
            const roi = investment > 0 ? (profit / investment * 100) : 0;

            coralData.push({ name, fragPrice, coralPrice, yieldPerPatch, totalYield, investment, protectionCost, profit, roi });
        }
    });
}

function processAllotmentData() {
    allotmentData = [];
    const whiteLilySeedPrice = getPrice(WHITE_LILY_SEED_ID);
    const numPatches = farmingParams.numAllotmentPatches;
    const numWhiteLilies = Math.ceil(numPatches / 2);
    const isProtected = farmingParams.whiteLily || farmingParams.allotmentProtection;

    ALLOTMENT_DATA.forEach(([name, seedId, cropId, lowCTS, highCTS, levelReq, protItemId, protQty, protDesc]) => {
        const seedPrice = getPrice(seedId);
        const cropPrice = getPrice(cropId);
        if (!seedPrice || !cropPrice) return;

        const protItemPrice = protItemId ? getPrice(protItemId) : null;
        const totalYield = calculateAllotmentTotalYield(lowCTS, highCTS);
        const yieldPerPatch = calculateAllotmentYieldPerPatch(lowCTS, highCTS);

        // Seed investment per run
        const seedCost = numPatches * seedPrice;

        // White lily cost: 1 seed per 2 allotment patches (1 flower patch per area)
        const whiteLilyCost = (farmingParams.whiteLily && whiteLilySeedPrice)
            ? numWhiteLilies * whiteLilySeedPrice
            : 0;

        // Gardener protection cost per run (only when not using white lily, and item is GE-tradeable)
        const protectionCost = (!farmingParams.whiteLily && farmingParams.allotmentProtection && protItemPrice && protQty > 0)
            ? numPatches * protQty * protItemPrice
            : 0;

        const investment = seedCost + whiteLilyCost;
        const revenue = totalYield * cropPrice;
        const profit = revenue - investment - protectionCost;
        const roi = investment > 0 ? (profit / investment * 100) : 0;

        allotmentData.push({
            name, levelReq,
            seedPrice, cropPrice,
            protItemPrice, protDesc, protQty,
            numWhiteLilies, whiteLilyCost, whiteLilySeedPrice,
            protectionCost,
            seedCost, investment, revenue,
            profit, roi,
            totalYield, yieldPerPatch,
            isProtected,
        });
    });
}

function updateCalculations() {
    saveParams();
    if (Object.keys(priceData).length > 0) {
        processHerbData();
        processCoralData();
        processAllotmentData();
        renderHerbs();
        renderCoral();
        renderAllotments();
        updateDisplays();
    }
}

function getTotalPatches() {
    return farmingParams.numPatches;
}

function getNamedPatchCount() {
    return Object.values(farmingParams.patches).filter(v => v).length;
}

function getProtectedPatchCount() {
    let count = 0;
    if (farmingParams.patches.weiss) count++;
    if (farmingParams.patches.trollheim) count++;
    if (farmingParams.patches.harmony) count++;
    if (farmingParams.patches.hosidius) count++;
    if (farmingParams.patches.civitas) count++;
    return count;
}

function updateDisplays() {
    if (activeTab === 'herbs') {
        const totalPatches = getTotalPatches();
        const protectedCount = getProtectedPatchCount();
        patchesDisplay.textContent = `${totalPatches} patches`;

        if (herbsData.length > 0) {
            const avgTotalYield = herbsData.reduce((sum, herb) => sum + herb.totalYield, 0) / herbsData.length;
            yieldDisplay.textContent = `${Math.round(avgTotalYield)} avg yield`;
        }

        const compostNames = ['None', 'Compost', 'Supercompost', 'Ultracompost'];
        const compostName = compostNames[farmingParams.compostType];
        const deathRate = calculateDeathRate(farmingParams.compostType);
        const deathRatePercent = (deathRate * 100).toFixed(1);
        formulaText.textContent = `Lvl ${farmingParams.level} | ${compostName} | ${protectedCount} protected | ${deathRatePercent}% death`;
    } else if (activeTab === 'coral') {
        patchesDisplay.textContent = '2 patches';

        if (coralData.length > 0) {
            const avgYield = coralData.reduce((sum, c) => sum + c.totalYield, 0) / coralData.length;
            yieldDisplay.textContent = `${Math.round(avgYield)} avg yield`;
        }

        formulaText.textContent = `Lvl ${farmingParams.level} | 4 lives (fixed) | No compost bonus`;
    } else {
        // Allotments
        const numP = farmingParams.numAllotmentPatches;
        patchesDisplay.textContent = `${numP} patches`;

        if (allotmentData.length > 0) {
            const avgYield = allotmentData.reduce((sum, a) => sum + a.totalYield, 0) / allotmentData.length;
            yieldDisplay.textContent = `${Math.round(avgYield)} avg yield`;
        }

        const isProtected = farmingParams.whiteLily || farmingParams.allotmentProtection;
        const protLabel = farmingParams.whiteLily ? 'White Lily' : farmingParams.allotmentProtection ? 'Gardener' : 'Unprotected';
        const deathRate = isProtected ? 0 : calculateDeathRate(farmingParams.compostType);
        const compostNames = ['None', 'Compost', 'Supercompost', 'Ultracompost'];
        formulaText.textContent = `Lvl ${farmingParams.level} | ${compostNames[farmingParams.compostType]} | ${protLabel} | ${(deathRate * 100).toFixed(1)}% death`;
    }
}

function sortHerbs() {
    switch (currentSort) {
        case 'profit':
            herbsData.sort((a, b) => b.profit - a.profit);
            break;
        case 'roi':
            herbsData.sort((a, b) => b.roi - a.roi);
            break;
        case 'name':
            herbsData.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'seed_price':
            herbsData.sort((a, b) => a.seedPrice - b.seedPrice);
            break;
    }
}

function renderHerbs() {
    sortHerbs();
    herbsContainer.innerHTML = '';

    herbsData.forEach(herb => {
        const card = createHerbCard(herb);
        herbsContainer.appendChild(card);
    });
}

function createHerbCard(herb) {
    const card = document.createElement('div');
    card.className = `herb-card ${herb.profit >= 0 ? 'profitable' : 'unprofitable'}`;

    const totalPatches = getTotalPatches();
    const avgYieldPerPatch = totalPatches > 0 ? herb.totalYield / totalPatches : 0;
    const runs = farmingParams.runsPerDay;
    const seedCostPerDay = herb.investment * runs;
    const yieldPerDay = herb.totalYield * runs;
    const profitPerDay = herb.profit * runs;
    const profitPerWeek = profitPerDay * 7;

    card.innerHTML = `
        <div class="herb-header">
            <h2 class="herb-name">${herb.name}</h2>
            <div class="herb-profit ${herb.profit >= 0 ? 'profit-positive' : 'profit-negative'}">
                ${formatProfit(herb.profit)}
            </div>
        </div>

        <div class="herb-details">
            <div class="detail-item">
                <span class="detail-label">Total Yield</span>
                <span class="detail-value">${Math.round(herb.totalYield)} (${Math.round(avgYieldPerPatch)}/patch avg)</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Seed Price</span>
                <span class="detail-value">${formatGP(herb.seedPrice)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Unf. Potion</span>
                <span class="detail-value">${formatGP(herb.unfPotionPrice)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Investment</span>
                <span class="detail-value">${formatGP(herb.investment)}</span>
            </div>
        </div>

        <div class="herb-footer">
            <span class="roi-badge ${herb.roi >= 0 ? 'roi-positive' : 'roi-negative'}">
                ROI: ${formatROI(herb.roi)}
            </span>
            <span class="investment-text">
                Revenue: ${formatGP(Math.round(herb.totalYield * herb.unfPotionPrice))}
            </span>
        </div>

        <div class="daily-stats">
            <div class="daily-stats-title">Daily (${runs} runs/day)</div>
            <div class="herb-details">
                <div class="detail-item">
                    <span class="detail-label">Seed Cost/Day</span>
                    <span class="detail-value">${formatGP(seedCostPerDay)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Yield/Day</span>
                    <span class="detail-value">${Math.round(yieldPerDay)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Profit/Day</span>
                    <span class="detail-value ${profitPerDay >= 0 ? 'profit-positive' : 'profit-negative'}">${formatProfit(profitPerDay)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Profit/Week</span>
                    <span class="detail-value ${profitPerWeek >= 0 ? 'profit-positive' : 'profit-negative'}">${formatProfit(profitPerWeek)}</span>
                </div>
            </div>
        </div>
    `;

    return card;
}

function sortCoral() {
    switch (currentSort) {
        case 'profit':
            coralData.sort((a, b) => b.profit - a.profit);
            break;
        case 'roi':
            coralData.sort((a, b) => b.roi - a.roi);
            break;
        case 'name':
            coralData.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'seed_price':
            coralData.sort((a, b) => a.fragPrice - b.fragPrice);
            break;
    }
}

function renderCoral() {
    sortCoral();
    coralContainer.innerHTML = '';
    coralData.forEach(coral => {
        coralContainer.appendChild(createCoralCard(coral));
    });
}

function createCoralCard(coral) {
    const card = document.createElement('div');
    card.className = `herb-card ${coral.profit >= 0 ? 'profitable' : 'unprofitable'}`;

    card.innerHTML = `
        <div class="herb-header">
            <h2 class="herb-name">${coral.name}</h2>
            <div class="herb-profit ${coral.profit >= 0 ? 'profit-positive' : 'profit-negative'}">
                ${formatProfit(coral.profit)}
            </div>
        </div>

        <div class="herb-details">
            <div class="detail-item">
                <span class="detail-label">Total Yield</span>
                <span class="detail-value">${Math.round(coral.totalYield)} (${Math.round(coral.yieldPerPatch)}/patch avg)</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Frag Price</span>
                <span class="detail-value">${formatGP(coral.fragPrice)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Coral Price</span>
                <span class="detail-value">${formatGP(coral.coralPrice)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Investment</span>
                <span class="detail-value">${formatGP(coral.investment)}</span>
            </div>
            ${farmingParams.coralProtection ? `
            <div class="detail-item">
                <span class="detail-label">Protection</span>
                <span class="detail-value">${formatGP(Math.round(coral.protectionCost))}</span>
            </div>` : ''}
        </div>

        <div class="herb-footer">
            <span class="roi-badge ${coral.roi >= 0 ? 'roi-positive' : 'roi-negative'}">
                ROI: ${formatROI(coral.roi)}
            </span>
            <span class="investment-text">
                Revenue: ${formatGP(Math.round(coral.totalYield * coral.coralPrice))}
            </span>
        </div>

        <div class="daily-stats">
            <div class="daily-stats-title">Daily (${farmingParams.runsPerDay} runs/day)</div>
            <div class="herb-details">
                <div class="detail-item">
                    <span class="detail-label">Frag Cost/Day</span>
                    <span class="detail-value">${formatGP(coral.investment * farmingParams.runsPerDay)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Yield/Day</span>
                    <span class="detail-value">${Math.round(coral.totalYield * farmingParams.runsPerDay)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Profit/Day</span>
                    <span class="detail-value ${coral.profit * farmingParams.runsPerDay >= 0 ? 'profit-positive' : 'profit-negative'}">${formatProfit(coral.profit * farmingParams.runsPerDay)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Profit/Week</span>
                    <span class="detail-value ${coral.profit * farmingParams.runsPerDay * 7 >= 0 ? 'profit-positive' : 'profit-negative'}">${formatProfit(coral.profit * farmingParams.runsPerDay * 7)}</span>
                </div>
            </div>
        </div>
    `;

    return card;
}

function sortAllotments() {
    switch (currentSort) {
        case 'profit':
            allotmentData.sort((a, b) => b.profit - a.profit);
            break;
        case 'roi':
            allotmentData.sort((a, b) => b.roi - a.roi);
            break;
        case 'name':
            allotmentData.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'seed_price':
            allotmentData.sort((a, b) => a.seedPrice - b.seedPrice);
            break;
    }
}

function renderAllotments() {
    sortAllotments();
    allotmentContainer.innerHTML = '';
    allotmentData.forEach(a => allotmentContainer.appendChild(createAllotmentCard(a)));
}

function createAllotmentCard(allotment) {
    const card = document.createElement('div');
    card.className = `herb-card ${allotment.profit >= 0 ? 'profitable' : 'unprofitable'}`;

    const runs = farmingParams.runsPerDay;
    const profitPerDay = allotment.profit * runs;
    const profitPerWeek = profitPerDay * 7;

    let protectionLine = '';
    if (farmingParams.whiteLily) {
        const wlCostStr = allotment.whiteLilySeedPrice
            ? `${formatGP(allotment.whiteLilyCost)} (${allotment.numWhiteLilies} seeds)`
            : 'Price unavailable';
        protectionLine = `
            <div class="detail-item">
                <span class="detail-label">White Lily</span>
                <span class="detail-value">${wlCostStr}</span>
            </div>`;
    } else if (farmingParams.allotmentProtection && allotment.protQty > 0) {
        const protCostStr = allotment.protItemPrice
            ? `${formatGP(allotment.protectionCost)} (${allotment.protDesc})`
            : `${allotment.protDesc} (price N/A)`;
        protectionLine = `
            <div class="detail-item">
                <span class="detail-label">Protection</span>
                <span class="detail-value">${protCostStr}</span>
            </div>`;
    } else if (farmingParams.allotmentProtection && allotment.protQty === 0) {
        protectionLine = `
            <div class="detail-item">
                <span class="detail-label">Protection</span>
                <span class="detail-value">In-kind (not tracked)</span>
            </div>`;
    }

    card.innerHTML = `
        <div class="herb-header">
            <h2 class="herb-name">${allotment.name} <span class="level-req">Lv.${allotment.levelReq}</span></h2>
            <div class="herb-profit ${allotment.profit >= 0 ? 'profit-positive' : 'profit-negative'}">
                ${formatProfit(allotment.profit)}
            </div>
        </div>

        <div class="herb-details">
            <div class="detail-item">
                <span class="detail-label">Total Yield</span>
                <span class="detail-value">${Math.round(allotment.totalYield)} (${allotment.yieldPerPatch.toFixed(1)}/patch)</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Seed Price</span>
                <span class="detail-value">${formatGP(allotment.seedPrice)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Crop Price</span>
                <span class="detail-value">${formatGP(allotment.cropPrice)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Investment</span>
                <span class="detail-value">${formatGP(allotment.investment)}</span>
            </div>
            ${protectionLine}
        </div>

        <div class="herb-footer">
            <span class="roi-badge ${allotment.roi >= 0 ? 'roi-positive' : 'roi-negative'}">
                ROI: ${formatROI(allotment.roi)}
            </span>
            <span class="investment-text">
                Revenue: ${formatGP(Math.round(allotment.revenue))}
            </span>
        </div>

        <div class="daily-stats">
            <div class="daily-stats-title">Daily (${runs} runs/day) · ${allotment.isProtected ? 'Protected' : 'Unprotected'}</div>
            <div class="herb-details">
                <div class="detail-item">
                    <span class="detail-label">Yield/Day</span>
                    <span class="detail-value">${Math.round(allotment.totalYield * runs)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Profit/Day</span>
                    <span class="detail-value ${profitPerDay >= 0 ? 'profit-positive' : 'profit-negative'}">${formatProfit(profitPerDay)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Profit/Week</span>
                    <span class="detail-value ${profitPerWeek >= 0 ? 'profit-positive' : 'profit-negative'}">${formatProfit(profitPerWeek)}</span>
                </div>
            </div>
        </div>
    `;

    return card;
}

function switchTab(tab) {
    activeTab = tab;
    document.getElementById('tabHerbs').classList.toggle('active', tab === 'herbs');
    document.getElementById('tabCoral').classList.toggle('active', tab === 'coral');
    document.getElementById('tabAllotments').classList.toggle('active', tab === 'allotments');
    herbsContainer.classList.toggle('hidden', tab !== 'herbs');
    coralContainer.classList.toggle('hidden', tab !== 'coral');
    allotmentContainer.classList.toggle('hidden', tab !== 'allotments');
    document.getElementById('herbOnlyParams').classList.toggle('hidden', tab !== 'herbs');
    document.getElementById('coralOnlyParams').classList.toggle('hidden', tab !== 'coral');
    document.getElementById('allotmentOnlyParams').classList.toggle('hidden', tab !== 'allotments');
    updateDisplays();
}

function setLoading(isLoading) {
    if (isLoading) {
        refreshBtn.classList.add('loading');
        refreshBtn.disabled = true;
        loadingSpinner.classList.remove('hidden');
    } else {
        refreshBtn.classList.remove('loading');
        refreshBtn.disabled = false;
        loadingSpinner.classList.add('hidden');
    }
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
            .then(registration => {
                console.log('ServiceWorker registered:', registration);
            })
            .catch(error => {
                console.log('ServiceWorker registration failed:', error);
            });
    });
}

// Load prices on app start
window.addEventListener('load', () => {
    loadParams();
    syncUIToParams();
    loadPrices();
});

// Pull to refresh (optional enhancement)
let touchStartY = 0;
let touchEndY = 0;

document.addEventListener('touchstart', (e) => {
    touchStartY = e.touches[0].clientY;
});

document.addEventListener('touchmove', (e) => {
    touchEndY = e.touches[0].clientY;
});

document.addEventListener('touchend', () => {
    const pullDistance = touchEndY - touchStartY;

    // If pulled down more than 100px from the top
    if (pullDistance > 100 && window.scrollY === 0) {
        loadPrices();
    }
});
