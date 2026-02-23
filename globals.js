// --- ALAPVETŐ JÁTÉK ELEMEK ---
const grid = document.querySelector('.grid');
const effectsLayer = document.getElementById('effects-layer');
let activeTimeouts = []; // Itt gyűjtjük az összes futó időzítőt

const movesDisplay = document.getElementById('moves');
const scoreDisplay = document.getElementById('score-text');
const winImage = document.getElementById('win-image');
const restartBtn = document.getElementById('restart-btn');
const nextLevelBtn = document.getElementById('next-level-btn');
const btnGameOverRestart = document.getElementById('btn-gameover-restart');
const btnGameOverMenu = document.getElementById('btn-gameover-menu');

// --- ÚJ MENTÉSI VÁLTOZÓK ---
let starCurrency = 0; // A beváltható csillagok (Pénztárca)

// --- ÚJ: BÓNUSZOK (Boosterek) készlete ---
let boosters = {
    hammer: 0,     // Eltüntet 1 elemet
    rowClear: 0,   // Sor törlése
    colClear: 0,   // Oszlop törlése
    freeSwap: 0,   // Ingyenes csere (lépésvesztés nélkül)
    shuffle: 0     // Pálya újrakeverése
};
let activeBooster = null; // Megjegyzi, hogy épp célzunk-e valamelyikkel a pályán
let isNextSwapFree = false; // Add hozzá a globals.js-hez
let hasUsedBooster = false;

// A játékos haladása pályánként
// Szerkezet: { 1: { stars: 2, highScore: 1500, unlocked: true }, 2: { ... } }
let userProgress = {};

// --- KÉPERNYŐK ---
const loadingScreen = document.getElementById('loading-screen'); // ÚJ
const startScreen = document.getElementById('start-screen'); // ÚJ

const mainMenu = document.getElementById('main-menu');
const galleryScreen = document.getElementById('gallery-screen');
const shopOverlay = document.getElementById('shop-overlay');

const gameScreen = document.getElementById('game-screen');
const confirmScreen = document.getElementById('confirm-screen');

const successOverlay = document.getElementById('success-overlay');
const successText = document.querySelector('.success-text');
const skipOverlay = document.getElementById('skip-overlay');
const winScreen = document.getElementById('win-screen');

const gameOverScreen = document.getElementById('game-over-screen');

// A játék tippjeinek adatbázisa
const loadingTips = [
    { icon: "🚀", title: "Rakéta", text: "Húzz össze 4 cukorkát egy vonalban a létrehozásához!" },
    { icon: "💣", title: "Bomba", text: "Húzz össze 5 cukorkát L vagy T alakban egy hatalmas robbanásért!" },
    { icon: "💎", title: "Gyémántszív", text: "5 cukorka egy egyenes sorban? Tiéd a legerősebb fegyver!" },
    { icon: "🔨", title: "Kalapács", text: "Egyetlen ütéssel zúzz szét bármit!" },
    { icon: "🧊", title: "Üveg", text: "Pukkassz ki rajta cukorkákat, hogy megtörd az üveget!" },
    { icon: "🌀", title: "Keverés", text: "Nincs megfelelő lépés? Használd a keverést, hogy új esélyt kapj!" }
];

// --- GOMBOK ---
const btnGallery = document.getElementById('btn-gallery');
const btnBackMenu = document.getElementById('btn-back-menu');
const btnBackGallery = document.getElementById('btn-back-from-gallery');
const btnPlay = document.getElementById('btn-play');
const levelButtonsContainer = document.querySelector('.level-buttons');
const infoPanel = document.getElementById('level-info-panel');
const btnEnterGame = document.getElementById('btn-enter-game');
const btnBackFromWin = document.getElementById('btn-back-from-win');
const btnYes = document.getElementById('btn-confirm-yes');
const btnNo = document.getElementById('btn-confirm-no');

// --- JÁTÉKBEÁLLÍTÁSOK ---
grid.style.position = 'relative';
grid.style.overflow = 'hidden';

let isGamePaused = false;
let isGameWon = false;
let isPausedForWin = false;
let bonusPhaseActive = false;

const width = 8;
const squares = [];
let score = 0;
const targetScore = 500; 
let gameLoop;
let slideInterval;

let lastSwapped = []; 
let gameState = 'IDLE'; // Lehetséges értékek: IDLE, BUSY, LOCKED
let activeProcesses = 0; // Számláló: hány dolog történik egyszerre
let currentPhotoIndex = 0;

const candyEmojis = ['🩷', '🩵', '💛', '💚', '🧡', '❤️', '💙', '🖤', '💜', '🩶', '🤍'];
const wallEmoji = '🧱';

