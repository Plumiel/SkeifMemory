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
const bufferLimit = 6; //Change this to increase or decrease buffer... CHANGE CHANCE LOGIC TO ADAPT IT.

let firstTile = null; //First pick.
let isPlayerTurn = true; //If false, it's Aya's turn
let lockBoard = false;
let playerScore = 0; //1 pair -> 1 score... I don't think I'll need an array.
let ayaScore = 0;
let turnCounter = 0;

const boardElement = document.getElementById('game-board');
const statusElement = document.getElementById('turn-indicator');
const memoryElement = document.getElementById('buffer-display'); //debug, kill this
const menuElement = document.getElementById('menu-zone');
const turnIndicator = document.getElementById('turn-indicator');
const rewardIndicator = document.getElementById('reward-indicator');
const collectionElement = document.querySelectorAll('.collection-grid');


function startGame() {
    //Maybe some logic to lock into the game?
    menuElement.classList.add('hidden');
    collectionElement.forEach(c => c.style.visibility = 'visible');
    turnIndicator.style.display = 'block';
    createBoard();
    pickFirstTurn();
}

function rewardRoll(){
    //Reward Logic goes here
    let reward_name = "a kiss on the forehead";
    //--
    if(playerScore > ayaScore){
        rewardIndicator.innerText = `You got: ${reward_name}`;
    }else if(playerScore == ayaScore){
        rewardIndicator.innerText = `You got: ${reward_name}`;
    }
    rewardIndicator.style.display = 'block';

    return;
}

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

function pickFirstTurn() {
    isPlayerTurn = Math.random() < 0.5;
    statusElement.innerText = isPlayerTurn ? "Your Turn!" : "Aya goes first!";
    if (!isPlayerTurn) setTimeout(ayaTurn, 1000);
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
        if (buffer.length > bufferLimit) buffer.pop();
    }
    viewBuffer();
}

function viewBuffer() {
    memoryElement.innerText = `Memory: ${buffer.map(i => `${i.symbol} (#${i.id})`).join(' | ')}`;
}

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
            buffer.pop(); //Maybe?¿?¿?¿?¿?¿?¿?¿?¿ I should add buffer position tracking to the debugger.
            if (isPlayerTurn) { playerScore++; } else { ayaScore++; }
            nextTurn(true);
        }, 1000);
    } else {
        setTimeout(() => {
            document.querySelector(`[data-id="${firstTile}"]`).classList.remove('flip');
            document.querySelector(`[data-id="${secondTile}"]`).classList.remove('flip');
            first.state = 0;
            second.state = 0;
            nextTurn(false);
        }, 1500);
    }
}

function nextTurn(gotPair) {
    if (boardData.every(c => c.state === 2)) {
        statusElement.innerText = `Game Over! ${playerScore > ayaScore ? "You win!" : playerScore < ayaScore ? "Aya wins!" : "It's a tie!"}`;
        rewardRoll();
        return;
    }
    firstTile = null;
    if (gotPair && turnCounter < 1) { 
        turnCounter++;
        console.log(`--Increasing turn counter! (${turnCounter})`);
    }else{
        isPlayerTurn = !isPlayerTurn;
        turnCounter = 0;
    }
    lockBoard = false;
    statusElement.innerText = isPlayerTurn ? "Your Turn!" : "Aya is thinking...";
    if (!isPlayerTurn) setTimeout(ayaTurn, 1000);
}

//------- AYA'S LOGIC ----------

function ayaTurn() {
    if (isPlayerTurn) return;

    const matchInBuffer = scoutBuffer();

    //Complete roll
    if (matchInBuffer != null) { 
        ayaFlip(matchInBuffer.idA);
        setTimeout(() => ayaFlip(matchInBuffer.idB), 800);
    } else {
        const randomPicks = boardData.filter(c => c.state == 0).map(c => c.id);
        const firstPick = randomPicks[Math.floor(Math.random() * randomPicks.length)];
        ayaFlip(firstPick); //No match in buffer, she picks at random.
        console.log(`--Aya picked a random first!`);

        setTimeout(() => {

            if (lockBoard) return;

            const secondMatch = scoutBuffer();
            if (secondMatch != null && secondMatch.idA == firstPick) {
                ayaFlip(secondMatch.idB);
            } else {
                pickRandomSecond(firstPick);
                console.log(`--Aya picked a random second!`);
            }
                
        }, 1000);
    }
}

function scoutBuffer(){
    let idA, idB = null; 
    let closest, farthest = 0;
    let chance = Math.floor(Math.random() * 101);
    for (let i = 0; i < buffer.length; i++) {
        for (let j = i + 1; j < buffer.length; j++) {
            if (buffer[i].symbol === buffer[j].symbol && buffer[i].id !== buffer[j].id) {
                idA = buffer[i].id;
                idB = buffer[j].id;
                farthest = j;
                closest = i;
            }
        }
    }

    if(closest > 0 ){
        chance = chance + 20; //Reduces the chances to match if the tile wasn't just picked. 
        console.log(`-- Reduced!`)
    } 
    if(idA != null && idB != null){
        console.log(`(Chance: ${chance} | Farthest: ${farthest} | Result: ${100 - (farthest * 15)})`);
        if(chance <= 100 - (farthest * 15)){ //Ex. If it's on position 5 -> 100 - (5*15) = 25% chance 
            console.log(`-- Did it!`);
            return { idA, idB };
        }
    }else{
        return null;
    }
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

//startGame();
