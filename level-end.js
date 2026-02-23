function checkWinCondition() {
    if (isGameWon) {
        // Szigorú ellenőrzés: Csak IDLE állapotban, és ha a folyamatok száma tényleg nulla
        if (bonusPhaseActive && !isPausedForWin && gameState === 'IDLE' && activeProcesses <= 0) {
            if (!moveDown()) {
                playNextBonusPowerup();
            }
        }
        return; 
    }

    let config = levelsConfig[currentLevel - 1];
    if (!config || !config.goals) return;

    let hasMinStar = config.starThresholds ? score >= config.starThresholds[0] : true;
    let allGoalsMet = config.goals.every(goal => {
        if (goal.type === 'glass') return layerHealth.every(h => h === 0);
        if (goal.type === 'wall') return !squares.some(sq => sq.classList.contains('wall'));
        if (goal.type === 'collect') return (collectedItems[goal.target] || 0) >= goal.amount;
        return true;
    }) && hasMinStar; 

    if (allGoalsMet) {
        isGameWon = true; 
        isPausedForWin = true; // Csak a kattintást tiltjuk le!
        window.isSkipped = false; // ÚJ: Skip figyelő
        
        const btnBackMenu = document.getElementById('id-btn-back-menu') || document.getElementById('btn-back-menu');
        if (btnBackMenu) btnBackMenu.classList.add('invisible-btn');
      
        setGameTimeout(() => {
            successOverlay.classList.remove('hidden');
            setGameTimeout(() => successText.classList.add('show-anim'), 50);

            setGameTimeout(() => {
                successText.classList.remove('show-anim');
                setGameTimeout(() => {
                    successOverlay.classList.add('hidden');
                    skipOverlay.classList.remove('hidden'); 
                    
                    isPausedForWin = false;
                    bonusPhaseActive = true;

		    // --- ÚJ: Party Mode Bekapcsolása ---
                    const scoreFill = document.getElementById('score-fill');
                    const scoreBg = document.querySelector('.score-progress-bg');
                    if (scoreFill) scoreFill.classList.add('bonus-rainbow');
                    if (scoreBg) scoreBg.classList.add('bonus-glow');
                    
                    if (!moveDown()) {
                        checkWinCondition(); 
                    }
                }, 600);
            }, 1500);
        }, 600); 
    } else {
        if (typeof checkGameOver === 'function') checkGameOver();
    }
}

function checkGameOver() {
    // BIZTONSÁGI ZÁR: Ha már nyertünk, lehetetlen veszíteni!
    if (isGameWon) return; 

    if (movesLeft <= 0 && gameState === 'IDLE') {
        clearInterval(gameLoop);

	localStorage.removeItem('activeMatchState');
        
        // Szív levonása
        if (hearts > 0) {
            hearts--;
            
            if (hearts === getMaxHearts() - 1) {
                lastHeartTime = Date.now();
            }
            saveProgress(); // Azonnal mentünk
        }

        gameOverScreen.classList.remove('hidden');
    }
}

function handleLevelComplete() {
    let config = levelsConfig[currentLevel - 1];
    
    // 1. Csillagok kiszámítása a ponthatárok alapján
    let starsEarned = 0;
    if (config.starThresholds) {
        if (score >= config.starThresholds[2]) starsEarned = 3;
        else if (score >= config.starThresholds[1]) starsEarned = 2;
        else if (score >= config.starThresholds[0]) starsEarned = 1;
    } else {
        starsEarned = 1;
    }

    // 2. Adatok betöltése a memóriából erre a pályára
    if (!userProgress[currentLevel]) {
        userProgress[currentLevel] = { stars: 0, highScore: 0, unlocked: true };
    }
    let levelData = userProgress[currentLevel];

    // 3. PÉNZTÁRCA FRISSÍTÉSE
    if (starsEarned > levelData.stars) {
        let difference = starsEarned - levelData.stars;
        starCurrency += difference;
    }

    // 4. MENTÉS FRISSÍTÉSE
    if (starsEarned > levelData.stars) {
        levelData.stars = starsEarned;
    }
    if (score > levelData.highScore) {
        levelData.highScore = score;
    }

    // 5. KÖVETKEZŐ PÁLYA FELOLDÁSA (Részletes progress)
    let nextLevel = currentLevel + 1;
    if (levelsConfig[nextLevel - 1]) { 
        if (!userProgress[nextLevel]) {
             userProgress[nextLevel] = { stars: 0, highScore: 0, unlocked: true };
        } else {
             userProgress[nextLevel].unlocked = true;
        }
    }

    // --- ÚJ RÉSZ: Főmenü haladás mentése és szinkronizálása ---
    // Ha a most teljesített pálya az eddigi legmagasabb, nyitjuk a következőt a menüben is
    if (typeof unlockedLevel !== 'undefined' && currentLevel === unlockedLevel) {
        unlockedLevel++;
        localStorage.setItem('LevelProgress', unlockedLevel);
        // Frissítjük a menü képét és a lakatokat, hogy látszódjon a változás
        if (typeof updateMenu === 'function') updateMenu();
    }

    // 6. MENTÉS VÉGREHAJTÁSA
    saveProgress();
}

