// GameLogic.js - I just cooked some buuullshit

//Notes to self:
// state --> 0 = face down, 1 = face up, 2 = matched

import { loadPictures, changeExpression } from "./NPCHandler.js";

const vault_param = 'tavern_vault';
const active_param = 'tavern_active';
const icons = [
    'PawOutline.png', 'PawBlack.png', 'PawRed.png',
    'StarOutline.png', 'StarBlack.png', 'StarRed.png',
    'EyeOutline.png', 'EyeBlack.png', 'EyeRed.png',
    'EggOutline.png', 'EggBlack.png', 'EggRed.png'
];
const song = new Audio('./Pieces/Loop_Rejoicing.wav');
song.volume = 0.05;
// https://opengameart.org/content/medieval-rejoicing
const tileFlipSound = new Audio('./Pieces/TileFlip1.wav');
tileFlipSound.volume = 0.2;
// https://freesound.org/people/poenia/sounds/745030/

const vault = decryptState(localStorage.getItem(vault_param));
let boardData;
if(vault && vault.boardData){
    boardData = vault.boardData;
}else{
    let deck = [...icons, ...icons].sort(() => Math.random() - 0.5);
    boardData = deck.map((symbol, id) => ({ id, symbol, state: 0 }));
}

let playerScore = vault ? vault.playerScore : 0;
let ayaScore = vault ? vault.ayaScore : 0;
let isPlayerTurn = vault ? vault.isPlayerTurn : true;
let buffer = vault ? vault.buffer : [];
let firstTile = vault ? vault.firstTile : null;
let turnCounter = vault ? vault.turnCounter : 0;


const bufferLimit = 6; //Change this to increase or decrease buffer... CHANGE CHANCE LOGIC TO ADAPT IT.
let lockBoard = isPlayerTurn ? false : true;

const boardElement = document.getElementById('game-board');
const statusElement = document.getElementById('turn-indicator');
const menuElement = document.getElementById('menu-zone');
const turnIndicator = document.getElementById('turn-indicator');
const rewardIndicator = document.getElementById('reward-indicator');
const collectionElement = document.querySelectorAll('.collection-grid');

function saveGameState() {
    const fullState = {
        boardData,
        playerScore,
        ayaScore,
        isPlayerTurn,
        buffer,
        firstTile,
        turnCounter
    };
    
    localStorage.setItem(vault_param, encryptState(fullState));
    localStorage.setItem(active_param, 'true');
}

function startGame() {
    menuElement.classList.add('hidden');
    collectionElement.forEach(c => c.style.visibility = 'visible');
    turnIndicator.style.display = 'block';
    loadPictures();
    createBoard();
    song.loop = true;
    song.play();

if(localStorage.getItem(active_param)){
        statusElement.innerText = isPlayerTurn ? "Your Turn!" : "Aya is thinking...";
        rebuildCollections(); 
        
        const activeTiles = boardData.filter(t => t.state === 1);

        if (activeTiles.length >= 2) {
            const secondTile = activeTiles.find(t => t.id !== firstTile);
            if (secondTile) {
                lockBoard = true;
                setTimeout(() => checkMatch(secondTile.id), 1000); 
            }
        } 
        else if (!isPlayerTurn) {
            if (firstTile !== null) {
                setTimeout(ayaResumeSecondPick, 1200);
            } else {
                setTimeout(ayaTurn, 1200);
            }
        }
    } else {
        pickFirstTurn();
        saveGameState();
    }
}

function ayaResumeSecondPick() {
    if (isPlayerTurn) return;
    
    const match = scoutBuffer();
    if (match != null && (match.idA == firstTile || match.idB == firstTile)) {
        const pick = (match.idA == firstTile) ? match.idB : match.idA;
        ayaFlip(pick);
    } else {
        pickRandomSecond(firstTile);
    }
}

function rebuildCollections() {
    const matchedTiles = boardData.filter(t => t.state === 2);
    
    let ayaRecovered = 0;
    let playerRecovered = 0;

    const uniqueSymbols = [...new Set(matchedTiles.map(t => t.symbol))];
    
    uniqueSymbols.forEach(symbol => {
        if (ayaRecovered < ayaScore) {
            collectTile(symbol, 'aya-tiles');
            ayaRecovered++;
        } else {
            collectTile(symbol, 'player-tiles');
            playerRecovered++;
        }
    });
}

