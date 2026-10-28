# Labirinto de Cristal
https://fitonho.github.io/labirinto-de-cristal/

## Descrição
Labirinto de Cristal é um simples puzzle feito em TypeScript e HTML, onde o seu objetivo é chegar até o cristal no fim do labirinto.

## Instruções
- Selecione um nível utilizando o seletor abaixo do labirinto
- Use WASD para mover o personagem
- Empurre blocos da sua própria cor para alterar o layout do labirinto
- Entre em portais para mudar a sua cor e os blocos que podem ser empurrados

## Roadmap
- Adicionar função de desfazer jogadas
- Progressão automática de níveis
- Alterar texto do botão "selecionar nível" para "resetar nível" quando o nível atual estiver selecionado
- Mudanças na gerais nas mecânicas para tornar o jogo mais completo

## Desenvolvimento
- `npm install`, depois `npm run build` gera o site em `dist/`.
- `npm test` roda os testes; `npm run typecheck` checa os tipos.
- `npm run solve -- sample-c` procura a solução mais curta de um nível pequeno.
- Abra o site com `?debug` na URL para ver o log de ações e eventos no console.

Estrutura:
- `src/core/`: regras do jogo em TypeScript puro (sem DOM), usadas pela web, pelos testes, pelo solver e futuramente pelo app mobile.
- `src/levels/`: níveis em JSON.
- `src/web/`: a versão web (Redux, desenho, teclado e toque).
- `tests/legacy/`: cópia das regras originais, usada só para comparar com o motor novo.

## Autores
Filipe Mouro (fitonho@gmail.com) e Arathi Guedes (arathiguedes@gmail.com)
