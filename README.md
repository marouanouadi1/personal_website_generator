# Personal Website Generator (AI Assisted)

Script `scripts/ai-run.ts` usa Claude Sonnet (Anthropic) per prendere il primo task aperto in `ai/TASKS.md`, creare un branch, generare una patch diff e applicarla automaticamente, poi eseguire lint/type/test/build e committare.

## Setup

1. Clona repo e installa dipendenze:
```bash
pnpm install
```
2. Copia `.env.example` in `.env` e inserisci la tua chiave:
```bash
cp .env.example .env
# poi modifica ANTHROPIC_API_KEY
```
3. Esegui lo script:
```bash
pnpm ts-node scripts/ai-run.ts
```
Oppure rendilo eseguibile:
```bash
chmod +x scripts/ai-run.ts
./scripts/ai-run.ts
```

## Flusso
- Legge il primo `- [ ]` in `ai/TASKS.md`
- Crea branch `ai/<slug-task>`
- Costruisce prompt con `ai/PROMPT.md`, backlog completo e albero repo
- Chiede a Claude Sonnet una patch unified diff
- Applica la patch (`git apply`)
- Esegue qualità: lint, typecheck, test, build
- Committa (`feat: <task> [ai]`) e aggiorna `ai/JOURNAL.md`

## Variabili d'Ambiente
- `ANTHROPIC_API_KEY` (obbligatoria)

## Note
- Limite patch: 300 linee (gestito lato prompt/LLM)
- Se la patch non è valida lo script fallisce e stampa l'output del modello
- Modello usato: `claude-sonnet-4-20250514`

## TODO Futuro
- Validazione formale diff
- Rilettura patch con secondo pass "critic"
- Supporto multi-task batching
