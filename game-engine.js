function addScore(amount) {
    if (amount <= 0) return;
    score += amount;
    if (typeof scoreDisplay !== 'undefined' && scoreDisplay) {
        scoreDisplay.innerHTML = score;
    }
}


// Ideiglenes csere a vizsgálathoz
function swapContents(i, j) {
    let temp = squares[i].innerHTML;
    squares[i].innerHTML = squares[j].innerHTML;
    squares[j].innerHTML = temp;
}

// Megnézi, van-e érvényes lépés vagy aktiválható powerup
function hasPossibleMove() {
    // 1. Van-e powerup a pályán? Ha igen, van érvényes lépés.
    for (let i = 0; i < width * width; i++) {
        let html = squares[i].innerHTML;
        if (html.includes('power-bg-')) return true;
    }

    // 2. Szimuláljuk a szomszédos cseréket
    for (let i = 0; i < width * width; i++) {
        if (squares[i].classList.contains('wall') || squares[i].innerHTML === '') continue;

        // Jobbra csere szimulálása
        if (i % width < width - 1 && !squares[i+1].classList.contains('wall') && squares[i+1].innerHTML !== '') {
            swapContents(i, i + 1);
            let valid = checkIfValidMatch();
            swapContents(i, i + 1); // Visszacseréljük az eredeti állapotra
            if (valid) return true;
        }
        
        // Lefelé csere szimulálása
        if (i < width * (width - 1) && !squares[i+width].classList.contains('wall') && squares[i+width].innerHTML !== '') {
            swapContents(i, i + width);
            let valid = checkIfValidMatch();
            swapContents(i, i + width); // Visszacseréljük
            if (valid) return true;
        }
    }
    return false;
}

// A pálya megkeverése
function shuffleBoard() {
    if (isGameWon) return; // ÚJ RÉSZ: Győzelem után már tilos keverni!
    
    let movableIndices = [];
    let contents = [];

    // Összegyűjtjük a mozgatható elemeket (falat és üres helyet nem bántunk, üveg is marad a helyén)
    for (let i = 0; i < width * width; i++) {
        if (!squares[i].classList.contains('wall') && squares[i].innerHTML !== '') {
            movableIndices.push(i);
            contents.push(squares[i].innerHTML);
        }
    }

    let attempts = 0;
    // Addig keverjük, amíg lesz lehetséges lépés, de nincs azonnali hármas találat
    while (attempts < 100) {
        // Fisher-Yates keverő algoritmus
        for (let i = contents.length - 1; i > 0; i--) {
            let j = Math.floor(Math.random() * (i + 1));
            [contents[i], contents[j]] = [contents[j], contents[i]];
        }

        // Visszatöltés a táblára
        for (let k = 0; k < movableIndices.length; k++) {
            squares[movableIndices[k]].innerHTML = contents[k];
        }

        if (!checkIfValidMatch() && hasPossibleMove()) {
            break;
        }
        attempts++;
    }

    // Vizuális pukkanás effekt a keveréshez

    if (document.querySelector('.vortex-center')) return;

    movableIndices.forEach(idx => {
        squares[idx].classList.add('pop-animation');
        setGameTimeout(() => squares[idx].classList.remove('pop-animation'), 300);
    });
}

