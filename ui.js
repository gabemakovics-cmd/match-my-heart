// --- GLOBÁLIS SEGÉDVÁLTOZÓK ---
let selectedLevelToPlay = null; 
let scrollTimeout;


function checkHeartRegen() {
    let currentMax = getMaxHearts(); // <--- 5 vagy 8

    if (hearts >= currentMax) return;

    let now = Date.now();
    let diff = now - lastHeartTime;
    let heartsToAdd = Math.floor(diff / HEART_REGEN_TIME);

    if (heartsToAdd > 0) {
        // Itt is a dinamikus maximumot nézzük
        hearts = Math.min(currentMax, hearts + heartsToAdd);
        lastHeartTime += heartsToAdd * HEART_REGEN_TIME; 
        
        saveProgress();
        
        // Frissítjük a UI-t, ha épp látható
        updateMainMenuUI();
    }
}

// UI frissítése (Szürke Play gomb)
function updateMainMenuUI() {
    const currencyEl = document.getElementById('menu-star-currency');
    if (currencyEl) currencyEl.innerHTML = starCurrency;

    const heartsEl = document.getElementById('menu-hearts-count');
    const timerEl = document.getElementById('menu-hearts-timer');
    
    if (heartsEl) heartsEl.innerHTML = hearts;

    if (hearts < getMaxHearts()) {
        timerEl.classList.remove('hidden');
        let now = Date.now();
        let timePassed = now - lastHeartTime;
        let timeLeft = HEART_REGEN_TIME - timePassed;
        
        let minutes = Math.floor(timeLeft / 60000);
        let seconds = Math.floor((timeLeft % 60000) / 1000);
        timerEl.innerHTML = `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    } else {
        timerEl.classList.add('hidden');
    }
    
    // Play gomb intelligens állapota
    const playBtn = document.getElementById('btn-play');
    if (playBtn) {
        if (hearts === 0) {
            playBtn.classList.add('disabled-btn');
            // Nem írjuk át a szöveget "Várj!"-ra, marad a "PLAY", csak szürke
            playBtn.disabled = true;
        } else {
            playBtn.classList.remove('disabled-btn');
            playBtn.disabled = false;
        }
    }
}

// Ezt az időzítőt indítsd el a játék elején (DOMContentLoaded):
setInterval(() => {
    checkHeartRegen();
    // Csak akkor frissítjük a UI-t, ha épp a főmenüben vagyunk!
    if (!document.getElementById('main-menu').classList.contains('hidden')) {
        updateMainMenuUI();
    }
}, 1000);


// Navigáció a Kezdőképernyőről a Pályaválasztóba
if (btnEnterGame) {
    btnEnterGame.addEventListener('click', () => {
        // ÚJ LOGIKA
        transitionToMainMenu(); 
    });
}


// --- 1. A JÁTÉK INDÍTÁSA GOMB ---
if (btnPlay) {
    btnPlay.onclick = () => {
        if (hearts > 0) {
            // ÚJ: Átvezető animáció indítása a startLevel helyett
            triggerPreLevelSplash(selectedLevelToPlay);
        } else {
            alert("Nincs elég szíved! Várj vagy vegyél a boltban.");
        }
    };
}

// --- 2. GÖRDÍTÉS ÉS KIVÁLASZTÁS LOGIKA ---
if (levelButtonsContainer) {
    levelButtonsContainer.onscroll = () => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(detectCenteredLevel, 100);
    };
}

function detectCenteredLevel() {
    const containerRect = levelButtonsContainer.getBoundingClientRect();
    const containerCenter = containerRect.left + containerRect.width / 2;
    
    let closestBtn = null;
    let minDistance = Infinity;
    let closestLevelNum = 1;

    const buttons = levelButtonsContainer.querySelectorAll('.level-btn');
    
    buttons.forEach((btn, index) => {
        const rect = btn.getBoundingClientRect();
        const btnCenter = rect.left + rect.width / 2;
        const distance = Math.abs(containerCenter - btnCenter);

        if (distance < minDistance) {
            minDistance = distance;
            closestBtn = btn;
            closestLevelNum = index + 1;
        }
    });

    if (closestBtn) {
        let maxOpen = Math.min(unlockedLevel, levelsConfig.length);
        
        // Ha zártra görgetne, visszarántjuk az utolsó nyitottra
        if (closestLevelNum > maxOpen) {
            const targetBtn = buttons[maxOpen - 1];
            targetBtn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        } else {
            // Ha érvényes pályán állt meg, frissítjük a célokat
            selectLevel(closestLevelNum, closestBtn);
        }
    }
}

// --- 3. MENÜ GENERÁLÁSA ---
function updateMenu() {
    levelButtonsContainer.innerHTML = ''; 
    let maxOpen = Math.min(unlockedLevel, levelsConfig.length);

    // Ha van mentés, abból olvassuk ki, meddig jutottunk (felülírja az unlockLevel-t)
    // Megkeressük a legmagasabb feloldott szintet a mentésben
    let savedMax = 0;
    for (let lvl in userProgress) {
        if (userProgress[lvl].unlocked) savedMax = Math.max(savedMax, parseInt(lvl));
    }
    if (savedMax > maxOpen) maxOpen = savedMax;

    levelsConfig.forEach((config, index) => {
        let levelNum = index + 1;
        let btn = document.createElement('button');
        btn.className = 'level-btn';
        
        // Adatok lekérése a mentésből
        let levelData = userProgress[levelNum] || { stars: 0, highScore: 0, unlocked: false };
        let stars = levelData.stars;

        // Gomb tartalma: Szám + Csillagok konténer
        // A számot egy külön span-be tesszük, hogy formázható legyen
        btn.innerHTML = `<span class="level-number">${levelNum}</span>`;
        
        // Csillagok kirajzolása a gomb belsejébe (alulra)
        let starContainer = document.createElement('div');
        starContainer.className = 'btn-stars';
        for (let i = 0; i < 3; i++) {
            let s = document.createElement('span');
            s.innerHTML = '★';
            if (i < stars) s.classList.add('star-filled');
            starContainer.appendChild(s);
        }
        btn.appendChild(starContainer);

        // Állapotok beállítása
        if (levelNum < maxOpen || (levelNum === maxOpen && levelData.unlocked)) {
            // Már megcsinált vagy nyitott pálya
            if (stars === 3) {
                btn.classList.add('level-gold'); // Aranykeret
            } else {
                btn.classList.add('level-completed');
            }
        } else if (levelNum === maxOpen) {
            // Éppen következő (még 0 csillagos)
            btn.classList.add('level-current');
        } else {
            // Zárt
            btn.classList.add('level-locked');
            // Zártnál lakat a szám helyett? (Opcionális)
            // btn.querySelector('.level-number').innerHTML = '🔒';
        }
        
        btn.onclick = () => {
            if (levelNum > maxOpen) return; // Zártra nem kattintunk
            btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            // Fontos: a kattintás csak görget, a detectCenteredLevel hívja majd meg a selectLevel-t!
        };

        levelButtonsContainer.appendChild(btn);
    });

    // Induláskor vagy frissítéskor a megfelelő gombra ugrunk
    setTimeout(() => {
        const btns = levelButtonsContainer.querySelectorAll('.level-btn');
        
        // JAVÍTÁS: Ha a selectedLevelToPlay érvényes, oda ugorjunk, különben a maxOpen-re!
        // Fontos: a selectedLevelToPlay nem lehet nagyobb a maxOpen-nél.
        let targetLevel = selectedLevelToPlay || maxOpen;
        if (targetLevel > maxOpen) targetLevel = maxOpen; 

        const startBtn = btns[targetLevel - 1];
        
        if (startBtn) {
            startBtn.scrollIntoView({ behavior: 'auto', inline: 'center', block: 'nearest' });
            selectLevel(targetLevel, startBtn);
        }
    }, 100);
}

// --- 4. CÉLOK MEGJELENÍTÉSE ---
// Célok és Rekord megjelenítése
function selectLevel(levelNum, btnElement) {
    selectedLevelToPlay = levelNum;

    document.querySelectorAll('.level-btn').forEach(b => b.classList.remove('level-selected'));
    btnElement.classList.add('level-selected');

    const goalsContainer = document.getElementById('info-goals');
    const badgeEl = document.getElementById('menu-highscore-badge');
    
    goalsContainer.innerHTML = '';

    // Fixált helyű Rekord kezelése
    let levelData = userProgress[levelNum] || { highScore: 0 };
    if (levelData.highScore > 0) {
        badgeEl.innerHTML = `🏆 ${levelData.highScore}`;
        badgeEl.classList.remove('hidden');
    } else {
        badgeEl.classList.add('hidden'); // Ha nincs rekord, eltűnik, de a helye megmarad!
    }

    let config = levelsConfig[levelNum - 1];
    config.goals.forEach(goal => {
        let goalSpan = document.createElement('div');
        if (goal.type === 'glass') goalSpan.innerHTML = '🧊';
        else if (goal.type === 'wall') goalSpan.innerHTML = '🧱';
        else if (goal.type === 'collect') goalSpan.innerHTML = `${goal.target} x${goal.amount}`;
        goalsContainer.appendChild(goalSpan);
    });

    document.getElementById('level-info-panel').classList.remove('hidden');
}


// --- SHOP FUNKCIÓK ---

function updateShopUI() {
    // 1. Egyenleg frissítése
    const starVal = document.getElementById('shop-stars-value');
    if (starVal) starVal.innerHTML = starCurrency;

    // 2. Szív gombok kezelése (A korábbi kódod marad, de letisztítva)
    updateHeartButtons();

    // 3. Boosterek kezelése (Ciklussal, hogy ne kelljen 5x leírni)
    const boosterTypes = ['hammer', 'rowClear', 'colClear', 'freeSwap', 'shuffle'];
    
    boosterTypes.forEach(type => {
        // Darabszám frissítése
        const countEl = document.getElementById(`count-${type}`);
        if (countEl) countEl.innerHTML = boosters[type];

        // Gomb állapotának frissítése (Vásárolható-e?)
        const btn = document.getElementById(`btn-buy-${type}`);
        if (btn) {
            const priceKey = type.toUpperCase().replace('CLEAR', '_CLEAR').replace('SWAP', '_SWAP');
            const price = SHOP_PRICES[priceKey];

            if (starCurrency >= price) {
                btn.classList.remove('disabled');
                btn.disabled = false;
            } else {
                btn.classList.add('disabled');
                btn.disabled = true;
            }
        }
    });
}

// Segédfüggvény a szív gombokhoz, hogy ne legyen túl hosszú az updateShopUI
function updateHeartButtons() {
    const btnHeart = document.getElementById('btn-buy-heart');
    if (btnHeart) {
        const canBuy = starCurrency >= SHOP_PRICES.ONE_HEART && hearts < getMaxHearts();
        btnHeart.classList.toggle('disabled', !canBuy);
        btnHeart.disabled = !canBuy;
        btnHeart.innerHTML = (hearts >= getMaxHearts()) ? "TELE" : `${SHOP_PRICES.ONE_HEART} ⭐`;
    }

    const btnRefill = document.getElementById('btn-buy-refill');
    if (btnRefill) {
        const canBuy = starCurrency >= SHOP_PRICES.FULL_REFILL && hearts < getMaxHearts();
        btnRefill.classList.toggle('disabled', !canBuy);
        btnRefill.disabled = !canBuy;
    }

    const btnLimit = document.getElementById('btn-buy-limit');
    if (btnLimit) {
        const canBuy = starCurrency >= SHOP_PRICES.LIMIT_BOOST;
        btnLimit.classList.toggle('disabled', !canBuy);
        btnLimit.disabled = !canBuy;
        
        if (getMaxHearts() === 8) {
            let minsLeft = Math.ceil((heartLimitExpiry - Date.now()) / 60000);
            btnLimit.innerHTML = `AKTÍV (${minsLeft}p)`;
        } else {
            btnLimit.innerHTML = `${SHOP_PRICES.LIMIT_BOOST} ⭐`;
        }
    }
}

function buyItem(type) {
    let cost = 0;
    
    // Ár meghatározása a SHOP_PRICES alapján (amit a globals.js-be írtunk)
    switch(type) {
        case 'heart': cost = SHOP_PRICES.ONE_HEART; break;
        case 'refill': cost = SHOP_PRICES.FULL_REFILL; break;
        case 'limit': cost = SHOP_PRICES.LIMIT_BOOST; break;
        case 'hammer': cost = SHOP_PRICES.HAMMER; break;
        case 'rowClear': cost = SHOP_PRICES.ROW_CLEAR; break;
        case 'colClear': cost = SHOP_PRICES.COL_CLEAR; break;
        case 'freeSwap': cost = SHOP_PRICES.FREE_SWAP; break;
        case 'shuffle': cost = SHOP_PRICES.SHUFFLE; break;
    }

    if (starCurrency < cost) return;

    let success = false;

    // Speciális tárgyak (Szívek)
    if (type === 'heart' && hearts < getMaxHearts()) { hearts++; success = true; }
    else if (type === 'refill' && hearts < getMaxHearts()) { hearts = getMaxHearts(); success = true; }
    else if (type === 'limit') {
        heartLimitExpiry = Date.now() + (60 * 60 * 1000);
        hearts = 8;
        success = true;
    }
    // Boosterek ( Inventory növelése )
    else if (boosters.hasOwnProperty(type)) {
        boosters[type]++;
        success = true;
    }
    
        // --- ÚJ: Frissítjük a bónuszokat a pályán, hogy ne 0-t mutassanak ---
    if (typeof updateBoosterBarUI === 'function') {
        updateBoosterBarUI();
    }

    if (success) {
        starCurrency -= cost;
        saveProgress();
        updateShopUI();
        updateMainMenuUI();
        console.log(`Sikeres vásárlás: ${type}. Jelenleg: ${boosters[type] || hearts}`);
    }
}


// --- KÉPERNYŐVÁLTÓ FUNKCIÓ ---
function showScreen(screenElement) {
    // Levesszük a fade-out-ot mindenről, ha esetleg rajta maradt
    [loadingScreen, startScreen, mainMenu, gameScreen, galleryScreen, shopOverlay, winScreen, confirmScreen, gameOverScreen, successOverlay, skipOverlay].forEach(s => {
        if (s) {
            s.classList.add('hidden');
            s.classList.remove('fade-out'); 
        }
    });
    
    if (screenElement) {
        screenElement.classList.remove('hidden', 'fade-out');
    }
}


// --- ÚJ: UNIVERZÁLIS ÁTVEZETŐ A PÁLYAVÁLASZTÓBA ---
function transitionToMainMenu() {
    // 1. Random tipp kiválasztása
    const randomTip = loadingTips[Math.floor(Math.random() * loadingTips.length)];
    document.getElementById('loading-tip-icon').innerHTML = randomTip.icon;
    document.getElementById('loading-tip-title').innerHTML = randomTip.title;
    document.getElementById('loading-tip-text').innerHTML = randomTip.text;

    // 2. Beállítjuk a Loading Screent normál (tippes) módra
    document.getElementById('loader-splash-content').classList.add('hidden');
    document.getElementById('loader-tips-content').classList.remove('hidden');
    
    // 3. Megmutatjuk a töltőképernyőt
    showScreen(loadingScreen);
    
    // 4. Elindítjuk a töltőcsíkot (Gyorsabb, mint indításkor, 800ms)
    const transitionTime = 800; 
    const bar = document.getElementById('loading-bar-fill');
    bar.style.transition = 'none';
    bar.style.width = '0%';
    
    setTimeout(() => {
        bar.style.transition = `width ${transitionTime}ms linear`;
        bar.style.width = '100%';
    }, 50);

    // 5. A töltés végén átváltunk a menüre
    setTimeout(() => {
        showScreen(mainMenu); // Először láthatóvá tesszük a menüt...
        
        // ...majd ha már látható, felépítjük és legörgetünk a jó helyre!
        if (typeof updateMenu === 'function') updateMenu();
        
    }, transitionTime);
}


// --- ESEMÉNYKEZELŐK ---

btnGallery.addEventListener('click', () => {
    loadGallery();
    showScreen(galleryScreen);
});

btnBackGallery.addEventListener('click', () => {
    showScreen(mainMenu);
});

// --- KILÉPÉS MEGERŐSÍTÉSE (Okosított) ---

if (btnBackMenu) {
    btnBackMenu.addEventListener('click', () => {
        pauseGame(); 

        let config = levelsConfig[currentLevel - 1];
        let maxMoves = config ? config.moves : 0;
        
        let hasActionTaken = (movesLeft < maxMoves) || hasUsedBooster;

        if (hasActionTaken && !isGameWon) {
            const penaltyText = document.querySelector('.heart-penalty-text');
            if (penaltyText) penaltyText.style.display = 'flex';
            
            if (confirmScreen) confirmScreen.classList.remove('hidden'); 
        } else {
            // Azonnali kilépés, mert semmi nem történt
            resumeGame();
	    localStorage.removeItem('activeMatchState');
            if (typeof gameLoop !== 'undefined') clearInterval(gameLoop);
            transitionToMainMenu();
            if (typeof updateMenu === 'function') updateMenu(); 
        }
    });
}

// Igen gomb (Kilépés + Szívvesztés)
if (btnYes) {
    btnYes.onclick = () => {
        resumeGame(); 
        if (confirmScreen) confirmScreen.classList.add('hidden');
        
        // --- BÜNTETÉS (Szív levonása) ---
        if (hearts > 0 && !isGameWon) {
            hearts--;
            if (hearts === getMaxHearts() - 1) {
                lastHeartTime = Date.now();
            }
            saveProgress(); 
        }
        
	localStorage.removeItem('activeMatchState');

        if (typeof gameLoop !== 'undefined') clearInterval(gameLoop);
        // ÚJ LOGIKA
        transitionToMainMenu(); 
    };
}

// Nem gomb (Folytatás)
if (btnNo) {
    btnNo.onclick = () => {
        if (confirmScreen) confirmScreen.classList.add('hidden');
        resumeGame(); // <--- JÁTÉK FOLYTATÁSA
    };
}

// --- GAME OVER GOMBOK ---

// Újrapróbálom gomb
if (btnGameOverRestart) {
    btnGameOverRestart.addEventListener('click', () => {
        // Ha lenne szívünk, ellenőrizzük (bár a gameOver Screenen ez opcionális)
        if (hearts > 0) {
            gameOverScreen.classList.add('hidden');
            
            // Játék alaphelyzetbe állítása (vizuálisan is, bár a gridet újraépíti a startLevel)
            score = 0;
            if (typeof scoreDisplay !== 'undefined') scoreDisplay.innerHTML = score;

            localStorage.removeItem('activeMatchState');
            
            // --- ÚJ: Elegáns Splash indítás a régi "nyers" startLevel helyett ---
            triggerPreLevelSplash(currentLevel);
        } else {
            alert("Nincs elég szíved az újrakezdéshez!");
            // Visszadobjuk a menübe, ha nincs szíve
            gameOverScreen.classList.add('hidden');
            transitionToMainMenu();
        }
    });
}

// Vissza a menübe gomb
if (btnGameOverMenu) {
    btnGameOverMenu.addEventListener('click', () => {
        gameOverScreen.classList.add('hidden');
        if (typeof gameLoop !== 'undefined') clearInterval(gameLoop);
        
	localStorage.removeItem('activeMatchState');

        // ÚJ LOGIKA
        transitionToMainMenu(); 
    });
}

// Újrajátszás gomb a győzelmi képernyőn
const btnRestartFromWin = document.getElementById('btn-restart-from-win');
if (btnRestartFromWin) {
    btnRestartFromWin.onclick = () => {
        if (hearts > 0) {
            if (typeof gameLoop !== 'undefined') clearInterval(gameLoop);
            winScreen.classList.add('hidden');
            
            // --- ÚJ: Itt is Splash-en keresztül indítjuk újra az adott pályát ---
            triggerPreLevelSplash(currentLevel);
        } else {
            alert("Nincs elég szíved az újrakezdéshez!");
            winScreen.classList.add('hidden');
            transitionToMainMenu();
        }
    };
}

// --- ÚJ: PRE-LEVEL SPLASH LOGIKA ---
function triggerPreLevelSplash(levelNum) {
    const config = levelsConfig[levelNum - 1];
    if (!config) return;

    // 1. Megmutatjuk a Loading Screent
    showScreen(loadingScreen);
    
    // Átkapcsolunk a "Splash" nézetre (elrejtjük a tippeket)
    document.getElementById('loader-tips-content').classList.add('hidden');
    document.getElementById('loader-splash-content').classList.remove('hidden');

    // 2. Szövegek és adatok beállítása
    document.getElementById('splash-level-number').innerHTML = `${levelNum}. Szint`;
    document.getElementById('splash-moves-count').innerHTML = config.moves;

    // 3. Célok kártyáinak generálása
    const goalsContainer = document.getElementById('splash-goals');
    goalsContainer.innerHTML = '';
    
    // Kiszámoljuk az üvegeket és falakat (hasonlóan az updateGoalUI-hoz)
    let totalWalls = config.walls ? config.walls.length : 0;
    let totalGlass = 0;
    if (config.glassLayout) {
        config.glassLayout.forEach(row => { for(let char of row) totalGlass += parseInt(char); });
    }

    config.goals.forEach((goal, index) => {
        let emoji = '', amount = 0;
        if (goal.type === 'glass') { emoji = '🧊'; amount = totalGlass; }
        else if (goal.type === 'wall') { emoji = '🧱'; amount = totalWalls; }
        else if (goal.type === 'collect') { emoji = goal.target; amount = goal.amount; }

        if (amount > 0) {
            let delay = index * 0.15; // Lépcsőzetes beúszás
            goalsContainer.innerHTML += `
                <div class="splash-goal-item" style="animation-delay: ${delay}s">
                    <span class="splash-goal-emoji">${emoji}</span>
                    <span class="splash-goal-amount">x${amount}</span>
                </div>
            `;
        }
    });

    // 4. A háttérben Csendben felépítjük a pályát (A startLevel most nem fogja mutatni a gameScreen-t!)
    startLevel(levelNum, true); 

    // 5. Várunk, majd elhalványítjuk a töltőképernyőt, és megmutatjuk a pályát
    setTimeout(() => {
        loadingScreen.classList.add('fade-out');
        
        setTimeout(() => {
            showScreen(gameScreen); // Átváltunk a kész pályára
            
            // Visszaállítjuk a Loading Screen-t az eredeti állapotába a következő alkalomra
            document.getElementById('loader-tips-content').classList.remove('hidden');
            document.getElementById('loader-splash-content').classList.add('hidden');
            loadingScreen.classList.remove('fade-out');
            
        }, 400); // 400ms a fade-out hossza a CSS-ben
    }, 2500); // 2.5 másodpercig nézheti a játékos a feladatot
}


// Pálya indítása
function startLevel(level, isQuiet = false) {
    const saved = localStorage.getItem('activeMatchState');
    let state = null;
    let isResuming = false;
    
    if (saved) {
        state = JSON.parse(saved);
        // Ha nem adtál meg szintet (pl. frissítés), vagy ugyanazt a szintet választottad
        if (level === undefined || state.level === level) {
            currentLevel = state.level;
            isResuming = true;
        } else {
            // Ha a menüben egy MÁSIK szintre kattintottál, töröljük a régit
            localStorage.removeItem('activeMatchState');
            currentLevel = level;
        }
    } else {
        currentLevel = level;
    }

    hasUsedBooster = false;

    // 1. Tábla alapjainak legenerálása (ez rakja le az üveget és a falakat is az 1. szint szerint)
    grid.innerHTML = '';
    squares.length = 0;
    createBoard(); 

    // 2. Megpróbáljuk felülírni az alap pályát a mentéssel
    let resumed = false;
    if (isResuming && state) {
        resumed = resumeSavedGame(state); 
    }

    // 3. Ha NINCS MENTÉS, csak akkor nullázzuk a pontokat és a UI-t
    if (!resumed) {
        score = 0;
        collectedItems = {};
        if (scoreDisplay) scoreDisplay.innerHTML = score;
        
        document.getElementById('score-fill').style.width = '0%';
        document.getElementById('score-text').innerHTML = '0';
        document.querySelectorAll('.star-marker').forEach(s => s.classList.remove('active'));
    }

    // 4. Felső sáv és csillag-határok beállítása (ez mindenképp kell)
    const topBar = document.getElementById('game-top-bar');
    if (topBar) topBar.classList.remove('hidden');

    let config = levelsConfig[currentLevel - 1];
    if (config && config.starThresholds) {
        const maxScore = config.starThresholds[2] * 1.1; 
        
        document.getElementById('star-marker-1').style.left = (config.starThresholds[0] / maxScore * 100) + '%';
        document.getElementById('star-marker-2').style.left = (config.starThresholds[1] / maxScore * 100) + '%';
        document.getElementById('star-marker-3').style.left = (config.starThresholds[2] / maxScore * 100) + '%';
        
        document.getElementById('score-fill').classList.remove('bonus-rainbow');
        document.querySelector('.score-progress-bg').classList.remove('bonus-glow');
    }

    if (typeof updateBoosterBarUI === 'function') {
        updateBoosterBarUI();
    }
    
    if (!isQuiet) {
        showScreen(gameScreen);
    }
    
    startGame(isResuming);
}

function updateGoalUI() {
    const container = document.getElementById('goal-container');
    if (!container) return;
    container.innerHTML = ''; 
    
// --- ÚJ RÉSZ: Pontszám sáv frissítése ---
    let config = levelsConfig[currentLevel - 1];
    if (config && config.starThresholds) {
        const maxScore = config.starThresholds[2] * 1.1; 
        let percent = Math.min(100, (score / maxScore) * 100);
        
        const scoreFill = document.getElementById('score-fill');
        const scoreText = document.getElementById('score-text');
        
        if (scoreFill) scoreFill.style.width = percent + '%';
        if (scoreText) scoreText.innerHTML = score;

        // Csillagok aktiválása
        if (score >= config.starThresholds[0]) document.getElementById('star-marker-1').classList.add('active');
        if (score >= config.starThresholds[1]) document.getElementById('star-marker-2').classList.add('active');
        if (score >= config.starThresholds[2]) document.getElementById('star-marker-3').classList.add('active');
    }
    
    let totalWalls = config.walls ? config.walls.length : 0;
    let totalGlass = 0;
    if (config.glassLayout) {
        config.glassLayout.forEach(row => {
            for(let char of row) totalGlass += parseInt(char);
        });
    }

    config.goals.forEach(goal => {
        let emoji = '';
        let current = 0;
        let max = 1;

        if (goal.type === 'glass') {
            emoji = '🧊';
            max = totalGlass;
            let remaining = layerHealth.reduce((a, b) => a + b, 0);
            current = max - remaining;
        } else if (goal.type === 'wall') {
            emoji = '🧱';
            max = totalWalls;
            let remaining = squares.filter(sq => sq.classList.contains('wall')).length;
            current = max - remaining;
        } else if (goal.type === 'collect') {
            emoji = goal.target;
            max = goal.amount;
            current = collectedItems[goal.target] || 0;
        }

        let isDone = current >= max;
        let percent = Math.min(100, (current / max) * 100);
        if (isNaN(percent) || max === 0) percent = 100;

        const barWrapper = document.createElement('div');
        // Ha kész, hozzáadunk egy extra osztályt a színezéshez
        barWrapper.className = `goal-bar-wrapper ${isDone ? 'goal-completed' : ''}`;
        
        barWrapper.innerHTML = `
            <div class="goal-emoji">${emoji}</div>
            <div class="goal-progress-bg">
                <div class="goal-progress-fill" style="width: ${percent}%"></div>
                <div class="goal-progress-text">
                    ${isDone ? '✔' : `${Math.min(current, max)} / ${max}`}
                </div>
            </div>
        `;
        container.appendChild(barWrapper);
    });
}


// Vissza a menübe gomb a győzelmi képernyőn
if (btnBackFromWin) {
    btnBackFromWin.onclick = () => {
        if (typeof gameLoop !== 'undefined') clearInterval(gameLoop);
        
        // --- ÚJ: Ha nyertél, a menü a KÖVETKEZŐ pályára fog ugrani ---
        if (typeof levelsConfig !== 'undefined') {
            selectedLevelToPlay = Math.min(currentLevel + 1, levelsConfig.length);
        }
        
        transitionToMainMenu(); 
    };
}


function loadGallery() {
    const galleryContainer = document.getElementById('gallery-container');
    if (!galleryContainer) return;
    
    galleryContainer.innerHTML = ''; 

    // Megnézzük, hány pályát teljesítettél már
    let completedLevels = Math.min(unlockedLevel - 1, levelsConfig.length);

    if (completedLevels <= 0) {
        galleryContainer.innerHTML = '<p style="color: #666; font-size: 1.2rem; text-align:center; width:100%;">Még nincsenek emlékeid.<br>Teljesítsd az első pályát!</p>';
        return;
    }

    for (let i = 0; i < completedLevels; i++) {
        let levelNum = i + 1;
        let img = document.createElement('img');
        img.src = levelsConfig[i].backgroundImage;
        img.className = 'gallery-item';
        
        // --- ARANYKERET ELLENŐRZÉS ---
        if (userProgress[levelNum] && userProgress[levelNum].stars === 3) {
            img.classList.add('gallery-gold-frame');
        }

        // --- NAGYÍTÁS (Lightbox) AKTIVÁLÁSA ---
        img.addEventListener('click', () => {
            const lightboxImg = document.getElementById('lightbox-img');
            const lightbox = document.getElementById('lightbox');
            
            if (lightboxImg && lightbox) {
                lightboxImg.src = img.src;
                lightbox.classList.remove('hidden');
            }
        });
        
        galleryContainer.appendChild(img);
    }
}

// --- LIGHTBOX BEZÁRÁSA ---
document.getElementById('lightbox-close').addEventListener('click', () => {
    document.getElementById('lightbox').classList.add('hidden');
});

// Ha a sötét háttérre kattintasz, akkor is záródjon be
document.getElementById('lightbox').addEventListener('click', (e) => {
    if (e.target.id === 'lightbox') {
        document.getElementById('lightbox').classList.add('hidden');
    }
});

updateMenu();