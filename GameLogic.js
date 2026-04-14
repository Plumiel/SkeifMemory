// GameLogic.js - I just cooked some buuullshit

//Notes to self:
// state --> 0 = face down, 1 = face up, 2 = matched
// buffer keeps track of the last 4 flipped tiles... 

const icons = [
    'PawOutline.png', 'PawBlack.png', 'PawRed.png',
    'StarOutline.png', 'StarBlack.png', 'StarRed.png',
    'EyeOutline.png', 'EyeBlack.png', 'EyeRed.png',
    'EggOutline.png', 'EggBlack.png', 'EggRed.png'
];
let deck = [...icons, ...icons].sort(() => Math.random() - 0.5);
let boardData = deck.map((symbol, id) => ({ id, symbol, state: 0 }));

let buffer = []; 
let firstTile = null; //First pick.
let isPlayerTurn = true; //If false, it's Aya's turn
let lockBoard = false;
let playerScore = 0; //1 pair -> 1 score... I don't think I'll need an array.
let ayaScore = 0;

const boardElement = document.getElementById('game-board');
const statusElement = document.getElementById('turn-indicator');
//const memoryElement = document.getElementById('buffer-display'); //debug, kill this

function createBoard() {
    boardElement.innerHTML = '';
    boardData.forEach(tile => {
        const tileDiv = document.createElement('div');
        tileDiv.classList.add('tile');
        tileDiv.dataset.id = tile.id;
        
        tileDiv.addEventListener('click', () => onTileClick(tile.id)); 
        
        tileDiv.innerHTML = `
            <div class="tile-front">
                <img src="Pieces/FrontPiece.png" class="tile-layer base-layer">
                <img src="Pieces/${tile.symbol}" class="symbol-img"> 
            </div>
            <div class="tile-back">
                <img src="Pieces/BackPiece.png" class="tile-layer">
            </div>`;
        boardElement.appendChild(tileDiv);
    });
}

function collectTile(symbol, zoneId) {
    const zone = document.getElementById(zoneId);
    const collectionTile = document.createElement('div');
    collectionTile.classList.add('collection-tile');
    
    collectionTile.innerHTML = `
        <img src="Pieces/FrontPiece.png" class="tile-layer base-layer">
        <img src="Pieces/${symbol}" class="symbol-img">`; 
    zone.appendChild(collectionTile);
}

//------- PLAYER LOGIC ----------

function onTileClick(id) {
    if (!isPlayerTurn || lockBoard || boardData[id].state !== 0) return;
    flip(id);
}

function flip(id) {
    const tileElement = document.querySelector(`[data-id="${id}"]`);
    tileElement.classList.add('flip');
    boardData[id].state = 1;

    updateBuffer(id, boardData[id].symbol);

    if (firstTile == null) {
        firstTile = id;
    } else {
        checkMatch(id);
    }
    console.log(firstTile)
}

function updateBuffer(id, symbol) {
    if (!buffer.find(i => i.id == id)) {
        buffer.unshift({ id, symbol });
        if (buffer.length > 4) buffer.pop();
    }
    //viewBuffer();
}

/*function viewBuffer() {
    memoryElement.innerText = `Memory: ${buffer.map(i => `${i.symbol} (#${i.id})`).join(' | ')}`;
}*/

function checkMatch(secondTile) {
    lockBoard = true;
    const first = boardData[firstTile];
    const second = boardData[secondTile];

    if (first.symbol == second.symbol) {
        setTimeout(() => {
            document.querySelector(`[data-id="${firstTile}"]`).classList.add('matched');
            document.querySelector(`[data-id="${secondTile}"]`).classList.add('matched');
            first.state = 2;
            second.state = 2;

            const winnerZoneId = isPlayerTurn ? 'player-tiles' : 'aya-tiles';
            collectTile(first.symbol, winnerZoneId);

            buffer = buffer.filter(c => c.symbol !== first.symbol);
            if (isPlayerTurn) { playerScore++; } else { ayaScore++; }
            nextTurn();
        }, 1000);
    } else {
        setTimeout(() => {
            document.querySelector(`[data-id="${firstTile}"]`).classList.remove('flip');
            document.querySelector(`[data-id="${secondTile}"]`).classList.remove('flip');
            first.state = 0;
            second.state = 0;
            nextTurn();
        }, 1500);
    }
}

function nextTurn() {
    if (boardData.every(c => c.state === 2)) {
        statusElement.innerText = `Game Over! ${playerScore > ayaScore ? "You win!" : playerScore < ayaScore ? "Aya wins!" : "It's a tie!"}`;
        return;
    }
    firstTile = null;
    isPlayerTurn = !isPlayerTurn;
    lockBoard = false;
    statusElement.innerText = isPlayerTurn ? "Your Turn!" : "Aya is thinking...";
    if (!isPlayerTurn) setTimeout(ayaTurn, 1000);
}

//------- AYA'S LOGIC ----------

function ayaTurn() {
    if (isPlayerTurn) return;

    const matchInBuffer = scoutBuffer();
    
    //This checks if buffer has match -- it means Aya selected one, failed, then the player piqued the missing piece.
    let chance = Math.floor(Math.random() * 101);
    if (matchInBuffer != null && chance <= 50) { //50% she remembers it!
        ayaFlip(matchInBuffer.idA);
        setTimeout(() => ayaFlip(matchInBuffer.idB), 800);
    } else {
        const randomPicks = boardData.filter(c => c.state == 0).map(c => c.id);
        const firstPick = randomPicks[Math.floor(Math.random() * randomPicks.length)];
        ayaFlip(firstPick); //No match in buffer, she picks at random.

        setTimeout(() => {

            if (lockBoard) return;

            //After the first pick, she checks the buffer again. 
            const isSymbolThere = boardData[firstPick].symbol;
            const bufferIndex = buffer.findIndex(c => c.symbol === isSymbolThere && c.id !== firstPick);

            if (bufferIndex !== -1) {
                if (bufferIndex == 1) {
                    //If the picked tile is the last flip by player...
                    ayaFlip(buffer[bufferIndex].id);
                } else {
                    //Symbol is at 3 or 4, which makes it harder for her to remember.
                    let percentage = Math.floor(Math.random() * 101);
                    if (percentage <= 25) {
                        ayaFlip(buffer[bufferIndex].id);
                    } else {
                        buffer.pop(); // Machine loses the old memories 11!!!!!!!!! Loookike
                        buffer.pop(); // try splice later
                        pickRandomSecond(firstPick);
                    }
                }
            } else {
                pickRandomSecond(firstPick);
            }
        }, 1000);
    }
}

function scoutBuffer() {
    for (let i = 0; i < buffer.length; i++) {
        for (let j = i + 1; j < buffer.length; j++) {
            if (buffer[i].symbol === buffer[j].symbol) {
                return { idA: buffer[i].id, 
                            idB: buffer[j].id };
            }
        }
    }
    return null;
}

function pickRandomSecond(excludeId) {
    const randomPick = boardData.filter(c => c.state === 0 && c.id !== excludeId).map(c => c.id);
    const secondPick = randomPick[Math.floor(Math.random() * randomPick.length)];
    ayaFlip(secondPick);
}

function ayaFlip(id) {
    const tileElement = document.querySelector(`[data-id="${id}"]`);
    tileElement.classList.add('flip');
    boardData[id].state = 1;
    updateBuffer(id, boardData[id].symbol);
    if (firstTile == null) { 
        firstTile = id; 
    } else { 
        checkMatch(id); 
    }
}

createBoard();