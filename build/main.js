import { Tela } from './tela.js';
import { level_4 } from './levels.js';
document.addEventListener('keypress', (event) => {
    console.log(event.key + " pressed");
    'wsda'.split('').forEach((key, index) => {
        if (key == event.key) {
            tela.move(index);
        }
    });
});
let tela = new Tela(level_4);
tela.paint();
//# sourceMappingURL=main.js.map