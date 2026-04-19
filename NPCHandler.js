//NPC Handler
//Handles the NPCs

//Change name of NPC here.
const selectedNPC = "Aya";

let npcUnder = document.getElementById("npc-under");
let npcOver = document.getElementById("npc-over");
let folder = `./NPCs/${selectedNPC}/${selectedNPC}`;
const cache = [];

const ayaExpressions = [
    "BaseUnder.png", "BaseOver.png", 
    "AngryUnder.png", 
    "Defeat1Under.png", "Defeat1Over.png", 
    "Defeat2Under.png", "Defeat2Over.png"
];

//If we ever have another NPC, add their expressions to their own array and add change the name below.
ayaExpressions.forEach(file => {
    const img = new Image();
    img.src = `${folder}${file}`;
    cache.push(img);
})

export function loadPictures() {

    npcUnder.style.backgroundImage = `url(${folder}BaseUnder.png)`;
    npcOver.style.backgroundImage = `url(${folder}BaseOver.png)`;    
}

export function changeExpression(expression) {

    switch(expression) {
        case "angry":
            npcUnder.style.backgroundImage = `url(${folder}AngryUnder.png)`;
            break;
        case "happy":
            npcUnder.style.backgroundImage = `url(${folder}BaseUnder.png)`;
            break;
        case "defeat":
            
                npcUnder.style.backgroundImage = `url(${folder}Defeat1Under.png)`;
                npcOver.style.backgroundImage = `url(${folder}Defeat1Over.png)`;
            
                setTimeout(() => {
                    npcUnder.style.backgroundImage = `url(${folder}Defeat2Under.png)`;
                    npcOver.style.backgroundImage = `url(${folder}Defeat2Over.png)`;
                }, 1500);
            break;

        case "win":
            npcUnder.style.backgroundImage = `url(${folder}Win1Under.png)`;
            npcOver.style.backgroundImage = `url(${folder}Win1Over.png)`;

                setTimeout(() => {
                    npcUnder.style.backgroundImage = `url(${folder}Win2Under.png)`;
                    npcOver.style.backgroundImage = `url(${folder}Win2Over.png)`;
                }, 1500);
            break;
    }
}
