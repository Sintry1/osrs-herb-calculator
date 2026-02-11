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

// Farming parameters (defaults)
let farmingParams = {
    level: 99,
    numPatches: 10, // Total patches
    compostType: 3, // 0=none, 1=compost, 2=super, 3=ultra
    magicSecateurs: true,
    farmingCape: true,
    attasSeed: true,
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
    }
};

// Global state
let priceData = {};
let herbsData = [];
let currentSort = 'profit';

// DOM Elements
const refreshBtn = document.getElementById('refreshBtn');
const statusText = document.getElementById('statusText');
const lastUpdated = document.getElementById('lastUpdated');
const loadingSpinner = document.getElementById('loadingSpinner');
const herbsContainer = document.getElementById('herbsContainer');
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
    renderHerbs();
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

// Utility Functions
function formatGP(amount) {
    if (!amount && amount !== 0) return 'N/A';
    return amount.toLocaleString() + ' gp';
}

function formatProfit(profit) {
    if (!profit && profit !== 0) return 'N/A';
    const sign = profit >= 0 ? '+' : '';
    return sign + profit.toLocaleString() + ' gp';
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
        statusText.textContent = 'Fetching prices...';

        // Fetch data from API
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error('Failed to fetch prices');
        }

        const data = await response.json();
        priceData = data.data || {};

        // Process herb data
        processHerbData();

        // Update UI
        renderHerbs();
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

function updateCalculations() {
    if (Object.keys(priceData).length > 0) {
        processHerbData();
        renderHerbs();
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
    // Update header badges
    const totalPatches = getTotalPatches();
    const protectedCount = getProtectedPatchCount();
    patchesDisplay.textContent = `${totalPatches} patches`;

    // Calculate average yield across all herbs
    if (herbsData.length > 0) {
        const avgTotalYield = herbsData.reduce((sum, herb) => sum + herb.totalYield, 0) / herbsData.length;
        yieldDisplay.textContent = `${avgTotalYield.toFixed(1)} avg yield`;
    }

    // Update formula text
    const compostNames = ['None', 'Compost', 'Supercompost', 'Ultracompost'];
    const compostName = compostNames[farmingParams.compostType];
    const deathRate = calculateDeathRate(farmingParams.compostType);
    const deathRatePercent = (deathRate * 100).toFixed(1);
    formulaText.textContent = `Lvl ${farmingParams.level} | ${compostName} | ${protectedCount} protected | ${deathRatePercent}% death`;
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
                <span class="detail-value">${herb.totalYield.toFixed(2)} (${avgYieldPerPatch.toFixed(2)}/patch avg)</span>
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
    `;

    return card;
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
    // Auto-load prices when app opens
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
