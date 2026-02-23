function useBooster(type) {
    if (gameState === 'BUSY' || gameState === 'LOCKED') return;

    if (boosters[type] <= 0) {
        openShop();
        const boosterTab = document.querySelector('[data-tab="boosters"]');
        if (boosterTab) boosterTab.click();
        return;
    }

    if (activeBooster === type) {
        cancelBooster();
        return;
    }

    cancelBooster(); 
    activeBooster = type;
    const boosterBtn = document.getElementById(`b-${type}`);
    if (boosterBtn) boosterBtn.classList.add('active');
    
    if (type === 'freeSwap') {
        const movesBox = document.querySelector('.moves-box');
        if (movesBox) movesBox.classList.add('locked-status');
    } else if (type === 'shuffle') {
        // --- ÚJ: Remegés indítása ---
        squares.forEach(sq => {
            if (!sq.classList.contains('wall') && sq.innerHTML !== '') {
                sq.classList.add('shaking-candy');
            }
        });
        grid.style.cursor = 'crosshair';
    } else {
        grid.style.cursor = 'crosshair';
    }
}

function cancelBooster() {
    activeBooster = null;
    isNextSwapFree = false; // Mindig alaphelyzetbe állítjuk az ingyenességet

    document.querySelectorAll('.booster-item').forEach(item => item.classList.remove('active'));
    grid.style.cursor = 'default';

    const movesBox = document.querySelector('.moves-box');
    if (movesBox) {
        movesBox.classList.remove('locked-status'); // Mindig levesszük a lakatot
    }
    
    squares.forEach(sq => sq.classList.remove('shaking-candy'));
}

// Ezt hívd meg a startLevel-ben és minden vásárlás után!
function updateBoosterBarUI() {
    const boosterTypes = ['hammer', 'rowClear', 'colClear', 'freeSwap', 'shuffle'];
    boosterTypes.forEach(type => {
        const countEl = document.getElementById(`b-count-${type}`);
        const btnEl = document.getElementById(`b-${type}`);
        if (countEl) countEl.innerHTML = boosters[type];
        if (btnEl) btnEl.classList.toggle('empty', boosters[type] <= 0);
    });
}