function checkMatches() {
    if (gameState !== 'IDLE' || draggedSquare) return;

    let matchedIndices = new Set(); 
    let currentScoreAdded = 0;
    let powerupsToCreate = []; 

    let horizMatchedSet = new Set();
    let vertMatchedSet = new Set();


// 1. Vízszintes keresés
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 6; c++) { 
            let i = r * width + c;
            let emoji = squares[i].innerHTML;
            if (emoji === '' || emoji.includes('power-bg-') || emoji === wallEmoji) continue;
            
            let matchLength = 1;
            while (c + matchLength < 8 && squares[i + matchLength].innerHTML === emoji) matchLength++;
            
            if (matchLength >= 3) {
                // Azonnal adjuk a vonal bónuszát
                addScore(calculatePoints(matchLength)); 
                
                let matchIndicesArr = [];
                // --- EZ A CIKLUS HIÁNYZOTT: Hozzáadjuk a listához a talált elemeket ---
                for (let k = 0; k < matchLength; k++) {
                    matchIndicesArr.push(i + k);
                    horizMatchedSet.add(i + k);
                }
                
                if (matchLength >= 5) {
                    let spawnIdx = matchIndicesArr.find(idx => lastSwapped.includes(idx));
                    if (spawnIdx === undefined) spawnIdx = matchIndicesArr[2]; 
                    powerupsToCreate.push({ index: spawnIdx, html: powerColorBombHTML, type: 'colorbomb' });
                    
                    // JUTALOM A COLORBOMBÉRT
                    addScore(SCORE_VALUES.CREATE_COLORBOMB);
                    
                } else if (matchLength === 4) {
                    let spawnIdx = matchIndicesArr.find(idx => lastSwapped.includes(idx));
                    if (spawnIdx === undefined) spawnIdx = matchIndicesArr[1]; 
                    powerupsToCreate.push({ index: spawnIdx, html: powerVertHTML, type: 'vert' }); 
                    
                    // JUTALOM A RAKÉTÁÉRT
                    addScore(SCORE_VALUES.CREATE_ROCKET);
                }
                
                matchIndicesArr.forEach(idx => matchedIndices.add(idx));
                c += matchLength - 1; 
            }
        }
    }

    // 2. Függőleges keresés
    for (let c = 0; c < 8; c++) {
        for (let r = 0; r < 6; r++) {
            let i = r * width + c;
            let emoji = squares[i].innerHTML;
            if (emoji === '' || emoji.includes('power-bg-') || emoji === wallEmoji) continue;
            
            let matchLength = 1;
            while (r + matchLength < 8 && squares[i + matchLength * width].innerHTML === emoji) matchLength++;
            
            if (matchLength >= 3) {
                // --- JAVÍTVA: currentScoreAdded helyett azonnali addScore ---
                addScore(calculatePoints(matchLength)); 
                
                let matchIndicesArr = [];
                // Itt szerencsére benne volt a ciklusod
                for (let k = 0; k < matchLength; k++) {
                    matchIndicesArr.push(i + k * width);
                    vertMatchedSet.add(i + k * width);
                }
                
                if (matchLength >= 5) {
                    let spawnIdx = matchIndicesArr.find(idx => lastSwapped.includes(idx));
                    if (spawnIdx === undefined) spawnIdx = matchIndicesArr[2];
                    powerupsToCreate.push({ index: spawnIdx, html: powerColorBombHTML, type: 'colorbomb' });
                    
                    // JUTALOM A COLORBOMBÉRT
                    addScore(SCORE_VALUES.CREATE_COLORBOMB);
                    
                } else if (matchLength === 4) {
                    let spawnIdx = matchIndicesArr.find(idx => lastSwapped.includes(idx));
                    if (spawnIdx === undefined) spawnIdx = matchIndicesArr[1];
                    powerupsToCreate.push({ index: spawnIdx, html: powerHorizHTML, type: 'horiz' });
                    
                    // JUTALOM A RAKÉTÁÉRT
                    addScore(SCORE_VALUES.CREATE_ROCKET);
                }
                
                matchIndicesArr.forEach(idx => matchedIndices.add(idx));
                r += matchLength - 1; 
            }
        }
    }


    // 3. L/T alakzatok (Bombák) keresése
    let intersections = new Set([...horizMatchedSet].filter(x => vertMatchedSet.has(x)));
    let processedBombColors = new Set(); // ÚJ: Emlékezet, hogy ne csináljunk száz bombát ugyanabból a színből

    intersections.forEach(idx => {
        let emoji = squares[idx].innerHTML;
        
        // Ha ebből a színből már csináltunk bombát ebben a robbanásban, a többit átugorjuk
        if (processedBombColors.has(emoji)) return;

        // Fókuszpont: Ha a játékos húzása hozta létre, tegyük a bombát a húzás helyére
        let spawnIdx = idx;
        let swappedIntersection = [...intersections].find(i => lastSwapped.includes(i) && squares[i].innerHTML === emoji);
        if (swappedIntersection !== undefined) {
            spawnIdx = swappedIntersection;
        }

        let ir = Math.floor(spawnIdx / width), ic = spawnIdx % width;
        
        // Ha bombát teszünk le, a kisebb rakétákat felülírjuk abban az irányban
        powerupsToCreate = powerupsToCreate.filter(p => {
            let pr = Math.floor(p.index / width), pc = p.index % width;
            if ((pr === ir || pc === ic) && p.type !== 'bomb' && p.type !== 'colorbomb') return false;
            return true;
        });

        // Ha ezen a helyen még nincs Color Bomb, mehet a Bomba
	if (!powerupsToCreate.some(p => p.index === spawnIdx && p.type === 'colorbomb')) {
            powerupsToCreate.push({ index: spawnIdx, html: powerBombHTML, type: 'bomb' });
            processedBombColors.add(emoji);
            
            // --- ÚJ: JUTALOM A BOMBÁÉRT ---
            addScore(SCORE_VALUES.CREATE_BOMB);
        }
    });

