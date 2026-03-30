# Arquitetura AstraLatro: Entity Edition

Esse documento detalha a estrutura de código refatorada e os princípios arquiteturais aplicados durante o processo de modularização.

## Filosofia de Design e Princípios SOLID

O projeto original residia integralmente em uma tag `<script>` gigantesca dentro do `index.html`. Isso configurava um Anti-Pattern (God Object / Spaghetti Code) dificultando a adição de novas funcionalidades, cartas e telas de UI.

A refatoração adotou Módulos ES6 puros e alguns dos princípios fundamentais **SOLID**:

1. **S - Single Responsibility Principle (Princípio da Responsabilidade Única):**
   - Antes o jogo controlava tudo: inputs, atualizações de DOM, renderização Three.js e cálculos de Poker.
   - Agora, funções como `evaluateHand` vivem sozinhas e são puras (não tocam no DOM nem em variáveis globais), apenas retornando dados.
   - `UIManager.js` é o único arquivo que interage com os nós HTML.
   - `GameState.js` retém exclusivamente os contadores e arrays que montam a lógica de negócio do jogo.

2. **O - Open/Closed Principle (Princípio Aberto/Fechado):**
   - A `Engine3D.js` gerencia instâncias genéricas (`cardMeshes` e propriedades). O loop de renderização (`animate`) itera livremente sobres malhas. Para adicionar novas cartas com efeitos (ex: Cartas de Tarô), basta expandir como a `spawnCardMesh` funciona, sem quebrar o laço de atualização contínuo do fundo e das luzes.

3. **D - Dependency Inversion Principle (Inversão de Dependências):**
   - O controlador de interações `InputController.js` recebe abstrações (funções de callback) como argumentos de construtor em vez de referenciar estaticamente o estado do jogo que "reside no Main". Isso permite que ele seja testado, reutilizado e não exija importações circulares severas.

## Estrutura de Diretórios

```
AstraLatro/
│
├── index.html                 # Ponto de entrada (Layout e tags do Tailwind)
├── architecture.md            # Este Documento
│
├── css/
│   └── style.css              # Reset, Overlay CRT, Animações e Botões Custumizados
│
└── js/
    ├── main.js                # Orquestrador Central (Controla o PCL - Play Loop)
    ├── constants.js           # Matrizes e Dados imutáveis (Naipes, Ranks de Mão)
    │
    ├── core/
    │   ├── GameState.js       # Armazena estado volátil (Score, Blinds, Deck atual)
    │   └── PokerEvaluator.js  # Lógica algébrica desengatada de pontuações do Poker
    │
    ├── graphics/
    │   ├── Engine3D.js        # Classes Wrappers sobre o Three.js (Câmera, Render, Scene, Meshes)
    │   └── TextureGenerator.js# Geradores de Canvas2d procedural (Pixel Arts)
    │
    └── input/
    │   └── InputController.js # Lida com mouses, touches e Raycasting da cena 3D
    │
    └── ui/
        └── UIManager.js       # Manipula elementos do documento, botões e barras de progresso
```

## Fluxo Lógico (Game Loop Acionado por Eventos)

Diferente de sistemas como Unity/Godot onde o *Game Logic* roda no `Update()`, a avaliação por seriada do "AstraLatro" é ativada dinamicamente:
1. O `InputController` escuta `click`. 
2. Realiza o raycast na `Engine3D`, selecionando uma Entity `UserData`.
3. Notifica (`callback`) o `main.js`.
4. O `main.js` altera as arrays do `GameState`.
5. O `main.js` chama o calculador em `PokerEvaluator` passando as arrays.
6. Notifica e ordena que a `UIManager` pinte o resultado na tela HTML.