function encryptState(data) {
    const jsonString = JSON.stringify(data);
    return btoa(jsonString).split('').reverse().join('');
}

function decryptState(scrambled) {
    try {
        if (!scrambled) return null;
        const reversed = scrambled.split('').reverse().join('');
        return JSON.parse(atob(reversed));
    } catch (e) {
        return null;
    }
}

function rewardRoll(){
    //------ Reward Logic goes here (?) ------
    let reward1_name = "one TRILLION lost eggs";
    let reward2_name = "one THOUSAND lost eggs";
    //-----------------------------------------
    if(playerScore > ayaScore){
        rewardIndicator.innerText = `You got: ${reward1_name} !`;
    }else if(playerScore == ayaScore){
        rewardIndicator.innerText = `You got: ${reward2_name} !`;
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

        if (tile.state === 1) tileDiv.classList.add('flip');
        if (tile.state === 2) tileDiv.classList.add('matched');
        
        tileDiv.addEventListener('click', () => onTileClick(tile.id)); 
        
        tileDiv.innerHTML = `
            <div class="tile-front">
                <img src="./Pieces/FrontPiece.png" class="tile-layer base-layer">
                <img src="./Pieces/${tile.symbol}" class="symbol-img"> 
            </div>
            <div class="tile-back">
                <img src="./Pieces/BackPiece.png" class="tile-layer">
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
        <img src="./Pieces/FrontPiece.png" class="tile-layer base-layer">
        <img src="./Pieces/${symbol}" class="symbol-img">`; 
    zone.appendChild(collectionTile);
}

//------- PLAYER LOGIC ----------

function onTileClick(id) {
    if (!isPlayerTurn || lockBoard || boardData[id].state !== 0) return;
    flip(id);
}

function flip(id) {
    const tileElement = document.querySelector(`[data-id="${id}"]`);
    tileFlipSound.play();
    tileElement.classList.add('flip');
    boardData[id].state = 1;

    updateBuffer(id, boardData[id].symbol);

    if (firstTile == null) {
        firstTile = id;
    } else {
        checkMatch(id);
    }
    console.log(firstTile)
    saveGameState();
}

function updateBuffer(id, symbol) {
    if (!buffer.find(i => i.id == id)) {
        buffer.unshift({ id, symbol });
        if (buffer.length > bufferLimit) buffer.pop();
    }
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
            saveGameState();

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
        localStorage.clear();
        if(playerScore > ayaScore) changeExpression("defeat");
        if(playerScore < ayaScore) changeExpression("win");
        song.pause();
        return;
    }

    if(playerScore > ayaScore){
        changeExpression("angry");
        console.log(`--Changed expression to angry!`);
    }else{
        changeExpression("happy");

    }

    console.log(`Player Score: ${playerScore} | Aya Score: ${ayaScore}`);
    firstTile = null;
    if (gotPair && turnCounter < 1) { 
        turnCounter++;
        console.log(`--Increasing turn counter! (${turnCounter})`);
    }else{
        isPlayerTurn = !isPlayerTurn;
        saveGameState();
        turnCounter = 0;
    }

    lockBoard = false;
    statusElement.innerText = isPlayerTurn ? "Your Turn!" : "Aya is thinking...";
    if (!isPlayerTurn) setTimeout(ayaTurn, 1000);
}

//------- AYA'S LOGIC ----------

function ayaTurn() {
    if (isPlayerTurn || firstTile !== null) return;

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
        chance = chance + 15; //Reduces the chances to match if the tile wasn't just picked. 
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
    tileFlipSound.play();
    boardData[id].state = 1;
    updateBuffer(id, boardData[id].symbol);
    if (firstTile == null) { 
        firstTile = id; 
    } else { 
        checkMatch(id); 
    }
    saveGameState();
}

document.getElementById('start-game').addEventListener('click', startGame);