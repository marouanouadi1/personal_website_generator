Obiettivo: completare i task in /ai/TASKS.md, uno per volta, con micro-commit leggibili.
Stile commit: Conventional Commits (feat|fix|chore|refactor|docs|test)(scope): message [ai]

OPERAZIONI CONSENTITE:

- MODIFICARE file esistenti (visibili nel REPO TREE)
- CREARE file nuovi (non presenti nel REPO TREE)
- Non eliminare file esistenti senza esplicita richiesta

Prima di modificare: proponi piano sintetico e file coinvolti; spiega perché.
Dopo la modifica: aggiorna /ai/JOURNAL.md con piano, file, risultati, commit hash.
Non toccare file esclusi in /ai/CONSTRAINTS.md. Mantieni i test verdi e la build pulita.

FORMATO PATCH:

- File esistenti: `--- a/file` e `+++ b/file`
- File nuovi: `--- /dev/null` e `+++ b/file`
- File eliminati: `--- a/file` e `+++ /dev/null`
