# Temas rítmicos

Disponíveis em **Tema → Cenário e atmosfera** e em três templates completos:

- **Pulso · Celebração**: ondas expansivas e linhas rotativas.
- **Energia · Louvor vivo**: faixas diagonais com deslocamento contínuo.
- **Neon · Noite de louvor**: órbitas e barras rítmicas decorativas.

As decorações combinam com gradientes, imagens e vídeos. Usam uma máscara suave para reduzir a atividade no centro, preservando a leitura. O texto mantém os controles independentes de entrada e saída. Os templates também aplicam tipografia, cores e animação de texto; escolher apenas o tema preserva o restante do visual.

## Controles

Cor, intensidade e Movimento ambiente continuam disponíveis. Nos novos temas, o ritmo aceita **40–200 BPM**; projetos sem esse campo usam 110 BPM. Ajuste da batida aceita −10.000 a +10.000 ms; um valor positivo atrasa a fase da primeira batida. Desligar o movimento congela todas as formas e desabilita os controles de ritmo.

O BPM é **manual**. O efeito não analisa o áudio, não detecta o andamento e as barras não são um espectro sonoro. Ouça o áudio no preview para ajustar BPM e fase. Não altera o alinhamento das letras. A exportação continua sem áudio.

## Renderização

Movimento calculado pelo frame e FPS, com envelope contínuo de baixa variação de opacidade. Não usa relógio, aleatoriedade nem animação CSS. Preview e Remotion usam o mesmo componente. O relógio rítmico preserva o tempo global mesmo quando um fundo de slide usa Sequence; as batidas não reiniciam ao trocar o fundo.

Campos `bpm` e `beatOffsetMs` são opcionais no schema de decoração. Temas/projetos antigos continuam válidos, sem migração de banco. A alteração de estilo continua seguindo o escopo escolhido no editor (slide ou visual padrão).

## Validação

`npm test` cobre relógio determinístico, fase, congelamento, limites de BPM e compatibilidade dos presets. O teste abaixo renderiza cada tema em dois frames, compara movimento/congelamento e gera MP4 sem áudio com os três templates:

```powershell
$env:REMOTION_BROWSER_EXECUTABLE='C:/Program Files/Google/Chrome/Application/chrome.exe'
npx tsx tests/rhythmic-render.integration.ts
```

Artefatos em `out/rhythmic-themes/` (ignorados pelo Git), incluindo `rhythmic-themes.mp4`.
