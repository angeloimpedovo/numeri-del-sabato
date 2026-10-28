# Numeri del Sabato

App React che propone combinazioni per **SuperEnalotto** e **Lotto** a partire dallo storico completo delle estrazioni
(Lotto dal 1871, SuperEnalotto dal 1997), scaricato da estrazionedellotto.it.

> Le estrazioni sono casuali e indipendenti. Nessun criterio (frequenti, ritardatari, casuale) aumenta la probabilità di vincita.
> Per il SuperEnalotto l'app scarta date, sequenze e sestine già uscite: non aiuta a vincere, ma riduce la probabilità di dividere il premio.

## Uso
```
npm install
npm run scrape   # aggiorna public/data/*.json (incrementale)
npm run dev
npm test
```

Un workflow GitHub Actions scarica le nuove estrazioni ogni sabato sera e ripubblica il sito su GitHub Pages.
Le giocate salvate restano nel browser (localStorage) e vengono confrontate con l'estrazione del sabato.
