function setGameTimeout(callback, delay) {
    const timer = setTimeout(() => {
        // TRÜKK: Ha szünet van, nem futtatjuk le, hanem visszadobjuk a sor végére
        if (isGamePaused) {
            // Újrapróbálkozunk 100ms múlva
            setGameTimeout(callback, 100); 
            return;
        }

        callback();
        activeTimeouts = activeTimeouts.filter(t => t !== timer);
    }, delay);
    
    activeTimeouts.push(timer);
    return timer;
}

function pauseGame() {
    isGamePaused = true;
    const grid = document.querySelector('.grid'); 
    if (grid) grid.classList.add('game-paused');
    
    // --- ÚJ: Az effektek rétegét is megfagyasztjuk ---
    const effects = document.getElementById('effects-layer');
    if (effects) effects.classList.add('game-paused');
}

function resumeGame() {
    isGamePaused = false;
    const grid = document.querySelector('.grid');
    if (grid) grid.classList.remove('game-paused');
    
    // --- ÚJ: Az effektek rétegét is elindítjuk ---
    const effects = document.getElementById('effects-layer');
    if (effects) effects.classList.remove('game-paused');
}


// A mindent törlő gomb
function clearAllEffects() {
    // 1. Megállítunk minden futó időzítőt
    activeTimeouts.forEach(t => clearTimeout(t));
    activeTimeouts = [];
    
    // 2. Kiürítjük a vizuális réteget
    if (effectsLayer) effectsLayer.innerHTML = '';
    
    // 3. Eltüntetjük a villámokat (biztonsági tartalék)
    document.querySelectorAll('.lightning-beam, .shockwave, .giant-bomb-ghost, .single-bomb-ghost').forEach(el => el.remove());
}

function startGame(isResuming = false) { // Kap egy paramétert
    isGameWon = false;
    isPausedForWin = false;
    bonusPhaseActive = false;

    gameState = 'IDLE';
    activeProcesses = 0;

    // CSAK AKKOR nullázunk, ha nem mentésből jövünk!
    if (!isResuming) {
        collectedItems = {}; 
        updateGoalUI();
    }
    
    // 2. Színek számának visszaállítása az alapértelmezettre
    let config = levelsConfig[currentLevel - 1];
    if (config) {
        currentActiveColors = config.colors; 
    }

    if (typeof clearDragVars === 'function') clearDragVars();

    // Visszahozzuk a bal felső menügombot, amit a győzelemkor elrejtettünk
    const btnBackMenu = document.getElementById('btn-back-menu');
    if (btnBackMenu) btnBackMenu.classList.remove('invisible-btn');
    
    // Eltüntetjük a győzelmi animáció esetleges maradékait
    if (successText) successText.classList.remove('show-anim');
    if (successOverlay) successOverlay.classList.add('hidden');
    if (skipOverlay) skipOverlay.classList.add('hidden');

    gameLoop = window.setInterval(function() {
	// Ha szünet van, azonnal kilépünk, a motor nem dolgozik
        if (isGamePaused) return;
	
        // CSAK AKKOR csinálunk bármit, ha a játékos éppen nem húz semmit
        if (draggedSquare) return;

        // Ha a játék nyugalmi állapotban van (IDLE), megnézzük, kell-e esnie valaminek
        if (gameState === 'IDLE') {

	    if (needsSaving) {
                saveCurrentMatchState();
                needsSaving = false; // Visszakapcsoljuk a jelzőt
            }

            if (moveDown()) {
                // Ha a moveDown true-val tér vissza, elindult a mozgás, 
                // a gameState BUSY-ra váltott a moveDown-on belül.
                return; 
            }
            
            // Ha nem indult mozgás, nézzük meg, vannak-e új párok
            checkMatches();
            
            // Ha még mindig IDLE (nem találtunk párt sem), jöhet a többi ellenőrzés
            if (gameState === 'IDLE') {
                checkGameOver();
                
                if (movesLeft > 0 && !hasPossibleMove() && !isGameWon) {
                    gameState = 'LOCKED'; // Teljes zár a keverés alatt
                    
                    let toast = document.createElement('div');
                    toast.innerHTML = "Nincs több lépés! Átrendezés...";
                    toast.className = "shuffle-toast";
                    document.body.appendChild(toast);
                    
                    setGameTimeout(() => {
                        shuffleBoard();
                        toast.remove();
                        gameState = 'IDLE';
                    }, 1500);
                }
            }
        }
    }, 100);
}



let glassSquares = []; // Ebben tároljuk majd a fix üveglapokat

