// OSRS Herb Profit Calculator - Mobile App
// Main JavaScript file

// Constants
const SEEDS_PER_RUN = 10;
const AVERAGE_YIELD = 92;
const API_URL = 'https://prices.runescape.wiki/api/v1/osrs/latest';

// Herb data: [name, seed_id, grimy_id, clean_id, unf_potion_id]
const HERB_DATA = [
    ['Guam', 5291, 199, 249, 91],
    ['Marrentill', 5292, 201, 251, 93],
    ['Tarromin', 5293, 203, 253, 95],
    ['Harralander', 5294, 205, 255, 97],
    ['Ranarr', 5295, 207, 257, 99],
    ['Toadflax', 5296, 3049, 2998, 3002],
    ['Irit', 5297, 209, 259, 101],
    ['Avantoe', 5298, 211, 261, 103],
    ['Kwuarm', 5299, 213, 263, 105],
    ['Snapdragon', 5300, 3051, 3000, 3004],
    ['Cadantine', 5301, 215, 265, 107],
    ['Lantadyme', 5302, 2485, 2481, 2483],
    ['Dwarf weed', 5303, 217, 267, 109],
    ['Torstol', 5304, 219, 269, 111]
];

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

// PWA Install prompt
let deferredPrompt;

// Event Listeners
refreshBtn.addEventListener('click', loadPrices);
sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderHerbs();
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

function calculateProfit(seedPrice, unfPotionPrice) {
    if (!seedPrice || !unfPotionPrice) return { profit: 0, roi: 0 };

    const investment = SEEDS_PER_RUN * seedPrice;
    const revenue = AVERAGE_YIELD * unfPotionPrice;
    const profit = revenue - investment;
    const roi = investment > 0 ? (profit / investment * 100) : 0;

    return { profit, roi };
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

    HERB_DATA.forEach(([name, seedId, grimyId, cleanId, unfId]) => {
        const seedPrice = getPrice(seedId);
        const grimyPrice = getPrice(grimyId);
        const cleanPrice = getPrice(cleanId);
        const unfPotionPrice = getPrice(unfId);

        if (seedPrice && unfPotionPrice) {
            const { profit, roi } = calculateProfit(seedPrice, unfPotionPrice);

            herbsData.push({
                name,
                seedPrice,
                grimyPrice,
                cleanPrice,
                unfPotionPrice,
                profit,
                roi,
                investment: SEEDS_PER_RUN * seedPrice
            });
        }
    });
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

    card.innerHTML = `
        <div class="herb-header">
            <h2 class="herb-name">${herb.name}</h2>
            <div class="herb-profit ${herb.profit >= 0 ? 'profit-positive' : 'profit-negative'}">
                ${formatProfit(herb.profit)}
            </div>
        </div>

        <div class="herb-details">
            <div class="detail-item">
                <span class="detail-label">Seed Price</span>
                <span class="detail-value">${formatGP(herb.seedPrice)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Grimy Price</span>
                <span class="detail-value">${formatGP(herb.grimyPrice)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Clean Price</span>
                <span class="detail-value">${formatGP(herb.cleanPrice)}</span>
            </div>
            <div class="detail-item">
                <span class="detail-label">Unf. Potion</span>
                <span class="detail-value">${formatGP(herb.unfPotionPrice)}</span>
            </div>
        </div>

        <div class="herb-footer">
            <span class="roi-badge ${herb.roi >= 0 ? 'roi-positive' : 'roi-negative'}">
                ROI: ${formatROI(herb.roi)}
            </span>
            <span class="investment-text">
                Investment: ${formatGP(herb.investment)}
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
        navigator.serviceWorker.register('/service-worker.js')
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
