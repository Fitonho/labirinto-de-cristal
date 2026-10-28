# Labirinto de Cristal
https://labirinto-de-cristal.netlify.app

## Descrição
Labirinto de Cristal é um puzzle feito em TypeScript e React Native (Expo), para celular e web, onde o seu objetivo é chegar até o cristal no fim do labirinto.

## Instruções
- Selecione um nível utilizando o seletor abaixo do labirinto
- Use as setas ou WASD para mover o personagem, ou deslize no celular
- Z desfaz a última jogada, R recomeça o nível
- Empurre blocos da sua própria cor para alterar o layout do labirinto
- Entre em portais para mudar a sua cor e os blocos que podem ser empurrados

## Roadmap
- Progressão automática de níveis
- Alterar texto do botão "selecionar nível" para "resetar nível" quando o nível atual estiver selecionado
- Mudanças na gerais nas mecânicas para tornar o jogo mais completo

## Desenvolvimento
- `npm install`, depois `npm start` abre o servidor do Expo: escaneie o QR code com o app Expo Go no celular. `npm run web` abre no navegador.
- `npm run build` gera o site em `dist/` (`expo export`), que o Netlify publica.
- `npm test` roda os testes; `npm run typecheck` checa os tipos.
- `npm run solve -- sample-c` procura a solução mais curta de um nível pequeno.
- Abra o site com `?debug` na URL para ver o log de ações e eventos no console.

Estrutura:
- `src/core/`: regras do jogo em TypeScript puro, usadas pelo app, pelos testes e pelo solver.
- `src/levels/`: níveis em JSON.
- `app/`: telas do app (Expo Router).
- `src/state/`: estado do app com Redux e o log de desenvolvimento.
- `src/ui/`: componentes React Native (tabuleiro, seletor de nível) e textos PT/EN.
- `tests/legacy/`: cópia das regras originais, usada só para comparar com o motor novo.

## Autores
Filipe Mouro (fitonho@gmail.com) e Arathi Guedes (arathiguedes@gmail.com)
