// Mentés: Minden sikeres lépés vagy pukkanás végén hívd meg
function saveCurrentMatchState() {
    const gridState = squares.map(sq => ({
        html: sq.innerHTML,
        className: sq.className // Egyszerűsítve: a teljes classList stringként
    }));

    const gameStateToSave = {
        level: currentLevel,
        moves: movesLeft,
        score: score,
        goals: JSON.parse(JSON.stringify(collectedItems)), 
        grid: gridState,
        layerHealth: [...layerHealth], // ÚJ: Elmentjük az üvegek állapotát!
        timestamp: Date.now()
    };

    localStorage.setItem('activeMatchState', JSON.stringify(gameStateToSave));
}

// Betöltés: Ez állítja vissza a változókat és a pályát
function resumeSavedGame(state) {
    // Alapadatok visszaállítása
    movesLeft = state.moves;
    score = state.score;
    collectedItems = state.goals;
    layerHealth = state.layerHealth || []; 
    
    // UI frissítése
    if (movesDisplay) movesDisplay.innerHTML = movesLeft;
    if (scoreDisplay) scoreDisplay.innerHTML = score;
    
    // A pálya cukorkáinak és falainak visszaállítása
    state.grid.forEach((data, i) => {
        if (squares[i]) {
            squares[i].innerHTML = data.html;
            squares[i].className = data.className; 
        }
    });

    // Üvegek vizuális állapotának helyreállítása
    glassSquares.forEach((glassTile, i) => {
        if (glassTile) {
            glassTile.classList.remove('glass-2', 'glass-1');
            if (layerHealth[i] === 1) glassTile.classList.add('glass-1');
            else if (layerHealth[i] === 2) glassTile.classList.add('glass-2');
        }
    });

    updateGoalUI();
    return true;
}


// --- JÁTÉK INDÍTÁSA (INITIALIZATION) ---

document.addEventListener('DOMContentLoaded', () => {
    console.log("Játék indítása...");

    // 1. Állapot beállítása: Csak a Brand réteg látszik
    document.getElementById('loader-tips-content').classList.add('hidden');
    document.getElementById('loader-splash-content').classList.add('hidden');
    document.getElementById('loader-brand-content').classList.remove('hidden');

    // 2. Töltőképernyő megjelenítése
    showScreen(loadingScreen);
    
    const loadingTime = 3000; // Picit hosszabb első indítás (3 mp)
    const bar = document.getElementById('brand-loading-bar-fill'); 
    bar.style.transition = 'none';
    bar.style.width = '0%';
    
    // Elindítjuk a csíkot
    setTimeout(() => {
        bar.style.transition = `width ${loadingTime}ms ease-in-out`;
        bar.style.width = '100%';
    }, 50);

    // 3. Adatok a háttérben
    loadProgress(); 
    if (typeof updateBoosterBarUI === 'function') updateBoosterBarUI();

    // 4. Képernyőváltás a betöltés végén
    setTimeout(() => {
        const saved = localStorage.getItem('activeMatchState');
        
        if (saved) {
            console.log("Mentett játék folytatása...");
            startLevel(); 
        } else {
            console.log("Ugrás a főmenübe...");
            showScreen(startScreen);
        }

        // 5. Takarítás: Visszaállítjuk a betöltőt "Tipp" üzemmódba a későbbi váltásokhoz
        setTimeout(() => {
            document.getElementById('loader-brand-content').classList.add('hidden');
            document.getElementById('loader-tips-content').classList.remove('hidden');
            // Újrasorsoljuk a tippet, hogy a következő töltésnél friss legyen
            const randomTip = loadingTips[Math.floor(Math.random() * loadingTips.length)];
            document.getElementById('loading-tip-icon').innerHTML = randomTip.icon;
            document.getElementById('loading-tip-title').innerHTML = randomTip.title;
            document.getElementById('loading-tip-text').innerHTML = randomTip.text;
        }, 500); // Fél másodperccel a képernyőváltás után, a háttérben

    }, loadingTime); 
});