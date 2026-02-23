    let draggedSquare = null;
    let targetSquare = null;
    let startX = 0, startY = 0;
    let dragDirection = null;

function handlePointerDown(e) {
    if (gameState === 'LOCKED') return;

    // --- BOOSTEREK: Azonnali elkapás minden cellatípusnál ---
    if (activeBooster) {
        const idx = parseInt(this.id);
        const isWall = this.classList.contains('wall');
        
        // JAVÍTÁS: Csak akkor tekintjük tényleg üresnek a mezőt, ha nem is fal!
        const isEmpty = this.innerHTML === '' && !isWall;

        // Az üres levegőt nem üthetjük és nem cserélhetjük
        if (isEmpty && (activeBooster === 'hammer' || activeBooster === 'freeSwap')) return;
        
        // A falat nem cserélhetjük (de a kalapácsot most már ráengedjük!)
        if (isWall && activeBooster === 'freeSwap') return;

        const currentBoosterType = activeBooster;

        if (!isNaN(idx)) {
            // Ha FreeSwap, ne vonjuk le azonnal, csak jelöljük be az ingyenességet!
            if (currentBoosterType === 'freeSwap') {
                isNextSwapFree = true; 
            } else {
                executeBoosterEffect(idx);
                return; // A kalapács itt megállítja a fv-t, miután lefutott
            }
        }

        if (currentBoosterType !== 'freeSwap') {
            return; 
        }
    }

    // --- NORMÁL JÁTÉKMENET SZŰRŐI ---
    // Ide már csak akkor jutunk, ha nincs aktív booster. 
    // Itt marad az üres/fal/esés tiltása a húzáshoz.
    if (this.innerHTML === '' || this.classList.contains('wall') || this.classList.contains('falling')) return;

    draggedSquare = this;
    startX = e.clientX;
    startY = e.clientY;
    dragDirection = null;
    
    draggedSquare.classList.add('active-candy');
    draggedSquare.classList.remove('snap-back');
    draggedSquare.style.transform = 'scale(1.05)';
    draggedSquare.setPointerCapture(e.pointerId);
}

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
    document.addEventListener('pointercancel', handlePointerUp);

function handlePointerMove(e) {
    if (!draggedSquare || gameState === 'LOCKED') return;

    let diffX = e.clientX - startX;
    let diffY = e.clientY - startY;

    // Lekérjük a cella aktuális méretét (telefonon ez már nem 70px lesz!)
    let currentCellSize = draggedSquare.getBoundingClientRect().width;

    if (!dragDirection && (Math.abs(diffX) > 5 || Math.abs(diffY) > 5)) {
        if (Math.abs(diffX) > Math.abs(diffY)) dragDirection = 'x';
        else dragDirection = 'y';
    }

    if (!dragDirection) return;

    let moveX = 0, moveY = 0;
    let id = parseInt(draggedSquare.id);

    // 1. Dinamikus határok beállítása a cella aktuális mérete alapján
    let minX = (id % width === 0) ? 0 : -currentCellSize;
    let maxX = (id % width === width - 1) ? 0 : currentCellSize;
    let minY = (id < width) ? 0 : -currentCellSize;
    let maxY = (id >= 56) ? 0 : currentCellSize;

    // 2. FAL-ÜTKÖZÉS: Ha a szomszéd fal, lezárjuk az irányt
    if (maxX !== 0 && squares[id + 1] && squares[id + 1].classList.contains('wall')) maxX = 0;
    if (minX !== 0 && squares[id - 1] && squares[id - 1].classList.contains('wall')) minX = 0;
    if (maxY !== 0 && squares[id + width] && squares[id + width].classList.contains('wall')) maxY = 0;
    if (minY !== 0 && squares[id - width] && squares[id - width].classList.contains('wall')) minY = 0;

    // 3. Mozgás kiszámítása
    if (dragDirection === 'x') moveX = Math.max(minX, Math.min(maxX, diffX));
    else if (dragDirection === 'y') moveY = Math.max(minY, Math.min(maxY, diffY));

    // EXTRA KORLÁT: Ne engedjük a cellaméretnél tovább húzni
    if (Math.abs(moveX) > currentCellSize) moveX = (moveX > 0 ? currentCellSize : -currentCellSize);
    if (Math.abs(moveY) > currentCellSize) moveY = (moveY > 0 ? currentCellSize : -currentCellSize);

    draggedSquare.style.transform = `translate(${moveX}px, ${moveY}px) scale(1.05)`;
    draggedSquare.style.zIndex = 100;

    if (targetSquare) {
        targetSquare.style.transform = '';
        targetSquare.style.zIndex = '';
    }
    targetSquare = null;

    // 4. Célpont meghatározása
    if (dragDirection === 'x') {
        if (moveX > 0 && id % width < width - 1) targetSquare = squares[id + 1];
        else if (moveX < 0 && id % width > 0) targetSquare = squares[id - 1];
    } else if (dragDirection === 'y') {
        if (moveY > 0 && id < 56) targetSquare = squares[id + width];
        else if (moveY < 0 && id >= width) targetSquare = squares[id - width];
    }

    // 5. Célpont animálása (dinamikus mérettel)
    if (targetSquare) {
        targetSquare.style.zIndex = 50;
        let targetMoveX = 0, targetMoveY = 0;

        // A szomszéd pontosan ellentétesen mozogjon
        if (dragDirection === 'x') targetMoveX = -moveX;
        else if (dragDirection === 'y') targetMoveY = -moveY;

        targetSquare.style.transform = `translate(${targetMoveX}px, ${targetMoveY}px)`;
    }
}


