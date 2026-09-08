# Pelada da Panela App

Projeto: **Pelada da Panela** — app mobile-first para uma pelada de futebol recorrente entre amigos.

ATENÇÃO AO ESCOPO. Esta é a ETAPA 1 de um projeto grande. Construa APENAS o que está descrito abaixo. Não crie banco de dados, não conecte Supabase, não crie telas de ranking, partida, times ou estatísticas. Não instale integrações. Dados 100% mockados nesta etapa.

## OBJETIVO DA ETAPA 1
Criar a fundação: design system global, estrutura de pastas, tipos do domínio, dados mockados, tela de Login, tela Home e a navegação mobile principal. Nada além disso.

## STACK
React + TypeScript + Tailwind + shadcn/ui (o padrão do projeto). Mobile-first obrigatório.

## DECISÃO DE TEMA (importante)
O app é **dark por natureza**, não é um app claro com dark mode. O fundo é charcoal e o conteúdo é off-white. NÃO crie toggle de tema, NÃO crie variante light. Configure o tema único direto nos tokens.

## DESIGN SYSTEM (crie isso primeiro, em index.css + tailwind.config)
Defina TODAS as cores como tokens semânticos em HSL no index.css. Nenhum componente pode usar cor hardcoded (nada de `bg-[#111]` ou `text-white` solto). Tudo via token.

Paleta base:
- charcoal (fundo principal): #111111
- surface (card elevado): #1A1A1A
- surface-2 (card sobre card): #222222
- border: #2A2A2A
- burnt orange (marca / ação): #FF7A2F
- orange-dim (hover/press): #E8621A
- warm off white (texto principal): #F5F2EB
- muted foreground (texto secundário): #A3A099
- success: #22C55E
- danger: #EF4444
- warning: #FACC15

Mapeie para os tokens do shadcn: background, foreground, card, card-foreground, popover, primary (laranja), primary-foreground (charcoal, para contraste no botão laranja), secondary, muted, muted-foreground, accent, destructive, border, input, ring (laranja).

Tipografia:
- Importe Space Grotesk (400, 500, 600, 700) do Google Fonts no index.css.
- font-display = Space Grotesk, font-sans = Inter, sans-serif. Fallback Inter.
- Números de placar, contadores e estatísticas usam Space Grotesk 700 com tracking apertado (-0.02em).

Raios: --radius: 1rem. Cards com rounded-2xl, botões rounded-xl.

Regras visuais obrigatórias:
- Nada de gradiente decorativo, nada de glassmorphism, nada de sombra colorida, nada de estética e-sports.
- Laranja é cor de AÇÃO e de MARCA, usada com parcimônia. Não pinte blocos grandes de laranja além do CTA principal e do destaque de marca.
- Cards grandes, poucos elementos por tela, hierarquia forte por tamanho de fonte e peso, não por cor.
- Animações discretas: transições de 150-200ms, nada de bounce.
- Alvos de toque com no mínimo 44px de altura.

