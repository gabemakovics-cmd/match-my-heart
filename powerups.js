// --- LÁNCREAKCIÓS ROBBANÁS LOGIKA ---


function triggerExplosion(startIndex, type, targetContent = null) {
    gameState = 'BUSY';
    activeProcesses++;
    if (type !== 'colorbomb') {
        squares[startIndex].innerHTML = ''; 
    }
    damageLayer(startIndex);

    // --- ÚJ LOGIKA: A Color Bomb robbanása ---
    if (type === 'colorbomb') {
        squares[startIndex].classList.add('colorbomb-active'); 
        
        let colorToDestroy = targetContent;
        let isBasicCandy = candyEmojis.includes(colorToDestroy);

        if (!colorToDestroy || !isBasicCandy) {
            let counts = {};
            let maxCount = 0;
            let frequentColor = candyEmojis[0];

            squares.forEach(sq => {
                let html = sq.innerHTML;
                if (candyEmojis.includes(html)) {
                    counts[html] = (counts[html] || 0) + 1;
                    if (counts[html] > maxCount) {
                        maxCount = counts[html];
                        frequentColor = html;
                    }
                }
            });
            colorToDestroy = frequentColor;
        }

        let targets = [];
        squares.forEach((sq, i) => {
            if (sq.innerHTML === colorToDestroy) targets.push(i);
        });

        // --- BIZTONSÁGOS, LÁNCOLT PUKKASZTÁS ---
        let currentTargetIndex = 0;

        function popNextTarget() {
            // Ha még van célpont
            if (currentTargetIndex < targets.length) {
                let idx = targets[currentTargetIndex];
                spawnLightning(startIndex, idx); 
                checkAndPop(idx);
                
                currentTargetIndex++;
                
                // Vár 120ms-t, majd rekurzívan hívja a következőt
                setGameTimeout(popNextTarget, 120); 
            } else {
                // Ha elfogytak a célpontok, pukkan ki maga a Color Bomb
                setGameTimeout(() => {
                    squares[startIndex].classList.remove('colorbomb-active');
                    squares[startIndex].innerHTML = ''; 
                    popSquare(startIndex); 

                    activeProcesses--;
                    if (activeProcesses <= 0) {
                        activeProcesses = 0;
                        gameState = 'IDLE';
                        checkWinCondition();
                    }
                }, 400);
            }
        }

        // Elindítjuk az első villámot
        popNextTarget();
        return;
    }
        
    let r = Math.floor(startIndex / width);
    let c = startIndex % width;

    // --- SIMA BOMBA LOGIKA (Javított középpont számítás) ---
    if (type === 'bomb') {
        const rect = squares[startIndex].getBoundingClientRect();
        const midX = rect.left + rect.width / 2;
        const midY = rect.top + rect.height / 2;

        const ghost = document.createElement('div');
        ghost.className = 'single-bomb-ghost';
        ghost.innerHTML = '💣';
        ghost.style.left = `${midX}px`;
        ghost.style.top = `${midY}px`;
        
        effectsLayer.appendChild(ghost);

        // Várakozás a lassított animáció végéig (0.8s)
        setGameTimeout(() => {
            if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
            
            popSquare(startIndex); 
            
            let validNeighbors = [];
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    let nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) validNeighbors.push(nr * width + nc);
                }
            }
            validNeighbors.forEach(idx => {
                if (idx !== startIndex) checkAndPop(idx);
            });
            
            setGameTimeout(() => {
    		activeProcesses--;
    		if (activeProcesses <= 0) {
        	activeProcesses = 0;
        	gameState = 'IDLE';
        	checkWinCondition();
    	   	}
	     }	, 300);
        }, 400); // Szinkronban a CSS-sel (0.8s)
        return;
    }

    // --- RAKÉTÁK ---
        let maxDist = (type === 'horiz') ? Math.max(c, width - 1 - c) : Math.max(r, 8 - 1 - r);
        let totalAnimationTime = maxDist * 80 + 600; 
        
        if (type === 'horiz') {
            if (c > 0) spawnFlyingRocket(startIndex, 'left');
            if (c < width - 1) spawnFlyingRocket(startIndex, 'right');
        } else {
            if (r > 0) spawnFlyingRocket(startIndex, 'up');
            if (r < 7) spawnFlyingRocket(startIndex, 'down');
        }
        
        for (let dist = 0; dist <= maxDist; dist++) {
            setGameTimeout(() => {
                if (type === 'horiz') {
                    let leftIdx = startIndex - dist;
                    let rightIdx = startIndex + dist;
                    if (dist === 0) checkAndPop(startIndex);
                    else {
                        if (leftIdx >= r * width) checkAndPop(leftIdx);
                        if (rightIdx < (r + 1) * width) checkAndPop(rightIdx);
                    }
                } else {
                    let upIdx = startIndex - dist * width;
                    let downIdx = startIndex + dist * width;
                    if (dist === 0) checkAndPop(startIndex);
                    else {
                        if (upIdx >= 0) checkAndPop(upIdx);
                        if (downIdx < 64) checkAndPop(downIdx);
                    }
                }
            }, dist * 80);
        }

        setGameTimeout(() => {
    	activeProcesses--;
    	if (activeProcesses <= 0) {
        	activeProcesses = 0;
        	gameState = 'IDLE';
        	checkWinCondition();
    		}
	}, totalAnimationTime);
    }

