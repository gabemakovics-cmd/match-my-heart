// --- DEBUG MOD: Powerupok idézése teszteléshez ---
let hoveredSquareId = null;

window.addEventListener('keydown', (e) => {
    if (hoveredSquareId === null) return;

    if (e.key === '1') {
        // 1-es gomb: Vízszintes rakéta
        squares[hoveredSquareId].innerHTML = powerHorizHTML;
        console.log("Debug: Vízszintes rakéta idézve a(z) " + hoveredSquareId + " helyre.");
    } 
    else if (e.key === '2') {
        // 2-es gomb: Függőleges rakéta
        squares[hoveredSquareId].innerHTML = powerVertHTML;
        console.log("Debug: Függőleges rakéta idézve a(z) " + hoveredSquareId + " helyre.");
    } 
    else if (e.key === '3') {
        // 3-as gomb: Bomba
        squares[hoveredSquareId].innerHTML = powerBombHTML;
        console.log("Debug: Bomba idézve a(z) " + hoveredSquareId + " helyre.");
    }
    else if (e.key === '4') {
	squares[hoveredSquareId].innerHTML = powerColorBombHTML;
        console.log("Debug: ColorBomb idézve a(z) " + hoveredSquareId + " helyre.");
    }
    else if (e.key === '0') {
        // 0-ás gomb: Pontszám növelése (hogy lásd a Valentin-napi képernyőt)
        score += 10;
        scoreDisplay.innerHTML = score;
        checkWinCondition();
    }
});