## LOGO
Crie o arquivo `public/logo-pelada.svg` com EXATAMENTE este conteúdo (é a marca oficial: uma panela estilizada integrada a uma bola de futebol):

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-label="Pelada da Panela">
  <defs>
    <clipPath id="ppBall"><circle cx="0" cy="0" r="100"/></clipPath>
  </defs>
  <rect width="256" height="256" rx="56" fill="#111111"/>
  <g transform="translate(108 128) scale(0.72)">
    <line x1="86" y1="4" x2="168" y2="-14" stroke="#FF7A2F" stroke-width="26" stroke-linecap="round"/>
    <g clip-path="url(#ppBall)">
      <g stroke-width="6" stroke-linejoin="round">
        <polygon points="26,0 13,22.52 -13,22.52 -26,0 -13,-22.52 13,-22.52" transform="translate(-99 -57.16)" fill="#F5F2EB" stroke="#F5F2EB"/>
        <polygon points="26,0 13,22.52 -13,22.52 -26,0 -13,-22.52 13,-22.52" transform="translate(-99 0)" fill="#F5F2EB" stroke="#F5F2EB"/>
        <polygon points="26,0 13,22.52 -13,22.52 -26,0 -13,-22.52 13,-22.52" transform="translate(-99 57.16)" fill="#F5F2EB" stroke="#F5F2EB"/>
        <polygon points="26,0 13,22.52 -13,22.52 -26,0 -13,-22.52 13,-22.52" transform="translate(-49.5 -85.74)" fill="#F5F2EB" stroke="#F5F2EB"/>
        <polygon points="26,0 13,22.52 -13,22.52 -26,0 -13,-22.52 13,-22.52" transform="translate(-49.5 -28.58)" fill="#F5F2EB" stroke="#F5F2EB"/>
        <polygon points="26,0 13,22.52 -13,22.52 -26,0 -13,-22.52 13,-22.52" transform="translate(-49.5 28.58)" fill="#F5F2EB" stroke="#F5F2EB"/>
        <polygon points="26,0 13,22.52 -13,22.52 -26,0 -13,-22.52 13,-22.52" transform="translate(-49.5 85.74)" fill="#F5F2EB" stroke="#F5F2EB"/>
        <polygon points="26,0 13,22.52 -13,22.52 -26,0 -13,-22.52 13,-22.52" transform="translate(0 -57.16)" fill="#F5F2EB" stroke="#F5F2EB"/>
        <polygon points="26,0 13,22.52 -13,22.52 -26,0 -13,-22.52 13,-22.52" transform="translate(0 0)" fill="#F5F2EB" stroke="#F5F2EB"/>
        <polygon points="26,0 13,22.52 -13,22.52 -26,0 -13,-22.52 13,-22.52" transform="translate(0 57.16)" fill="#F5F2EB" stroke="#F5F2EB"/>
        <polygon points="26,0 13,22.52 -13,22.52 -26,0 -13,-22.52 13,-22.52" transform="translate(49.5 -85.74)" fill="#F5F2EB" stroke="#F5F2EB"/>
        <polygon points="26,0 13,22.52 -13,22.52 -26,0 -13,-22.52 13,-22.52" transform="translate(49.5 85.74)" fill="#F5F2EB" stroke="#F5F2EB"/>
        <polygon points="26,0 13,22.52 -13,22.52 -26,0 -13,-22.52 13,-22.52" transform="translate(49.5 -28.58)" fill="#FF7A2F" stroke="#FF7A2F"/>
        <polygon points="26,0 13,22.52 -13,22.52 -26,0 -13,-22.52 13,-22.52" transform="translate(49.5 28.58)" fill="#FF7A2F" stroke="#FF7A2F"/>
        <polygon points="26,0 13,22.52 -13,22.52 -26,0 -13,-22.52 13,-22.52" transform="translate(99 -57.16)" fill="#FF7A2F" stroke="#FF7A2F"/>
        <polygon points="26,0 13,22.52 -13,22.52 -26,0 -13,-22.52 13,-22.52" transform="translate(99 0)" fill="#FF7A2F" stroke="#FF7A2F"/>
        <polygon points="26,0 13,22.52 -13,22.52 -26,0 -13,-22.52 13,-22.52" transform="translate(99 57.16)" fill="#FF7A2F" stroke="#FF7A2F"/>
      </g>
    </g>
  </g>
