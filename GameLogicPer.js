// GameLogic.js - handles all of the game logic.
//Notes to self:
// state --> 0 = face down, 1 = face up, 2 = matched

import { loadPictures, changeExpression } from "./NPCHandler.js";

//Persistence ------------------------
const vault_param = 'tavern_vault';
//------------------------------------

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

//Persistence ------------------------
const vault = decryptState(localStorage.getItem(vault_param));
let boardData;
if(vault && vault.boardData && validateGameState(vault)){
    //If there's a vault in local storage and it's not tampered with, load the board.
    boardData = vault.boardData;
}else{
    //Start a random board if no valid vault is found
    let deck = [...icons, ...icons].sort(() => Math.random() - 0.5);
    boardData = deck.map((symbol, id) => ({ id, symbol, state: 0 }));
}
//------------------------------------

//Persistence , load established values if found -------------
let playerScore = vault ? vault.playerScore : 0;
let ayaScore = vault ? vault.ayaScore : 0;
let isPlayerTurn = vault ? vault.isPlayerTurn : true;
let buffer = vault ? vault.buffer : [];
let firstTile = vault ? vault.firstTile : null;
let turnCounter = vault ? vault.turnCounter : 0;
//------------------------------------------------------------


const bufferLimit = 9; 
const buffInc = 85/(bufferLimit-1); 
let lockBoard = isPlayerTurn ? false : true;

const boardElement = document.getElementById('game-board');
const statusElement = document.getElementById('turn-indicator');
const menuElement = document.getElementById('menu-zone');
const turnIndicator = document.getElementById('turn-indicator');
const rewardIndicator = document.getElementById('reward-indicator');
const collectionElement = document.querySelectorAll('.collection-grid');

// Persistence functions ------------------------
//Saves the current game with encryption
function getGameState(){
    let checksum = 0; 
    const state = {
        boardData,
        playerScore,
        ayaScore,
        isPlayerTurn,
        buffer,
        firstTile,
        turnCounter
    };
    const fullState = {
        boardData,
        playerScore,
        ayaScore,
        isPlayerTurn,
        buffer,
        firstTile,
        turnCounter,
        checksum
    };

    let checksumState = encryptState(state); //This is just to generate the checksum, it doesn't need to be stored.
    fullState.checksum = crc32(checksumState); 

    return fullState;
}

function saveGameState() {
    localStorage.setItem(vault_param, encryptState(getGameState()));
}

// Integrity check
function crc32(str) {
    let crc = 0 ^ (-1);
    for (let i = 0; i < str.length; i++) {
        let y = (crc ^ str.charCodeAt(i)) & 0xFF;
        for (let j = 0; j < 8; j++) {
        y = (y >>> 1) ^ (y & 1 ? 0xEDB88320 : 0);
        }
        crc = (crc >>> 8) ^ y;
    }
    return (crc ^ (-1)) >>> 0;
}

function validateGameState(state){
    if(!state) return false;
    if(!state.checksum) return false;
    console.log("Checksum found, verifying integrity...");

    // Create copy of state without checksum for validation
    const { checksum, ...stateWithoutChecksum } = state;
    const recalculatedChecksum = crc32(encryptState(stateWithoutChecksum));

    if(recalculatedChecksum !== state.checksum) {
        console.warn("Checksum mismatch! Possible tampering detected.");
    }else{
        console.log("Checksum valid. Game state integrity verified.");
    }
    return recalculatedChecksum === state.checksum;
}
//------------------------


//Starts the game! If there's a valid saved state, it recovers it.
function startGame() {
    menuElement.classList.add('hidden');
    collectionElement.forEach(c => c.style.visibility = 'visible');
    turnIndicator.style.display = 'block';
    loadPictures();
    createBoard();
    song.loop = true;
    song.play();

if(vault && vault.boardData && validateGameState(vault)){
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

//Persistence ----- Rebuilding methods + encrypt..

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

//Rebuilds the collections based on saved board state.
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
//------------------------

//Creates the board!
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

//Random first turn picker.
function pickFirstTurn() {
    isPlayerTurn = Math.random() < 0.5;
    statusElement.innerText = isPlayerTurn ? "Your Turn!" : "Aya goes first!";
    if (!isPlayerTurn) setTimeout(ayaTurn, 1000);
}

//------- PLAYER LOGIC ----------

function onTileClick(id) {
    if (!isPlayerTurn || lockBoard || boardData[id].state !== 0) return;
    flip(id);
}

//Player clicks tile, tile flips, state changes, buffer updates, checks for matches.
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

//----- MIDDLE GROUND ------

//First tile is outside of functions. You check match with the second tile as parameter
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
            buffer.pop(); 
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

//Checks who is getting the next turn, checks for game end, changes expressions, etc
//if gotPair is true, it means the current player got a pair and gets another true
function nextTurn(gotPair) {
    if (boardData.every(c => c.state === 2)) {
        //Start end game sequence
        statusElement.innerText = `Game Over! ${playerScore > ayaScore ? "You win!" : playerScore < ayaScore ? "Aya wins!" : "It's a tie!"}`;
        rewardRoll(); //Goes brrr
        localStorage.clear();
        if(playerScore > ayaScore) changeExpression("defeat");
        if(playerScore < ayaScore) changeExpression("win");
        song.pause();
        document.getElementById("restart-game").style.display = 'block';
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

//Where the magic happens
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

//Adds a tile to the collection zones. 
function collectTile(symbol, zoneId) {
    const zone = document.getElementById(zoneId);
    const collectionTile = document.createElement('div');
    collectionTile.classList.add('collection-tile');
    
    collectionTile.innerHTML = `
        <img src="./Pieces/FrontPiece.png" class="tile-layer base-layer">
        <img src="./Pieces/${symbol}" class="symbol-img">`; 
    zone.appendChild(collectionTile);
}

//------- AYA'S LOGIC ----------

function ayaTurn() {
    if (isPlayerTurn || firstTile !== null) return;

    const matchInBuffer = scoutBuffer(); //Checks for matches

    if (matchInBuffer != null) { 
        ayaFlip(matchInBuffer.idA);
        setTimeout(() => ayaFlip(matchInBuffer.idB), 800);
    } else {
        const randomPicks = boardData.filter(c => c.state == 0).map(c => c.id);
        const firstPick = randomPicks[Math.floor(Math.random() * randomPicks.length)];
        ayaFlip(firstPick); //No match in buffer, picks at random.
        console.log(`--Aya picked a random first!`);

        setTimeout(() => {

            const secondMatch = scoutBuffer(); //After the first pick, checks buffer again
            if (secondMatch != null && secondMatch.idA == firstPick) {
                ayaFlip(secondMatch.idB);
            } else {
                pickRandomSecond(firstPick);
                console.log(`--Aya picked a random second!`);
            }
                
        }, 1000);
    }
}

//Scouts the buffer for a match and returns the IDs if it matches the conditions.
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

    if(closest != 0){
        chance = chance + 10; //Reduces the chances to match if the tile wasn't just picked. 
        console.log(`-- Reduced!`)
    } 
    if(bufferLimit >= 8){
        chance = Math.abs(chance - 20); //Increases the chances to match if the buffer is big enough (difficulty?)
        console.log(`-- Increased!`)
    }
    if(idA != null && idB != null){
        console.log(`(Chance: ${chance} | Farthest: ${farthest} | Result: ${Math.abs(85 - ((farthest-1) * buffInc))})`);
        if(chance <= Math.abs(85 - ((farthest-1) * buffInc))){ 
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
document.getElementById('restart-game').addEventListener('click', () => {
    location.reload();
});