// --- ÚJ FÜGGVÉNY: POWERUP KOMBINÁCIÓK KEZELÉSE ---
function triggerCombo(index, t1, t2) {

	if (gameState === 'LOCKED') return;
	gameState = 'BUSY';
	activeProcesses++;
        
        let types = [t1, t2];
        let hasColor = types.includes('colorbomb');
        let hasBomb = types.includes('bomb');
        let hasRocket = types.includes('horiz') || types.includes('vert');
        
        let r = Math.floor(index / width);
        let c = index % width;

// 1. DUPLA COLORBOMB: Rengés, Lökéshullám és Söprés
if (t1 === 'colorbomb' && t2 === 'colorbomb') {
    let delay = 0;
    addScore(SCORE_VALUES.COMBO_COLORBOMBS);
    
    // Képernyő rengés elindítása
    const gameContainer = document.querySelector('.game-container');
    if (gameContainer) gameContainer.classList.add('screen-shake');
    
    // Lökéshullám pontos pozicionálása a képernyőn
    let centerRect = squares[index].getBoundingClientRect();
    let centerX = centerRect.left + (centerRect.width / 2);
    let centerY = centerRect.top + (centerRect.height / 2);

    let shockwave = document.createElement('div');
    shockwave.classList.add('shockwave');
    // JS-ből adjuk meg a méretet és a középre igazítást
    shockwave.style.width = '20px';
    shockwave.style.height = '20px';
    shockwave.style.left = `${centerX - 10}px`; 
    shockwave.style.top = `${centerY - 10}px`;
    
    effectsLayer.appendChild(shockwave);
    squares[index].classList.add('colorbomb-active');

    for (let i = 0; i < width * width; i++) {
        setGameTimeout(() => {            
            let html = squares[i].innerHTML;
            
            // --- JAVÍTÁS ITT ---
            // Ha a söprögetés talál egy MÁSIK Colorbombot (pl. amivel épp kicserélted)
            if (html.includes('power-bg-colorbomb') && i !== index) {
                squares[i].innerHTML = ''; // Kiürítjük, hogy ne induljon el a szimpla esemény
                popSquare(i); // Adunk neki egy csendes pukkanást
            } 
            // A többi powerup (bomba, rakéta) nyugodtan felrobbanhat
            else if (html.includes('power-bg-') && i !== index) {
                checkAndPop(i);
            } 
            else if (html !== '' || squares[i].classList.contains('wall')) {
                popSquare(i);
            } 
            else {
                damageLayer(i);
            }
        }, delay);
        delay += 30; // Finom söprés
    }

    setGameTimeout(() => { 
        if (gameContainer) gameContainer.classList.remove('screen-shake');
        squares[index].classList.remove('colorbomb-active');
        squares[index].innerHTML = ''; 
        popSquare(index);
        
        // Lökéshullám törlése a DOM-ból az animáció végén
        if (shockwave.parentNode) shockwave.parentNode.removeChild(shockwave);
       
	activeProcesses--;
	if (activeProcesses <= 0) {
    		activeProcesses = 0;
    		gameState = 'IDLE';
    		if (!moveDown()) {
        	checkWinCondition();
    		}
        }
       
    }, delay + 600);
    
    return;
}

// 2. DUPLA BOMBA: Pontosan a célmező közepén
    if (t1 === 'bomb' && t2 === 'bomb') {
        // Matematikai középpont számítása a Grid alapján
        const gridRect = grid.getBoundingClientRect();
        const cellSize = squares[0].offsetWidth;
        const midX = gridRect.left + (c * cellSize) + (cellSize / 2);
        const midY = gridRect.top + (r * cellSize) + (cellSize / 2);

        const ghost = document.createElement('div');
        ghost.className = 'giant-bomb-ghost';
        ghost.innerHTML = '💣';
        ghost.style.left = `${midX}px`;
        ghost.style.top = `${midY}px`;
        
	addScore(SCORE_VALUES.COMBO_BOMBS);
        effectsLayer.appendChild(ghost);

        // 1.5 - 1.6 másodperces lassú folyamat
        setGameTimeout(() => {
            if (ghost.parentNode) ghost.parentNode.removeChild(ghost);

            let validNeighbors = [];
            // Pontos 5x5-ös hatókör
            for (let dr = -2; dr <= 2; dr++) {
                for (let dc = -2; dc <= 2; dc++) {
                    let nr = r + dr, nc = c + dc;
                    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
                        validNeighbors.push(nr * width + nc);
                    }
                }
            }

            validNeighbors.forEach(idx => checkAndPop(idx));
            setGameTimeout(() => { 
    		activeProcesses--;
    		if (activeProcesses <= 0) {
        		activeProcesses = 0;
        		gameState = 'IDLE';
        		checkWinCondition(); 
    		}
		}, 400);
        }, 1550); 
        
        return;
    }

        // 3. KÉT RAKÉTA: Keresztirányú robbanás
        if (hasRocket && !hasBomb && !hasColor) {
            spawnFlyingRocket(index, 'left');
            spawnFlyingRocket(index, 'right');
            spawnFlyingRocket(index, 'up');
            spawnFlyingRocket(index, 'down');

	    addScore(SCORE_VALUES.COMBO_ROCKETS);
            
            let maxDist = Math.max(c, width - 1 - c, r, 8 - 1 - r);
            for (let dist = 0; dist <= maxDist; dist++) {
                setGameTimeout(() => {
                    if (dist === 0) popSquare(index);
                    else {
                        if (c - dist >= 0) checkAndPop(r * width + (c - dist));
                        if (c + dist < width) checkAndPop(r * width + (c + dist));
                        if (r - dist >= 0) checkAndPop((r - dist) * width + c);
                        if (r + dist < 8) checkAndPop((r + dist) * width + c);
                    }
                }, dist * 80);
            }
            setGameTimeout(() => { 
    		activeProcesses--;
    		if (activeProcesses <= 0) {
        		activeProcesses = 0;
        		gameState = 'IDLE';
        		checkWinCondition(); 
    			}
		}, maxDist * 80 + 300);
            return;
        }