</svg>
```

Crie também um componente `src/components/brand/Logo.tsx` que renderiza esse mesmo desenho inline como React (prop `size` em px, prop `withBackground` boolean para mostrar ou não o quadrado charcoal arredondado). Use-o no Login e no header. Não use `<img>` para a logo dentro da UI.

## ESTRUTURA DE PASTAS
Organize assim (crie as pastas mesmo que algumas fiquem quase vazias, é a base para as próximas etapas):
- `src/types/domain.ts` — todos os tipos do domínio
- `src/lib/mock/` — dados mockados
- `src/components/brand/` — Logo
- `src/components/layout/` — AppShell, BottomNav, TopBar
- `src/components/ui/` — shadcn (já existente)
- `src/features/auth/`
- `src/features/home/`

## TIPOS DO DOMÍNIO (`src/types/domain.ts`)
Escreva os tipos completos agora, mesmo que a etapa 1 use só alguns. Isso evita retrabalho.

```
type Position = 'goleiro' | 'defensor' | 'meio-campo' | 'atacante'
type Foot = 'direito' | 'esquerdo' | 'ambidestro'
type UserRole = 'admin' | 'jogador'
type PeladaStatus = 'aberta' | 'confirmacao' | 'times_definidos' | 'em_andamento' | 'finalizada'
type MatchStatus = 'agendada' | 'em_andamento' | 'finalizada'
type MatchEventType = 'gol' | 'assistencia' | 'gol_contra'
```

Interfaces: `Player` (id, nome, apelido, fotoUrl, posicaoPrincipal, posicoesSecundarias, peDominante, numeroPreferido, ativo, criadoEm), `Season`, `Pelada` (id, data, horario, local, seasonId, status, jogadoresConfirmados, times, partidas), `Team`, `Match` (id, peladaId, timeA, timeB, placarA, placarB, inicioEm, fimEm, status, eventos), `MatchEvent` (id, matchId, tipo, playerId, teamId, assistPlayerId opcional, minuto, criadoEm), `PlayerStats` (jogos, vitorias, empates, derrotas, gols, assistencias, golsContra, participacoesEmGols, mediaGolsPorJogo, mediaAssistenciasPorJogo, aproveitamento, mvps), `MvpVote`, `AuthUser` (id, playerId, role).

## DADOS MOCKADOS (`src/lib/mock/`)
Crie ~14 jogadores brasileiros plausíveis com apelido, posição e estatísticas variadas. Sem foto real: use iniciais do apelido em um avatar circular de fundo surface-2 com texto off-white. Crie 1 temporada atual ("Temporada 2026"), 1 próxima pelada e 2 peladas passadas. Exporte também um `currentUser` mockado com role `admin`.

## NAVEGAÇÃO
Bottom navigation fixa, 4 itens, com safe-area-inset-bottom respeitado:
1. Início (rota `/`)
2. Pelada (rota `/pelada`)
3. Ranking (rota `/ranking`)
4. Perfil (rota `/perfil`)

Ícones simples do lucide-react. Item ativo em laranja com o label visível; itens inativos em muted-foreground. Sem badge, sem animação exagerada.

As rotas `/pelada`, `/ranking` e `/perfil` nesta etapa mostram apenas um estado vazio elegante e centralizado, com o texto "Em breve" e uma linha curta explicando o que virá. NÃO implemente essas telas.

O `AppShell` deve limitar o conteúdo a `max-w-md` centralizado, com padding lateral de 20px, para que no desktop o app apareça como uma coluna mobile e não estique.

## TELA DE LOGIN (rota `/login`)
Tela cheia, fundo charcoal, conteúdo centralizado verticalmente.
- Logo grande (sem o quadrado de fundo, já que o fundo da tela é charcoal), aprox 96px.
- Wordmark "PELADA DA PANELA" em Space Grotesk 700, uppercase, tracking apertado, off-white, com a palavra "PANELA" em laranja.
- Uma linha de subtítulo curta e seca, sem publicidade: "A pelada dos amigos, organizada de verdade."
- Botão primário grande: "Entrar com Google", com o ícone do Google, altura 52px, largura total. Nesta etapa ele apenas navega para `/` (mock, sem auth real). Deixe um comentário no código marcando onde entra o Supabase Auth depois.
- Abaixo, um link discreto em muted-foreground: "Entrar com e-mail" que por enquanto é desabilitado com tooltip ou apenas visualmente inativo.
- Rodapé pequeno com "Temporada 2026" em muted-foreground.

## TELA HOME (rota `/`)
Ordem exata dos blocos, de cima para baixo:

1. **TopBar**: logo pequena à esquerda (32px, sem fundo), nome do usuário e avatar à direita. Sem título grande redundante.

2. **Card Próxima Pelada** (o bloco mais forte da tela, card em surface com borda sutil):
   - Etiqueta pequena em laranja uppercase: "PRÓXIMA PELADA"
   - Data por extenso em destaque grande (ex: "Quinta, 12 de março")
   - Horário e local em muted-foreground, em uma linha só, separados por ponto médio
   - Contador de confirmados grande: número em Space Grotesk 700 tamanho grande + a palavra "confirmados" pequena ao lado
   - Uma fileira horizontal com os avatares dos primeiros 6 confirmados sobrepostos levemente, e um "+N" no fim
   - Botão de largura total "CONFIRMAR PRESENÇA" em laranja. Ao tocar, alterna para um estado confirmado (borda laranja, fundo transparente, texto "PRESENÇA CONFIRMADA" com ícone de check em success) e incrementa o contador. Estado local apenas, sem persistência.

3. **Faixa de destaques**: dois cards lado a lado, metade da largura cada:
   - "Artilheiro" com avatar, apelido e número de gols
   - "MVP recente" com avatar, apelido e o nome da pelada
   Ambos compactos, número em destaque.

4. **Ranking resumido**: card com título "Ranking geral" e um link discreto "Ver tudo" à direita (aponta para `/ranking`). Lista dos 5 primeiros: posição, avatar, apelido, e a pontuação/aproveitamento à direita. A primeira posição com o número em laranja. Linhas separadas por borda sutil, sem zebra.

5. **Acesso rápido**: dois botões secundários largos, "Jogadores" e "Histórico", com ícone à esquerda e chevron à direita. Nesta etapa levam para as rotas de "Em breve".

Espaçamento vertical generoso entre blocos (24px), padding inferior suficiente para a bottom nav não cobrir conteúdo.

## RESPONSIVIDADE
Alvo principal: 390x844 (iPhone). Teste também 360px de largura, que é o mais apertado comum no Android. Nada pode estourar horizontalmente, nenhum texto pode quebrar feio, os botões precisam continuar tocáveis. No desktop, coluna centralizada de no máximo 448px sobre fundo charcoal.

## O QUE NÃO FAZER
- Não conecte Supabase nem crie tabelas.
- Não implemente autenticação real.
- Não crie tela de partida, times, estatísticas, ranking completo ou perfil.
- Não adicione bibliotecas de animação pesadas.
- Não use imagens de banco de imagens.
- Não crie README nem documentação.

Ao terminar, responda listando os arquivos que criou e as decisões de design system que tomou.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://peladadapanela.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/04018ef9-79d8-4d75-96fc-e330d7e632d7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
