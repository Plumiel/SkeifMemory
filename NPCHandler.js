//NPC Handler
//Handles the NPCs

const selectedNPC = "Aya";

let npcUnder = document.getElementById("npc-under");
let npcOver = document.getElementById("npc-over");
let folder = `NPCs/${selectedNPC}/${selectedNPC}`;

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
    }
}