function executeBoosterEffect(idx) {
    const r = Math.floor(idx / width);
    const c = idx % width;
    let used = false;
    
    const targetSq = squares[idx];
    const cellSize = targetSq.offsetWidth;

    switch (activeBooster) {

case 'hammer':
            // --- KALAPÁCS ÜTÉS ANIMÁCIÓ ---
            const effectsRectHammer = effectsLayer.getBoundingClientRect();
            const targetRectHammer = targetSq.getBoundingClientRect();

            // 1. Létrehozzuk a kalapácsot
            const hammer = document.createElement('div');
            hammer.innerHTML = '🔨';
            hammer.className = 'hammer-swing-effect';
            // A cella közepe fölé pozicionáljuk
            hammer.style.left = (targetRectHammer.left - effectsRectHammer.left + cellSize / 2) + 'px';
            hammer.style.top = (targetRectHammer.top - effectsRectHammer.top + cellSize / 2) + 'px';
            effectsLayer.appendChild(hammer);

            // 2. Időzítjük a becsapódást és a pukkanást (300ms múlva ér le a kalapács)
            setGameTimeout(() => {
                // Kis becsapódás effekt
                const impact = document.createElement('div');
                impact.className = 'small-impact';
                impact.style.left = hammer.style.left;
                impact.style.top = hammer.style.top;
                effectsLayer.appendChild(impact);
                setTimeout(() => impact.remove(), 350);

                // A tényleges pukkasztás (aktiválja a powerupokat is!)
                checkAndPop(idx);
            }, 300);

            // Takarítás az animáció végén
            setGameTimeout(() => { if(hammer.parentNode) hammer.remove(); }, 450);

            used = true;
            // Itt a moveDown késleltetést kicsit nagyobbra vesszük a kalapács miatt
            setGameTimeout(() => {
                 if (!moveDown()) checkMatches();
            }, 600);
            break;

        case 'rowClear':
            // --- SZÉLVIHAR (TORNÁDÓ HELYETT SUHANÓ FELHŐ) ---
const effectsRect = effectsLayer.getBoundingClientRect();
const targetRect = targetSq.getBoundingClientRect();

const cloud = document.createElement('div');
cloud.innerHTML = '🌪️';
cloud.className = 'wind-tornado';

// Kiszámoljuk a pontos helyet az effects-layeren belül
cloud.style.top = (targetRect.top - effectsRect.top) + 'px';
cloud.style.left = '-60px';
cloud.style.height = cellSize + 'px';
cloud.style.fontSize = (cellSize * 0.8) + 'px';
effectsLayer.appendChild(cloud);

            // Animáció indítása: 600ms alatt ér át
            setGameTimeout(() => { cloud.style.left = '100%'; }, 20);
            
            // Pukkanások: 150ms késleltetéssel indulnak, hogy a felhő "eléjük" érjen
            for (let i = 0; i < width; i++) {
                setGameTimeout(() => {
                    checkAndPop(r * width + i);
                }, 150 + (i * 60)); 
            }

            setGameTimeout(() => { if(cloud.parentNode) cloud.remove(); }, 800);
            used = true;
	    
            setGameTimeout(() => {
                 if (!moveDown()) checkMatches();
            }, 800);

            break;

case 'colClear':
            // JAVÍTÁS: Zároljuk a játékot, hogy ne keressen meccseket idő előtt
            gameState = 'BUSY';
            activeProcesses++;

            const effectsRectCol = effectsLayer.getBoundingClientRect();
            const targetRectCol = targetSq.getBoundingClientRect();
            const gridHeight = 8 * cellSize;

            const beam = document.createElement('div');
            beam.className = 'energy-beam-col'; 
            beam.style.left = (targetRectCol.left - effectsRectCol.left) + 'px';
            beam.style.top = (squares[c].getBoundingClientRect().top - effectsRectCol.top) + 'px';
            beam.style.width = cellSize + 'px';
            effectsLayer.appendChild(beam);

            setGameTimeout(() => { beam.style.height = gridHeight + 'px'; }, 20);

            setGameTimeout(() => {
                const impact = document.createElement('div');
                impact.className = 'impact-wave';
                const lastSqRect = squares[56 + c].getBoundingClientRect();
                impact.style.left = (lastSqRect.left - effectsRectCol.left + cellSize / 2) + 'px';
                impact.style.top = (lastSqRect.bottom - effectsRectCol.top) + 'px';
                effectsLayer.appendChild(impact);
                setTimeout(() => impact.remove(), 500);
            }, 400);

            for (let i = 0; i < 8; i++) {
                setGameTimeout(() => {
                    checkAndPop(i * width + c);
                }, 200 + (i * 60));
            }

            setGameTimeout(() => { if(beam.parentNode) beam.remove(); }, 800);
            
            used = true;

            // JAVÍTÁS: Megvárjuk, amíg az utolsó pukkanás is lecseng (1000ms),
            // és csak utána engedjük el a zárolást és indítjuk a zuhanást.
            setGameTimeout(() => {
                activeProcesses--;
                if (!moveDown()) {
                    // Ha nem kell semminek esnie, akkor felszabadítjuk a játékot
                    if (activeProcesses <= 0) {
                        activeProcesses = 0;
                        gameState = 'IDLE';
                        checkMatches();
                    }
                }
                // Ha a moveDown() true, akkor a zuhanás saját logikája fogja 
                // majd visszaállítani a gameState-et IDLE-re, ha minden beért a helyére.
            }, 1000); 

            break;

case 'shuffle':
            gameState = 'BUSY';
            activeProcesses++;

            squares.forEach(sq => sq.classList.remove('shaking-candy'));

            const gridRect = grid.getBoundingClientRect();
            const centerX = gridRect.left + gridRect.width / 2;
            const centerY = gridRect.top + gridRect.height / 2;

            const hole = document.createElement('div');
            hole.className = 'vortex-center';
            grid.appendChild(hole);

            // 1. VÁRAKOZÁS: Portál kinyílik (600ms)
            setGameTimeout(() => {
                
                // 2. BESZIPPANTÁS A KÖZÉPPONTBA (800ms alatt)
                squares.forEach((square) => {
                    if (square.classList.contains('wall') || square.innerHTML === '') return;

                    square.style.zIndex = '10';
                    const rect = square.getBoundingClientRect();
                    const sqCenterX = rect.left + rect.width / 2;
                    const sqCenterY = rect.top + rect.height / 2;

                    const diffX = centerX - sqCenterX;
                    const diffY = centerY - sqCenterY;

                    square.style.transition = 'transform 0.8s ease-in, opacity 0.8s ease-in';
                    square.style.transform = `translate(${diffX}px, ${diffY}px) scale(0) rotate(180deg)`;
                    square.style.opacity = '0';
                });

            }, 600); 

// 3. KEVERÉS ÉS POZICIONÁLÁS A KÖZÉPPONTBA (Láthatatlanul)
            setGameTimeout(() => {
                shuffleBoard(); // Most már csendben fut a vortex miatt

                // A grid belső felezőpontjai
                const gridMidX = grid.offsetWidth / 2;
                const gridMidY = grid.offsetHeight / 2;

                squares.forEach(square => {
                    if (square.classList.contains('wall') || square.innerHTML === '') return;
                    
                    // Kiszámoljuk a vektorokat a grid közepéhez képest
                    // A square.offsetLeft az elem távolsága a grid szélétől
                    const sqMidX = square.offsetLeft + square.offsetWidth / 2;
                    const sqMidY = square.offsetTop + square.offsetHeight / 2;
                    
                    const diffX = gridMidX - sqMidX;
                    const diffY = gridMidY - sqMidY;

                    // Drasztikus nullázás: nincs transition, láthatatlan, és a KÖZÉPPONTBAN van
                    square.style.setProperty('transition', 'none', 'important');
                    square.style.opacity = '0';
                    square.style.transform = `translate(${diffX}px, ${diffY}px) scale(0.1) rotate(-180deg)`;
                });

                // Kényszerített újrarajzolás (reflow)
                void grid.offsetWidth;

                // 4. KILÖKÉS: Megjelennek a középpontban és kirobbannak
                setGameTimeout(() => {
                    squares.forEach(square => {
                        if (square.classList.contains('wall') || square.innerHTML === '') return;
                        
                        // Itt adjuk meg a robbanásszerű dinamikát
                        // opacity 1-re ugrik, a translate pedig 0-ra (vissza a helyére)
                        square.style.transition = 'transform 0.7s cubic-bezier(0.15, 1, 0.3, 1.1), opacity 0.3s ease-out';
                        square.style.opacity = '1';
                        square.style.transform = 'translate(0px, 0px) scale(1) rotate(0deg)';
                    });
                }, 150); // Egy rövid hatásszünet, amíg a portál "dolgozik"

            }, 1400);

            // 5. TAKARÍTÁS (A portál bezárul)
            setGameTimeout(() => {
                if (hole.parentNode) hole.remove();
                squares.forEach(sq => {
                    sq.style.transition = '';
                    sq.style.transform = '';
                    sq.style.opacity = '';
                    sq.style.zIndex = '';
                });
                
                activeProcesses--;
                if (activeProcesses <= 0) {
                    activeProcesses = 0;
                    gameState = 'IDLE';
                    checkMatches(); 
                }
            }, 3000); 

            used = true;
            break;

	case 'freeSwap':
            isNextSwapFree = true;
            used = true;
            // A lakatot már a useBooster rátette, így itt nincs más dolgunk!
            break;

    }

    if (used) {
        boosters[activeBooster]--;
	hasUsedBooster = true;
        saveProgress();
	saveCurrentMatchState();
        updateBoosterBarUI();
        cancelBooster();
    }
}