function playNextBonusPowerup() {
    if (window.isSkipped) return; 

    // AZONNAL jelezzük a főmotornak, hogy dolgozunk, így a checkWinCondition nem hívja meg újra!
    gameState = 'BUSY'; 

    let powerupIdx = -1;
    for (let i = 0; i < width * width; i++) {
        // Keressük az első olyan powerupot, ami MÉG NINCS begyújtva
        if (squares[i] && squares[i].innerHTML.includes('power-bg-') && !squares[i].classList.contains('firing-bonus')) {
            powerupIdx = i;
            break;
        }
    }

    if (powerupIdx !== -1) {
        // Megjelöljük, hogy ezt a bombát/rakétát most lőjük ki
        squares[powerupIdx].classList.add('firing-bonus');
        
        if (currentActiveColors < candyEmojis.length) currentActiveColors++; 
        checkAndPop(powerupIdx);
	addScore(SCORE_VALUES.POWERUP_EXPLOSION);
    } else {
        // Nincs több bónusz a pályán. Készítsünk rakétákat a lépésekből!
        setGameTimeout(() => {
            if (!window.isSkipped) convertMovesToRockets();
        }, 500); 
    }
}

function convertMovesToRockets() {
    if (window.isSkipped) return;

    if (movesLeft > 0) {
        // Biztonsági zár: a motor nem szólhat bele, amíg a gyártás tart
        gameState = 'LOCKED'; 

        movesLeft--;
        const movesEl = document.getElementById('moves');
        if (movesEl) movesEl.innerHTML = movesLeft;

        // Használjuk az új, univerzális pontadó függvényünket!
        addScore(SCORE_VALUES.REMAINING_MOVE_BONUS);

        let validSquares = [];
        for (let i = 0; i < width * width; i++) {
            let sq = squares[i];
            if (sq && !sq.classList.contains('wall') && sq.innerHTML !== '' && !sq.innerHTML.includes('power-bg-')) {
                validSquares.push(i);
            }
        }

        if (validSquares.length > 0) {
            let randomIdx = validSquares[Math.floor(Math.random() * validSquares.length)];
            let isRow = Math.random() < 0.5;
            let rocketHTML = isRow ? powerHorizHTML : powerVertHTML;
            let targetSq = squares[randomIdx];
            
            // --- ÚJ: REPÜLŐ ANIMÁCIÓ ---
            // Lekérjük a lépésszámláló és a célsquare pontos helyét a képernyőn
            if (movesEl && targetSq && typeof effectsLayer !== 'undefined') {
                let startRect = movesEl.getBoundingClientRect();
                let endRect = targetSq.getBoundingClientRect();
                
                let flyer = document.createElement('div');
                flyer.innerHTML = '✨'; // Vagy '⚡'
                flyer.className = 'move-to-rocket-flyer';
                flyer.style.position = 'absolute';
                flyer.style.left = startRect.left + 'px';
                flyer.style.top = startRect.top + 'px';
                
                effectsLayer.appendChild(flyer);
                
                // 1. Indítjuk a repülést a cél felé
                setTimeout(() => {
                    flyer.style.left = endRect.left + 'px';
                    flyer.style.top = endRect.top + 'px';
                    flyer.style.transform = 'scale(1.5) rotate(180deg)';
                }, 20);
                
                // 2. Amikor odaér (0.3s múlva), becsapódik és rakéta lesz belőle
                setTimeout(() => {
                    if (flyer.parentNode) flyer.remove();
                    
                    targetSq.innerHTML = rocketHTML;
                    targetSq.classList.add('spawn-rocket-anim');
                    
                    setTimeout(() => {
                        if (targetSq) targetSq.classList.remove('spawn-rocket-anim');
                    }, 400);
                }, 300); // 300ms a repülési idő
                
            } else {
                // Biztonsági háló: ha nincs effektréteg, azonnal cseréljük
                targetSq.innerHTML = rocketHTML;
                targetSq.classList.add('spawn-rocket-anim');
            }
        }

        // --- JAVÍTÁS: Nincs több megakadás! ---
        // Gépfegyver-tempó: 150 milliszekundumonként küldjük az újabb rakétát
        setGameTimeout(convertMovesToRockets, 150); 
        
    } else {
        // Amikor ELFOGYOTT az összes lépés, várunk 1 másodpercet (hogy minden repülő fénygömb beérjen),
        // és csak utána indul a finálé robbantása.
        setGameTimeout(() => {
            if (!window.isSkipped) {
                gameState = 'IDLE'; 
                
                let hasRockets = squares.some(sq => sq && sq.innerHTML.includes('power-bg-'));
                if (hasRockets) playNextBonusPowerup();
                else finalizeWin(); 
            }
        }, 1000);
    }
}