function handlePointerUp(e) {
    if (!draggedSquare) return;

    draggedSquare.classList.remove('active-candy');
    draggedSquare.releasePointerCapture(e.pointerId);

    let transformStr = draggedSquare.style.transform;
    let draggedFarEnough = false;

    let currentCellSize = draggedSquare.getBoundingClientRect().width;
    let dragThreshold = currentCellSize / 2;

    if (transformStr) {
        let matches = transformStr.match(/translate\(([-\d.]+)px, ([-\d.]+)px\)/);
        if (matches) {
            if (Math.abs(parseFloat(matches[1])) > dragThreshold || Math.abs(parseFloat(matches[2])) > dragThreshold) {
                draggedFarEnough = true;
            }
        }
    }

    let draggedHTML = draggedSquare.innerHTML;
    let isDraggedHoriz = draggedHTML.includes('power-bg-h');
    let isDraggedVert = draggedHTML.includes('power-bg-v');
    let isDraggedBomb = draggedHTML.includes('power-bg-bomb');
    let isDraggedColorBomb = draggedHTML.includes('power-bg-colorbomb');
    let isDraggedPowerup = isDraggedHoriz || isDraggedVert || isDraggedBomb || isDraggedColorBomb;

    // 1. HA NEM HÚZTA ELÉG MESSZE (Csak rákattintott)
    if (!draggedFarEnough) {
        if (isDraggedPowerup) {
            resetTransforms();
            deductMove();
            let type = isDraggedColorBomb ? 'colorbomb' : (isDraggedBomb ? 'bomb' : (isDraggedHoriz ? 'horiz' : 'vert'));
            triggerExplosion(parseInt(draggedSquare.id), type, null);
            if (typeof movesDisplay !== 'undefined') movesDisplay.innerHTML = movesLeft;
            clearDragVars();
            return;
        }
	// --- JAVÍTÁS: Ha FreeSwap volt aktív, de nem húzott, akkor deaktiváljuk! ---
        else if (activeBooster === 'freeSwap') {
            cancelBooster();
            isNextSwapFree = false; // Kikapcsoljuk az ingyenességet is
        }
    }

    // 2. HA ELÉG MESSZE HÚZTA ÉS VAN CÉLPONT
    if (draggedFarEnough && targetSquare) {
        let targetHTML = targetSquare.innerHTML;
        let isTargetHoriz = targetHTML.includes('power-bg-h');
        let isTargetVert = targetHTML.includes('power-bg-v');
        let isTargetBomb = targetHTML.includes('power-bg-bomb');
        let isTargetColorBomb = targetHTML.includes('power-bg-colorbomb');
        let isTargetPowerup = isTargetHoriz || isTargetVert || isTargetBomb || isTargetColorBomb;

        let draggedType = isDraggedColorBomb ? 'colorbomb' : (isDraggedBomb ? 'bomb' : (isDraggedHoriz ? 'horiz' : 'vert'));
        let targetType = isTargetColorBomb ? 'colorbomb' : (isTargetBomb ? 'bomb' : (isTargetHoriz ? 'horiz' : 'vert'));

        // A: POWERUP KOMBÓ (Mindkettő az)
        if (isDraggedPowerup && isTargetPowerup) {
            resetTransforms();
            deductMove();

	    if (activeBooster === 'freeSwap') {
                executeBoosterEffect(parseInt(targetSquare.id));
            }

            lastSwapped = [parseInt(draggedSquare.id), parseInt(targetSquare.id)];

            damageLayer(lastSwapped[0]); 
            damageLayer(lastSwapped[1]);

            draggedSquare.innerHTML = ''; 
            targetSquare.innerHTML = ''; 

            triggerCombo(parseInt(targetSquare.id), draggedType, targetType);
            if (typeof movesDisplay !== 'undefined') movesDisplay.innerHTML = movesLeft;
            
            clearDragVars();
            return;
        } 
        // B: SZIMPLA POWERUP AKTIVÁLÁS (Csak az egyik az)
        else if (isDraggedPowerup || isTargetPowerup) {
            resetTransforms();
            deductMove();

	    if (activeBooster === 'freeSwap') {
                executeBoosterEffect(parseInt(targetSquare.id));
            }

            draggedSquare.innerHTML = targetHTML;
            targetSquare.innerHTML = draggedHTML;
            
            if (isDraggedColorBomb) triggerExplosion(parseInt(targetSquare.id), 'colorbomb', targetHTML);
            else if (isDraggedPowerup) triggerExplosion(parseInt(targetSquare.id), draggedType);
            
            if (isTargetColorBomb) triggerExplosion(parseInt(draggedSquare.id), 'colorbomb', draggedHTML);
            else if (isTargetPowerup) triggerExplosion(parseInt(draggedSquare.id), targetType);

            if (typeof movesDisplay !== 'undefined') movesDisplay.innerHTML = movesLeft;
            
            clearDragVars();
            return;
        }

        // C: NORMÁL CUKORKA CSERE
        draggedSquare.innerHTML = targetHTML;
        targetSquare.innerHTML = draggedHTML;

        let draggedIdx = parseInt(draggedSquare.id);
        let targetIdx = parseInt(targetSquare.id);

        // ÚJ: Csak ezt a két helyet nézzük meg!
        if (isSquareInMatch(draggedIdx) || isSquareInMatch(targetIdx) || isNextSwapFree) {
            lastSwapped = [draggedIdx, targetIdx];
            resetTransforms();
            deductMove();

	    if (activeBooster === 'freeSwap') {
                executeBoosterEffect(draggedIdx); 
            }

            if (typeof movesDisplay !== 'undefined') movesDisplay.innerHTML = movesLeft;
            
            clearDragVars();
            checkMatches();
        } else {
            // VISSZAPATTANÁS (Érvénytelen csere)
            draggedSquare.innerHTML = draggedHTML;
            targetSquare.innerHTML = targetHTML;
            
            gameState = 'BUSY';
            activeProcesses++;

            draggedSquare.classList.add('snap-back');
            targetSquare.classList.add('snap-back');
            draggedSquare.style.transform = 'translate(0px, 0px)';
            targetSquare.style.transform = 'translate(0px, 0px)';

            setGameTimeout(() => {
                draggedSquare.classList.remove('snap-back');
                targetSquare.classList.remove('snap-back');
                resetTransforms();
                
                activeProcesses--;
                if (activeProcesses <= 0) {
                    activeProcesses = 0;
                    gameState = 'IDLE';
                }
                
                clearDragVars();
            }, 200); 
        }
    } else {
        // HA NEM VOLT ÉRVÉNYES HÚZÁS, VISSZAPATTAN
        gameState = 'BUSY';
        activeProcesses++;

        draggedSquare.classList.add('snap-back');
        if (targetSquare) targetSquare.classList.add('snap-back');
        draggedSquare.style.transform = 'translate(0px, 0px)';
        if (targetSquare) targetSquare.style.transform = 'translate(0px, 0px)';

	if (activeBooster === 'freeSwap') {
            cancelBooster();
            isNextSwapFree = false; 
        }
        
        setGameTimeout(() => {
            if (draggedSquare) draggedSquare.classList.remove('snap-back');
            if (targetSquare) targetSquare.classList.remove('snap-back');
            resetTransforms();
            
            activeProcesses--;
            if (activeProcesses <= 0) {
                activeProcesses = 0;
                gameState = 'IDLE';
            }
            
            clearDragVars();
        }, 200);
    }
}

    function resetTransforms() {
        if (draggedSquare) { draggedSquare.style.transform = ''; draggedSquare.style.zIndex = ''; }
        if (targetSquare) { targetSquare.style.transform = ''; targetSquare.style.zIndex = ''; }
    }

    function clearDragVars() {
        draggedSquare = null;
        targetSquare = null;
        dragDirection = null;
    }