// 4. RAKÉTA + BOMBA: 3 soros és 3 oszlopos szuper-robbanás repülő rakétákkal
        if (hasRocket && hasBomb && !hasColor) {
            // Megkeressük az érvényes sorokat és oszlopokat (max 3-3)
            let rows = [];
            for(let dr = -1; dr <= 1; dr++) if (r + dr >= 0 && r + dr < 8) rows.push(r + dr);
            
            let cols = [];
            for(let dc = -1; dc <= 1; dc++) if (c + dc >= 0 && c + dc < 8) cols.push(c + dc);

	    addScore(SCORE_VALUES.COMBO_ROCKET_BOMB);

            // Vizuális repülő rakéták indítása minden érintett sorban/oszlopban
            rows.forEach(row => {
                let spawnIdx = row * width + c;
                if (c > 0) spawnFlyingRocket(spawnIdx, 'left');
                if (c < width - 1) spawnFlyingRocket(spawnIdx, 'right');
            });

            cols.forEach(col => {
                let spawnIdx = r * width + col;
                if (r > 0) spawnFlyingRocket(spawnIdx, 'up');
                if (r < 7) spawnFlyingRocket(spawnIdx, 'down');
            });

            // Robbanások időzítése a kirepülő rakéták sebességéhez (80ms/mező)
            let maxDist = Math.max(c, width - 1 - c, r, 8 - 1 - r);
            
            for (let dist = 0; dist <= maxDist; dist++) {
                setGameTimeout(() => {
                    if (dist === 0) {
                        // A robbanás magja (a 3x3-as terület közepe)
                        rows.forEach(row => {
                            cols.forEach(col => checkAndPop(row * width + col));
                        });
                    } else {
                        // A kirepülő rakéták nyomában lévő pukkanások
                        rows.forEach(row => {
                            if (c - dist >= 0) checkAndPop(row * width + (c - dist));
                            if (c + dist < width) checkAndPop(row * width + (c + dist));
                        });
                        cols.forEach(col => {
                            if (r - dist >= 0) checkAndPop((r - dist) * width + col);
                            if (r + dist < 8) checkAndPop((r + dist) * width + col);
                        });
                    }
                }, dist * 80);
            }

            setGameTimeout(() => { 
    		activeProcesses--;
    		if (activeProcesses <= 0) {
        		activeProcesses = 0;
        		gameState = 'IDLE';
        		checkWinCondition(); 
    			}
		}, maxDist * 80 + 300);
            return;
        }

        // 5. COLORBOMB + POWERUP (Rakéta vagy Bomba): Tömeges, véletlenszerű átalakítás
        if (hasColor && (hasRocket || hasBomb)) {

	    addScore(SCORE_VALUES.COMBO_COLORBOMB_POWERUP);
            let counts = {};
            let maxCount = 0;
            let frequentColor = candyEmojis[0];
            
            squares.forEach(sq => {
                let html = sq.innerHTML;
                if (candyEmojis.includes(html)) {
                    counts[html] = (counts[html] || 0) + 1;
                    if (counts[html] > maxCount) {
                        maxCount = counts[html];
                        frequentColor = html;
                    }
                }
            });

            squares.forEach((sq, i) => {
                if (sq.innerHTML === frequentColor) {
                    setGameTimeout(() => {
                        let spawnHTML = powerBombHTML;
                        let spawnType = 'bomb';
                        
                        // HA RAKÉTA KOMBÓ, AKKOR VÉLETLENSZERŰ IRÁNYT KAP MINDEN KLÓN
                        if (hasRocket) {
                            if (Math.random() < 0.5) {
                                spawnHTML = powerHorizHTML;
                                spawnType = 'horiz';
                            } else {
                                spawnHTML = powerVertHTML;
                                spawnType = 'vert';
                            }
                        }

                        sq.innerHTML = spawnHTML;
                        sq.classList.add('powerup-trigger'); 
                        
                        setGameTimeout(() => {
                            sq.classList.remove('powerup-trigger');
                            triggerExplosion(i, spawnType);
                        }, 1000);
                    }, Math.random() * 400);
                }
            });

            setGameTimeout(() => { 
    		activeProcesses--;
    		if (activeProcesses <= 0) {
        		activeProcesses = 0;
        		gameState = 'IDLE';
        		checkWinCondition(); 
    			}
		}, 1500);
            return;
        }
    }