function finalizeWin() {
    window.isSkipped = true; 
    
    // ITT ÁLLÍTJUK LE A MOTORT, AMIKOR MÁR MINDEN BÓNUSZ VÉGET ÉRT!
    if (typeof gameLoop !== 'undefined') clearInterval(gameLoop); 
    
    clearAllEffects();
    gameState = 'LOCKED';
    activeProcesses = 0;
    isPausedForWin = true; 
    skipOverlay.classList.add('hidden');
    
    handleLevelComplete(); 
    
    if (typeof squares !== 'undefined') {
        squares.forEach(sq => {
            if (sq) sq.classList.add('fade-out-candy');
        });
    }
    
    setTimeout(() => {
        const elementsToRemove = document.querySelectorAll('.square, .glass, .fade-out-candy');
        elementsToRemove.forEach(el => el.remove());
        
        let bgLayer = document.getElementById('grid-bg-layer');
        if (bgLayer) bgLayer.classList.add('clear-bg');
        
	// 4. Gyönyörködési szünet (1.5 másodperc), hogy lássa az éles képet
        setTimeout(() => {
            triggerWinScreen(); // MOST MÁR CSAK EZT HÍVJUK!
        }, 1500);
    }, 500);
}

function calculateProfessionalSkip() {
    if (!isGameWon) return;

    let totalBonus = 0;
    
    // 1. Meglévő lépések elszámolása
    // Minden lépésért jár a fix bónusz + egy átlagos robbanás értéke (8 cukorka)
    const pointsPerMove = SCORE_VALUES.REMAINING_MOVE_BONUS + (8 * SCORE_VALUES.CANDY_POP);
    totalBonus += movesLeft * pointsPerMove;

    // 2. Pályán maradt Powerupok elszámolása
    squares.forEach(sq => {
        const html = sq.innerHTML;
        if (html.includes('power-bg-')) {
            // Fix robbanás pont
            totalBonus += SCORE_VALUES.POWERUP_EXPLOSION;
            
            // Sugárirányú extra (mennyi cukorkát vinne magával?)
            if (html.includes('power-bg-colorbomb')) {
                totalBonus += (width * 2) * SCORE_VALUES.CANDY_POP; // Kb. két sornyi cukorka
            } else if (html.includes('power-bg-bomb')) {
                totalBonus += 9 * SCORE_VALUES.CANDY_POP; // 3x3-as terület
            } else {
                totalBonus += width * SCORE_VALUES.CANDY_POP; // Egy teljes sor vagy oszlop
            }
        }
    });

    // 3. Értékek frissítése
    score += totalBonus;
    movesLeft = 0;

    // 4. UI kényszerített frissítése
    if (typeof scoreDisplay !== 'undefined') scoreDisplay.innerHTML = score;
    updateGoalUI(); // Ez frissíti a csíkot és a csillagokat

    // 5. Lezárás
    window.isSkipped = true;
    finalizeWin();
}

// Az átpörgetés (Skip) figyelése - A LEGEGYSZERŰBB VERZIÓ
if (skipOverlay) {
    skipOverlay.addEventListener('click', () => {
        // Biztonsági ellenőrzés: csak ha nyert, és még nem skippelt
        if (!isGameWon || window.isSkipped) return; 

        // Meghívjuk a profi kalkulátort, ami mindent elintéz
        calculateProfessionalSkip();
    });
}

