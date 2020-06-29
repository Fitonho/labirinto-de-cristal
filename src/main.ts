import { side } from './block.js'
import { Tela } from './tela.js'
import { level3 } from './levels.js'

let tela = new Tela(level3);
tela.paint();

document.addEventListener('keypress', (event) => {
    console.log(event.key + " pressed");
    'wsda'.split('').forEach((key, index) => {
        if (key == event.key) {
            tela.move(<side>index);
        }
    })
});