// --- ÚJ: VILLÁM ANIMÁCIÓ (Javított) ---
function spawnLightning(startIdx, endIdx) {
    let startSquare = squares[startIdx];
    let endSquare = squares[endIdx];
    if (!startSquare || !endSquare) return;

    let startRect = startSquare.getBoundingClientRect();
    let endRect = endSquare.getBoundingClientRect();

    // Középpontok a KÉPERNYŐHÖZ (viewport) képest
    let startX = startRect.left + (startRect.width / 2);
    let startY = startRect.top + (startRect.height / 2);
    let endX = endRect.left + (endRect.width / 2);
    let endY = endRect.top + (endRect.height / 2);

    let distance = Math.hypot(endX - startX, endY - startY);
    let angle = Math.atan2(endY - startY, endX - startX) * 180 / Math.PI;

    let lightning = document.createElement('div');
    lightning.classList.add('lightning-beam');
    lightning.style.width = `${distance}px`;
    lightning.style.left = `${startX}px`;
    lightning.style.top = `${startY}px`;
    lightning.style.setProperty('--angle', `${angle}deg`);

    // FONTOS: A testhez adjuk, így nem tolja szét a játéktér celláit!
    effectsLayer.appendChild(lightning);
    
    setGameTimeout (() => {
        if (lightning.parentNode) lightning.parentNode.removeChild(lightning);
    }, 250);
}

    //Ellenőrzi, hogy a célpont rakéta-e, és ha igen, begyújtja
function checkAndPop(idx) {
    if (squares[idx].innerHTML === '' && !squares[idx].classList.contains('wall')) return;

    let content = squares[idx].innerHTML;
    
    // Ha a robbanás egy MÁSIK powerupot ér
    if (content.includes('power-bg-')) {
        squares[idx].classList.add('powerup-trigger');
        
        let type = '';
        if (content.includes('power-bg-h')) type = 'horiz';
        else if (content.includes('power-bg-v')) type = 'vert';
        else if (content.includes('power-bg-bomb')) type = 'bomb';
        else if (content.includes('power-bg-colorbomb')) type = 'colorbomb';

        // Picit várunk, mielőtt a láncreakció elindul
        setGameTimeout(() => {
            squares[idx].classList.remove('powerup-trigger');
            triggerExplosion(idx, type);
        }, 250); 
    } 
    // Ha a robbanás sima emojit ér (vagy falat, ami majd a popSquare-ben dől el)
    else {
        popSquare(idx);
    }
}

