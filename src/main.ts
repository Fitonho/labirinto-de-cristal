import {Tela} from './tela.js'
import {Levels} from './levels.js'
import {side} from './block.js'

let levels = new Levels;
let levelsArray = Object.getOwnPropertyNames(Levels.prototype).slice(1)
let levelSelectionDropdown:HTMLSelectElement = document.querySelector("#levelSelection");
for(let level of Object.getOwnPropertyNames(Levels.prototype).slice(1)){
    let option = document.createElement("option");
    option.value=level
    option.textContent=level
    levelSelectionDropdown.appendChild(option);
}

document.querySelector("#selectLevelButton").addEventListener('click',(event)=>{
    console.log('nivel selecionado: '+ levelSelectionDropdown.value);
    document.querySelector("#board").textContent=''
    tela = new Tela(levels[levelSelectionDropdown.value])
    // tela = new Tela()
})

document.addEventListener('keypress', (event) => {
    console.log(event.key + " pressed");
    'wdsa'.split('').forEach((key, index) => {
        if (key == event.key){
            tela.move(<side>index);
        }
    })
});

let tela = new Tela(levels.level_1);