const powerHorizHTML = '<div class="power-bg-h"><span class="rocket-icon-h">🚀</span></div>';
const powerVertHTML = '<div class="power-bg-v"><span class="rocket-icon-v">🚀</span></div>';
const powerBombHTML = '<div class="power-bg-bomb"><span class="bomb-icon">💣</span></div>';
const powerColorBombHTML = '<div class="power-bg-colorbomb"><span class="colorbomb-icon">💎</span></div>';

// --- MENTÉSI RENDSZER ---
let unlockedLevel = parseInt(localStorage.getItem('LevelProgress')) || 1;
let currentLevel = 1;
let currentActiveColors = 0; // Ez felel a dinamikus színekért
let movesLeft = 0;
let layerHealth = []; 
let collectedItems = {};
let needsSaving = false; // Ez figyeli, ha menteni kell

// --- SZÍVRENDSZER ---
let hearts = 5;
let lastHeartTime = Date.now(); // Mikor vontunk le utoljára, vagy mikor töltött
let heartLimitExpiry = 0; // Mikor jár le a 8-as limit (időbélyeg)
const HEART_REGEN_TIME = 10 * 60 * 1000; // 10 perc (ezredmásodpercben)


// --- MENTÉS ÉS BETÖLTÉS FÜGGVÉNYEK ---

// --- MENTÉS FRISSÍTÉSE ---

function saveProgress() {
    const saveData = {
        currency: starCurrency,
        progress: userProgress,
        hearts: hearts,
        lastHeartTime: lastHeartTime,
        heartLimitExpiry: heartLimitExpiry,
        boosters: boosters // <--- ÚJ: Elmentjük a bónuszokat
    };
    localStorage.setItem('match3_save_data', JSON.stringify(saveData));
}

// --- BETÖLTÉS FRISSÍTÉSE ---
function loadProgress() {
    const saved = localStorage.getItem('match3_save_data');
    if (saved) {
        const data = JSON.parse(saved);
        starCurrency = data.currency || 0;
        userProgress = data.progress || {};
        hearts = (typeof data.hearts !== 'undefined') ? data.hearts : 5;
        lastHeartTime = data.lastHeartTime || Date.now();
        heartLimitExpiry = data.heartLimitExpiry || 0; 
        
        // <--- ÚJ: Bónuszok betöltése (ha még nem volt, akkor mind 0)
        boosters = data.boosters || { hammer: 0, rowClear: 0, colClear: 0, freeSwap: 0, shuffle: 0 };
        
        checkHeartRegen(); 
    } else {
        starCurrency = 0;
        userProgress = { 1: { stars: 0, highScore: 0, unlocked: true } };
        hearts = 5;
        lastHeartTime = Date.now();
        heartLimitExpiry = 0;
        boosters = { hammer: 0, rowClear: 0, colClear: 0, freeSwap: 0, shuffle: 0 }; // <--- ÚJ
    }
}

// --- A TELEFON FÉLRETEVÉSE UTÁN UGYANODA VISSZATÉRÉS
// Egy új változó, ami megjegyzi, hogy a rendszer fagyasztotta-e le a játékot
let autoPaused = false;

document.addEventListener('visibilitychange', () => {
    const gameScreen = document.getElementById('game-screen');
    
    // Csak akkor foglalkozunk vele, ha aktívan a játéktéren vagyunk
    if (!gameScreen || gameScreen.classList.contains('hidden') || isGameWon) return;

    if (document.visibilityState === 'hidden') {
        // Ha kilép a háttérbe, és NINCS eleve szüneteltetve a játék, akkor mi fagyasztjuk le
        if (!isGamePaused) {
            pauseGame();
            autoPaused = true; // Megjegyezzük, hogy mi állítottuk meg
        }
    } else if (document.visibilityState === 'visible') {
        // Ha visszatér, és a rendszer fagyasztotta le korábban, akkor újraindítjuk
        if (autoPaused) {
            resumeGame();
            autoPaused = false; // Kikapcsoljuk a jelzőt
        }
    }
});


// ---- BOLTHOZ KAPCSOLÓDÓ ELEMEK --- //