function createBoard() {
    grid.innerHTML = '';
    squares.length = 0;
    glassSquares = []; // Nullázzuk az üveglistát
    layerHealth = [];   

    // 1. Betöltjük az aktuális pálya adatait
    let config = levelsConfig[currentLevel - 1];
    currentActiveColors = config.colors;

    // CSAK AKKOR állítjuk be a config szerinti lépéseket, ha NINCS mentés a pályán
    if (!localStorage.getItem('activeMatchState')) {
        movesLeft = config.moves;
    }
    
    if (movesDisplay) movesDisplay.innerHTML = movesLeft;

    // Háttér réteg
    let bgLayer = document.createElement('div');
    bgLayer.id = 'grid-bg-layer';
    bgLayer.style.backgroundImage = `url('${config.backgroundImage}')`;
    grid.appendChild(bgLayer);

    // --- A: ÜVEG RÉTEG LÉTREHOZÁSA (Ez a padló) ---
    // Ez a réteg a cukorkák ALATT lesz, és sosem mozog
    let glassContainer = document.createElement('div');
    glassContainer.id = 'glass-grid-container';
    grid.appendChild(glassContainer);

    // Feltöltjük a 64 db üveglappal a térkép alapján
    for (let i = 0; i < width * width; i++) {
        let glassDiv = document.createElement('div');
        glassDiv.classList.add('glass-tile'); 
        
        let r = Math.floor(i / width);
        let c = i % width;
        
        // Kiolvassuk a térképről az üveg állapotát
        let health = 0;
        if (config.glassLayout && config.glassLayout[r] && config.glassLayout[r][c]) {
             health = parseInt(config.glassLayout[r][c]);
        }
        
        layerHealth.push(health);
        
        if (health === 1) glassDiv.classList.add('glass-1');
        if (health === 2) glassDiv.classList.add('glass-2');
        
        glassContainer.appendChild(glassDiv);
        glassSquares.push(glassDiv); // Eltároljuk, hogy a damageLayer megtalálja
    }

    // --- B: CUKORKA RÉTEG LÉTREHOZÁSA (Ez a tartalom) ---
    // Ez a réteg az üveg FELETT lesz
    let candyContainer = document.createElement('div');
    candyContainer.id = 'candy-grid-container';
    grid.appendChild(candyContainer);

    // Feltöltjük a cukorkákkal (a te eredeti logikáddal)
    for (let i = 0; i < width * width; i++) {
        // A katalógus alapján döntjük el, mi legyen fal
        let isWall = config.walls.includes(i);
        let randomEmoji = '';
        
        if (!isWall) {
            randomEmoji = candyEmojis[Math.floor(Math.random() * config.colors)];
            
            let preventRow = false;
            if (i % width > 1 && squares[i-1] && squares[i-1].innerHTML === randomEmoji && squares[i-2] && squares[i-2].innerHTML === randomEmoji) preventRow = true;
            
            let preventCol = false;
            if (i >= width * 2 && squares[i-width] && squares[i-width].innerHTML === randomEmoji && squares[i-width*2] && squares[i-width*2].innerHTML === randomEmoji) preventCol = true;

            if (preventRow || preventCol) {
                i--;
                continue; 
            }
        }

        const square = document.createElement('div');
        square.setAttribute('id', i);
        square.classList.add('candy-square');
        
        // FONTOS: Itt már NEM adunk hozzá glass osztályokat, mert azokat külön leraktuk az 'A' lépésben!

        // Tartalom beállítása: Fal vagy Emoji
        if (isWall) {
            square.classList.add('wall');
            square.innerHTML = '';
        } else {
            square.innerHTML = randomEmoji;
        }

        square.addEventListener('pointerdown', handlePointerDown);
        square.addEventListener('mouseenter', () => { hoveredSquareId = square.id; });
        
        candyContainer.appendChild(square); // A cukros dobozba tesszük
        squares.push(square);
    }

    updateGoalUI();
}



function updateGlassDisplay() {
    let currentTotalGlass = layerHealth.reduce((a, b) => a + b, 0);
    if (glassDisplay) {
        glassDisplay.innerHTML = currentTotalGlass;
    }
}

//Az üveg sebezése és a kinézet frissítése
function damageLayer(idx) {
    // Ellenőrizzük, hogy van-e ott üveg egyáltalán
    if (layerHealth[idx] > 0) {
        layerHealth[idx]--;
        
        // Fontos: Most már a glassSquares tömbből kérjük le a fix elemet!
        let glassTile = glassSquares[idx]; 
        
        // Frissítjük a kinézetét a hátralévő életerő alapján
        glassTile.classList.remove('glass-2', 'glass-1');

        if (layerHealth[idx] === 1) {
            glassTile.classList.add('glass-1');
        } 
        // Ha 0, nem kap osztályt, így láthatóvá válik a háttérkép
    }
}