function triggerWinScreen() {
    localStorage.removeItem('activeMatchState');
    
    // 1. Képernyő megjelenítése
    if (typeof showScreen === 'function') {
        showScreen(winScreen);
    } else {
        winScreen.classList.remove('hidden');
    }

    // 2. Kép frissítése a levelsConfig alapján
    const winImg = document.getElementById('win-image');
    let config = levelsConfig[currentLevel - 1];
    if (winImg && config && config.backgroundImage) {
        winImg.src = config.backgroundImage;
    }

    // 3. Gombok és Üzenet ellenőrzése
    const winMessage = document.getElementById('win-message');
    const nextBtn = document.getElementById('next-level-btn');
    
    if (currentLevel < levelsConfig.length) {
        if (nextBtn) {
            nextBtn.classList.remove('hidden');
            nextBtn.onclick = () => {
                // Elrejtjük a győzelmi ablakot
                winScreen.classList.add('hidden'); 
                
		const nextLvl = currentLevel + 1;
		if (typeof selectedLevelToPlay !== 'undefined') {
        		selectedLevelToPlay = nextLvl;
    		}

                // --- ÚJ: Nem startLevel-t hívunk, hanem a bemutató animációt ---
                // Mivel hearts ellenőrzést a play gombnál is teszünk, itt is érdemes, 
                // de mivel épp most nyert, feltételezzük, hogy van szíve (vagy ingyen mehet tovább)
                if (typeof hearts !== 'undefined' && hearts > 0) {
                    triggerPreLevelSplash(currentLevel + 1);
                } else {
                    // Ha véletlen elfogyott volna a szív (ritka eset nyerésnél)
                    transitionToMainMenu();
                }
            };
        }
        if (winMessage) winMessage.innerHTML = "Ügyes vagy!";
    } else {
        if (nextBtn) nextBtn.classList.add('hidden');
        if (winMessage) winMessage.innerHTML = "Minden pályát teljesítettél! ❤️";
    }

// --- 4. PONTSZÁM PÖRGÉSE ÉS CSILLAGOK FOKOZATOS TÖLTÉSE ---
    const scoreDisplay = document.getElementById('win-score-display');
    
    const s1Wrap = document.getElementById('win-star-wrap-1');
    const s2Wrap = document.getElementById('win-star-wrap-2');
    const s3Wrap = document.getElementById('win-star-wrap-3');
    
    const s1Fill = document.getElementById('win-star-fill-1');
    const s2Fill = document.getElementById('win-star-fill-2');
    const s3Fill = document.getElementById('win-star-fill-3');
    
    // Alaphelyzet: 0%, pukkanások eltávolítása
    if (scoreDisplay) scoreDisplay.innerHTML = '0';
    [s1Wrap, s2Wrap, s3Wrap].forEach(el => el && el.classList.remove('pop'));
    [s1Fill, s2Fill, s3Fill].forEach(el => el && (el.style.width = '0%'));

    let currentCount = 0;
    let finalScore = score; 
    let duration = 1500; 
    let intervalTime = 30;
    let increment = Math.ceil(finalScore / (duration / intervalTime));

    // Küszöbértékek a konfigurációból (biztonsági 1-esekkel, hogy ne osszunk nullával)
    let t1 = (config && config.starThresholds) ? config.starThresholds[0] : 1000;
    let t2 = (config && config.starThresholds) ? config.starThresholds[1] : 2000;
    let t3 = (config && config.starThresholds) ? config.starThresholds[2] : 3000;

    setTimeout(() => {
        let counter = setInterval(() => {
            currentCount += increment;
            if (currentCount >= finalScore) {
                currentCount = finalScore;
                clearInterval(counter);
            }

            if (scoreDisplay) scoreDisplay.innerHTML = currentCount;

            // 1. Csillag töltése (0-tól T1-ig)
            let p1 = Math.min(100, Math.max(0, (currentCount / t1) * 100));
            if (s1Fill) s1Fill.style.width = p1 + '%';
            if (p1 >= 100 && s1Wrap && !s1Wrap.classList.contains('pop')) s1Wrap.classList.add('pop');

            // 2. Csillag töltése (T1-től T2-ig)
            let p2 = Math.min(100, Math.max(0, ((currentCount - t1) / (t2 - t1)) * 100));
            if (s2Fill) s2Fill.style.width = p2 + '%';
            if (p2 >= 100 && s2Wrap && !s2Wrap.classList.contains('pop')) s2Wrap.classList.add('pop');

            // 3. Csillag töltése (T2-től T3-ig)
            let p3 = Math.min(100, Math.max(0, ((currentCount - t2) / (t3 - t2)) * 100));
            if (s3Fill) s3Fill.style.width = p3 + '%';
            if (p3 >= 100 && s3Wrap && !s3Wrap.classList.contains('pop')) s3Wrap.classList.add('pop');

        }, intervalTime);
    }, 400); 
}