// --- SHOP INICIALIZÁLÁS (Csak egyszer fusson le!) ---
document.querySelectorAll('.shop-tab').forEach(tab => {
    tab.onclick = () => {
        document.querySelectorAll('.shop-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const target = tab.dataset.tab;
        document.getElementById('shop-tab-lives').classList.add('hidden');
        document.getElementById('shop-tab-boosters').classList.add('hidden');
        document.getElementById(`shop-tab-${target}`).classList.remove('hidden');
    };
});

function openShop() {
    document.getElementById('shop-overlay').classList.remove('hidden');
    updateShopUI(); // Frissítjük az árakat és gombokat
}

function closeShop() {
    document.getElementById('shop-overlay').classList.add('hidden');
}

const btnOpenShop = document.getElementById('btn-open-shop');
    if (btnOpenShop) {
        btnOpenShop.onclick = openShop;
    }

    // Bolt bezárása
    const btnCloseShop = document.getElementById('btn-close-shop');
    if (btnCloseShop) {
        btnCloseShop.onclick = closeShop;
    }

    // Vásárlás gombok
    const btnBuyHeart = document.getElementById('btn-buy-heart');
    if (btnBuyHeart) btnBuyHeart.onclick = () => buyItem('heart');

    const btnBuyRefill = document.getElementById('btn-buy-refill');
    if (btnBuyRefill) btnBuyRefill.onclick = () => buyItem('refill');

    const btnBuyLimit = document.getElementById('btn-buy-limit');
    if (btnBuyLimit) btnBuyLimit.onclick = () => buyItem('limit');

// --- SHOP ÁRAK (CSILLAGBAN) ---
const SHOP_PRICES = {
    ONE_HEART: 5,
    FULL_REFILL: 20,
    LIMIT_BOOST: 50,
    // --- ÚJ: Bónuszok árai ---
    HAMMER: 15,
    ROW_CLEAR: 25,
    COL_CLEAR: 25,
    FREE_SWAP: 20,
    SHUFFLE: 10
};

// Ezt a függvényt használjuk mostantól a sima "5" vagy "MAX_HEARTS" helyett!
function getMaxHearts() {
    // Ha a mostani idő kisebb, mint a lejárat, akkor aktív a bónusz (8), amúgy 5
    return (Date.now() < heartLimitExpiry) ? 8 : 5;
}

// --- PONTSZÁMOK KONFIGURÁCIÓJA ---
const SCORE_VALUES = {
    CANDY_POP: 10,          // Egy sima cukorka kidurranása
    WALL_BREAK: 50,         // Kristályfal összetörése
    GLASS_BREAK: 30,        // Üveg betörése (rétegenként)
    
    // Powerup létrehozásáért járó jutalom
    CREATE_ROCKET: 20,
    CREATE_BOMB: 30,
    CREATE_COLORBOMB: 50,
    COMBO_ROCKETS: 50,
    COMBO_BOMBS: 100,
    COMBO_COLORBOMBS: 200,
    COMBO_ROCKET_BOMB: 100,
    COMBO_COLORBOMB_POWERUP: 100,
    
    // Bónusz fázis értékei
    REMAINING_MOVE_BONUS: 500, // Ennyit ér egy megmaradt lépés a végén
    POWERUP_EXPLOSION: 100    // Egy aktivált powerup extra pontja a bónusz fázisban
};

// --- PÁLYÁK KÖZPONTI BEÁLLÍTÁSAI (1-8. PÁLYA) ---
const levelsConfig = [
    {
        level: 1,
        moves: 15,
        colors: 3, // Könnyű kezdés, csak 3 szín
        backgroundImage: 'kep1.jpg',
	starThresholds: [800, 1500, 3000], // ÚJ SOR: [1 csillag, 2 csillag, 3 csillag] ponthatárai
        glassLayout: [
            "00000000",
            "00111100",
            "01111110",
            "01111110",
            "01111110",
            "01111110",
            "00111100",
            "00000000"
        ],
        walls: [],
        goals: [
            { type: 'glass' } // Csak bemelegítés: törd be a vékony üveget
        ]
    },
    {
        level: 2,
        moves: 20,
        colors: 4,
        backgroundImage: 'kep2.jpg',
	starThresholds: [600, 1500, 3500],
        glassLayout: [
            "00000000",
            "00000000",
            "00000000",
            "00000000",
            "00000000",
            "00000000",
            "00000000",
            "00000000"
        ],
        walls: [27, 28, 35, 36], // 4 kristályfal a pálya közepén
        goals: [
	    { type: 'collect', target: '🩷', amount: 20 }, // 20 db rózsaszín szív
            { type: 'wall' } // Cél: Falak lerombolása
        ]
    },
    {
        level: 3,
        moves: 15,
        colors: 4,
        backgroundImage: 'kep3.jpg',
	starThresholds: [1200, 2500, 4500],
        glassLayout: [
            "11111111",
            "10000001",
            "10000001",
            "10000001",
            "10000001",
            "10000001",
            "10000001",
            "11111111"
        ],
        walls: [],
        goals: [
            { type: 'collect', target: '🩷', amount: 20 }, // 20 db rózsaszín szív
            { type: 'glass' } // És a keretként szolgáló üveg eltüntetése
        ]
    },
    {
        level: 4,
        moves: 30,
        colors: 4,
        backgroundImage: 'kep4.jpg',
	starThresholds: [1500, 3000, 6500],
        glassLayout: [
            "22000022",
            "22000022",
            "00000000",
            "00000000",
            "00000000",
            "00000000",
            "22000022",
            "22000022"
        ],
        walls: [18, 21, 42, 45], // Elszórt falak
        goals: [
            { type: 'collect', target: '🩵', amount: 15 },
            { type: 'collect', target: '💛', amount: 15 },
            { type: 'wall' }
        ]
    },
    {
        level: 5,
        moves: 30,
        colors: 3, // Kevesebb szín, hogy könnyebb legyen a kombó
        backgroundImage: 'kep5.jpg',
	starThresholds: [2500, 5000, 8000],
        glassLayout: [
            "00222200",
            "00222200",
            "22111122",
            "22111122",
            "22111122",
            "22111122",
            "00222200",
            "00222200"
        ],
        walls: [27, 28, 35, 36], // Falak az üveg közepén
        goals: [
            { type: 'glass' },
            { type: 'wall' }
        ]
    },
    {
        level: 6,
        moves: 35,
        colors: 4,
        backgroundImage: 'kep6.jpg',
	starThresholds: [1500, 3500, 6000],
        glassLayout: [
            "00000000",
            "01010101",
            "00000000",
            "10101010",
            "00000000",
            "01010101",
            "00000000",
            "10101010"
        ], // Sakktábla minta
        walls: [],
        goals: [
            { type: 'collect', target: '💚', amount: 30 },
            { type: 'glass' }
        ]
    },
    {
        level: 7,
        moves: 35,
        colors: 4,
        backgroundImage: 'kep7.jpg',
	starThresholds: [3000, 5500, 8500],
        glassLayout: [
            "11111111",
            "12222221",
            "12000021",
            "12000021",
            "12000021",
            "12000021",
            "12222221",
            "11111111"
        ], // Vastag üvegkeret
        walls: [27, 28, 35, 36], // Középre bezárva
        goals: [
            { type: 'glass' },
            { type: 'wall' },
            { type: 'collect', target: '🩷', amount: 25 }
        ]
    },
    {
        level: 8,
        moves: 45, // Boss pálya, sok lépés kell
        colors: 4,
        backgroundImage: 'kep8.jpg',
	starThresholds: [4000, 7500, 12000],
        glassLayout: [
            "00000000",
            "01100110",
            "12211221",
            "12222221",
            "01222210",
            "00122100",
            "00011000",
            "00000000"
        ], // Hatalmas szív forma üvegből
        walls: [27, 28], // A szív közepe falból van
        goals: [
            { type: 'glass' },
            { type: 'wall' },
            { type: 'collect', target: '🩷', amount: 40 }, // Sok rózsaszín szívet kell gyűjteni
            { type: 'collect', target: '🩵', amount: 20 }
        ]
    },
    {
    level: 9,
        moves: 35,
        colors: 4,
        backgroundImage: 'kep9.jpg',
        // Matek: 16 db 1-es üveg (480p) + 16 db 2-es üveg (960p) + 4 fal (200p) + 40 sárga szív (400p). 
        // Bőséges lépésszám, ha marad 6 lépés, az +3000p.
        starThresholds: [2500, 5000, 8500],
        glassLayout: [
            "11000011",
            "11000011",
            "00222200",
            "00222200",
            "00222200",
            "00222200",
            "11000011",
            "11000011"
        ],
        // Falak a belső 4x4-es négyzet sarkainál, amik megtörik a sorokat
        walls: [18, 21, 42, 45], 
        goals: [
            { type: 'glass' },
            { type: 'wall' },
            { type: 'collect', target: '💛', amount: 40 }
        ]
    },
    {
        level: 10,
        moves: 40,
        colors: 4,
        backgroundImage: 'kep10.jpg',
        // Matek: Hatalmas gyémánt forma dupla üvegből (~2000p) + 4 fal a közepén (200p) + 75 célcukor (750p).
        // Magas alappontszám, a 3 csillaghoz komoly robbantások és kb. 8-10 maradék lépés kell.
        starThresholds: [3500, 6500, 11000],
        glassLayout: [
            "00011000",
            "00122100",
            "01222210",
            "12200221",
            "12200221",
            "01222210",
            "00122100",
            "00011000"
        ],
        // Egy tömör kristálymag pontosan a pálya közepén
        walls: [27, 28, 35, 36], 
        goals: [
            { type: 'glass' },
            { type: 'wall' },
            { type: 'collect', target: '🩷', amount: 50 },
            { type: 'collect', target: '💚', amount: 25 }
        ]
     }

];