function popSquare(idx) {
    const square = squares[idx];
    
    // BIZTONSÁGI ZÁR: Ha a cella nem létezik, vagy már üres, vagy épp animál, kilépünk!
    if (!square || square.classList.contains('pop-animation')) return;
    if (square.innerHTML === '' && !square.classList.contains('wall')) return;
    
    // Csak akkor adunk alappontot, ha a cellában TÉNYLEG volt valami cukorka
    // A powerup-ok és a falak nem adnak +10 pontot a popSquare-ből, csak amit előtte beállítottál nekik
    if (square.innerHTML !== '' && !square.classList.contains('wall') && !square.innerHTML.includes('power-bg-')) {
	addScore(SCORE_VALUES.CANDY_POP);
    }

    let emoji = square.innerHTML;
    let config = levelsConfig[currentLevel - 1];

    // Célok gyűjtése (marad változatlanul)
    if (config.goals) {
        config.goals.forEach(g => {
            if (g.type === 'collect' && g.target === emoji) {
                collectedItems[emoji] = (collectedItems[emoji] || 0) + 1;
            }
        });
    }

    // --- FALAK PONTOS SEBZÉSE ---
    if (square.classList.contains('wall')) {
	addScore(SCORE_VALUES.WALL_BREAK);
        square.classList.remove('wall');
	square.classList.add('wall-crumble');
        square.innerHTML = ''; 
    }

    // Megjelöljük, hogy animál (így nem futhat le még egyszer)
    square.classList.add('pop-animation');
    damageLayer(idx); 
    updateGoalUI();

    checkWinCondition();

    // A tartalom törlése a látványos eltűnés után
    setGameTimeout(() => {
        if (!square.classList.contains('wall')) square.innerHTML = '';
        square.classList.remove('pop-animation');
	square.classList.remove('wall-crumble');
    }, 300);
    needsSaving = true;
}

function spawnFlyingRocket(idx, direction) {
    let flyer = document.createElement('div');
    flyer.innerHTML = '🚀';
    flyer.style.position = 'absolute';
    
    // 1. JAVÍTÁS: Lekérjük az egyik létező cella aktuális méretét
    let cellSize = squares[0].getBoundingClientRect().width;
    
    // 2. JAVÍTÁS: A fix 70-et lecseréljük a cellSize-ra az indulásnál
    let startX = (idx % width) * cellSize;
    let startY = Math.floor(idx / width) * cellSize;
    
    flyer.style.left = startX + 'px';
    flyer.style.top = startY + 'px';
    flyer.style.width = cellSize + 'px'; // 3. JAVÍTÁS: Szélesség is dinamikus
    flyer.style.height = cellSize + 'px'; // 4. JAVÍTÁS: Magasság is dinamikus
    flyer.style.display = 'flex';
    flyer.style.justifyContent = 'center';
    flyer.style.alignItems = 'center';
    flyer.style.fontSize = (cellSize * 0.7) + 'px'; // JAVÍTÁS: Betűméret a cellához igazítva
    flyer.style.zIndex = '500';
    flyer.style.pointerEvents = 'none';
    
    let dist = 0;
    if (direction === 'left') dist = (idx % width);
    if (direction === 'right') dist = 7 - (idx % width);
    if (direction === 'up') dist = Math.floor(idx / width);
    if (direction === 'down') dist = 7 - Math.floor(idx / width);
    
    let duration = dist * 80; 
    if (duration === 0) duration = 80;
    flyer.style.transition = `all ${duration}ms linear`;
    
    if (direction === 'left') flyer.style.transform = 'rotate(-135deg)';
    if (direction === 'right') flyer.style.transform = 'rotate(45deg)';
    if (direction === 'up') flyer.style.transform = 'rotate(-45deg)';
    if (direction === 'down') flyer.style.transform = 'rotate(135deg)';
    
    grid.appendChild(flyer);
    
    setGameTimeout(() => {
        // 5. JAVÍTÁS: A repülés célpontja is a dinamikus cellSize alapján számolódik
        if (direction === 'left') flyer.style.left = (startX - dist * cellSize - cellSize) + 'px';
        if (direction === 'right') flyer.style.left = (startX + dist * cellSize + cellSize) + 'px';
        if (direction === 'up') flyer.style.top = (startY - dist * cellSize - cellSize) + 'px';
        if (direction === 'down') flyer.style.top = (startY + dist * cellSize + cellSize) + 'px';
    }, 20);
    
    setGameTimeout(() => {
        if(flyer.parentNode) flyer.remove();
    }, duration + 50);
}