// --- 4. ANIMÁCIÓ, ÜVEGTÖRÉS ÉS KIVÉGZÉS ---
    if (matchedIndices.size > 0 || powerupsToCreate.length > 0) {
        gameState = 'BUSY';
        activeProcesses++; 

        // 1. Lépés: Kivegyük a pukkanó listából azokat a helyeket, ahova powerup kerül
        powerupsToCreate.forEach(p => matchedIndices.delete(p.index));
        
        // 2. Lépés: AZONNAL beírjuk a powerupokat (Nem várunk vele, hogy a zuhanás ne rontsa el a helyét!)
        powerupsToCreate.forEach(p => { 
            if (squares[p.index]) {
                squares[p.index].innerHTML = p.html; 
                damageLayer(p.index); // Csak az üveget sebezzük
		addScore(SCORE_VALUES.GLASS_BREAK)
            }
        });

        // 3. Lépés: A többi találat kipukkasztása
        matchedIndices.forEach(idx => {
            popSquare(idx); 
        });

        setGameTimeout(() => {
            updateGoalUI();
            lastSwapped = []; 
            
            activeProcesses--; 
            
            // Csak akkor megyünk tovább, ha minden más folyamat is leállt
            if (activeProcesses <= 0) {
                activeProcesses = 0; 
                gameState = 'IDLE';  
                
                if (!moveDown()) {
                    checkWinCondition();
                }
            }
        }, 300); // Ez az időzítő most már csak a moveDown-t késlelteti, hogy lássuk a pukkanást
    } else {
        if (activeProcesses <= 0) {
            gameState = 'IDLE';
            checkWinCondition();
        }
    }
}

function moveDown() {
    if (gameState === 'LOCKED' || gameState === 'BUSY' || isPausedForWin) return false;

    let moved = false;
    let config = levelsConfig[currentLevel - 1];
    let cellSize = squares[0].getBoundingClientRect().height || 45;

    let drops = []; // A meglévő, lefelé eső cukrok
    let newCandies = []; // A legfelülre bedobott új cukrok

    // Oszloponként haladunk (0-tól 7-ig)
    for (let c = 0; c < width; c++) {
        let emptySpaces = 0;
        
        // Lentről felfelé vizsgáljuk a cellákat
        for (let r = 7; r >= 0; r--) {
            let i = r * width + c;
            
            if (squares[i].classList.contains('wall')) {
                emptySpaces = 0; // A fal megállítja a lepotyogást
            } else if (squares[i].innerHTML === '') {
                emptySpaces++;
            } else if (emptySpaces > 0) {
                let targetIdx = i + (emptySpaces * width);
                
                drops.push({
                    toIdx: targetIdx,
                    dropBy: emptySpaces
                });
                
                squares[targetIdx].innerHTML = squares[i].innerHTML;
                squares[i].innerHTML = '';
                moved = true;
            }
        }

        // Felső sorok feltöltése új cukrokkal
        for (let r = 0; r < 8; r++) {
            let i = r * width + c;
            if (squares[i].classList.contains('wall')) break; 
            
            if (squares[i].innerHTML === '') {
		let randomEmoji = Math.floor(Math.random() * currentActiveColors);
                newCandies.push({
                    idx: i,
                    dropBy: emptySpaces 
                });
                squares[i].innerHTML = candyEmojis[randomEmoji];
                moved = true;
            }
        }
    }

    if (!moved) return false;

    // --- ANIMÁCIÓ VÉGREHAJTÁSA ---
    activeProcesses++; // Jelezzük, hogy elindult egy zuhanási folyamat
    gameState = 'BUSY';

    // 1. Meglévő cukrok sima csúsztatása
    drops.forEach(drop => {
        let elem = squares[drop.toIdx];
	elem.classList.add('falling');
        elem.style.transition = 'none';
        elem.style.transform = `translateY(-${drop.dropBy * cellSize}px)`;
        
        void elem.offsetWidth; // Force reflow
        
        elem.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)';
        elem.style.transform = 'translateY(0)';
    });

    // 2. Új cukrok beejtése
    newCandies.forEach(candy => {
        let elem = squares[candy.idx];
        elem.style.transition = 'none';
        elem.style.transform = `translateY(-${(candy.dropBy + Math.floor(candy.idx / width) + 1) * cellSize}px)`;
        
        void elem.offsetWidth; // Force reflow
        
        elem.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)';
        elem.style.transform = 'translateY(0)';
    });

    // 3. Takarítás az animáció végén
    setGameTimeout(() => {
        drops.forEach(drop => { 
            squares[drop.toIdx].style.transition = ''; 
            squares[drop.toIdx].style.transform = ''; 
	    squares[drop.toIdx].classList.remove('falling');
        });
        newCandies.forEach(candy => { 
            squares[candy.idx].style.transition = ''; 
            squares[candy.idx].style.transform = '';
	    squares[candy.idx].classList.remove('falling');
        });
        
        activeProcesses--; // Ez a folyamat befejeződött
        
        if (activeProcesses <= 0) {
            activeProcesses = 0;
            gameState = 'IDLE';
            if (!isPausedForWin) checkMatches(); 
        }
    }, 450);

    return true;
}