function checkIfValidMatch() {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 6; c++) {
                let i = r * width + c;
                let emoji = squares[i].innerHTML;
                if (emoji === '' || emoji.includes('power-bg-h') || emoji.includes('power-bg-v') || emoji.includes('power-bg-bomb')) continue;
                let matchLength = 1;
                while (c + matchLength < 8 && squares[i + matchLength].innerHTML === emoji) matchLength++;
                if (matchLength >= 3) return true;
            }
        }
        for (let c = 0; c < 8; c++) {
            for (let r = 0; r < 6; r++) {
                let i = r * width + c;
                let emoji = squares[i].innerHTML;
                if (emoji === '' || emoji.includes('power-bg-h') || emoji.includes('power-bg-v') || emoji.includes('power-bg-bomb')) continue;
                let matchLength = 1;
                while (r + matchLength < 8 && squares[i + matchLength * width].innerHTML === emoji) matchLength++;
                if (matchLength >= 3) return true;
            }
        }
        return false;
    }

    function calculatePoints(matchLength) {
        if (matchLength === 3) return 3;
        if (matchLength >= 4) return 5;
        return 0;
    }

function isSquareInMatch(idx) {
    let emoji = squares[idx].innerHTML;
    // Ha üres vagy powerup, az nem számít normál match-nek
    if (emoji === '' || emoji.includes('power-bg-') || squares[idx].classList.contains('wall')) return false;

    let r = Math.floor(idx / width);
    let c = idx % width;

    // 1. Vízszintes ellenőrzés (balra + jobbra)
    let hCount = 1;
    // Megszámoljuk hány azonos van balra
    let checkC = c - 1;
    while (checkC >= 0 && squares[r * width + checkC].innerHTML === emoji) {
        hCount++;
        checkC--;
    }
    // Megszámoljuk hány azonos van jobbra
    checkC = c + 1;
    while (checkC < width && squares[r * width + checkC].innerHTML === emoji) {
        hCount++;
        checkC++;
    }
    if (hCount >= 3) return true;

    // 2. Függőleges ellenőrzés (fel + le)
    let vCount = 1;
    // Megszámoljuk hány azonos van fel
    let checkR = r - 1;
    while (checkR >= 0 && squares[checkR * width + c].innerHTML === emoji) {
        vCount++;
        checkR--;
    }
    // Megszámoljuk hány azonos van le
    checkR = r + 1;
    while (checkR < 8 && squares[checkR * width + c].innerHTML === emoji) {
        vCount++;
        checkR++;
    }
    if (vCount >= 3) return true;

    return false;
}

function deductMove() {
    if (isNextSwapFree) {
        isNextSwapFree = false;
        
        const movesBox = document.querySelector('.moves-box');
        if (movesBox) {
            // 1. Kinyitjuk a lakatot
            movesBox.classList.add('unlocking');
            
            // 2. Egy extra villanás a doboznak (sikerélmény!)
            movesBox.style.borderColor = "#2ecc71"; // Zöld villanás (siker)
            
            // 3. Megvárjuk a lassabb animációt (0.7 másodperc)
            setTimeout(() => {
                movesBox.classList.remove('locked-status');
                movesBox.classList.remove('unlocking');
                movesBox.style.borderColor = ""; // Visszaáll az eredeti keret
            }, 700); 
        }
        return; 
    }
    // ... normál menet ...
    movesLeft--;
    if (movesDisplay) movesDisplay.innerHTML = movesLeft;
    needsSaving = true;
}