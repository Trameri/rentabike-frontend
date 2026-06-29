# Backend Fix: Disponibilità bici per date

## Problema

La creazione di un contratto `in-use` per oggi viene rifiutata se la bici è già in una prenotazione con data futura, anche se le date non si sovrappongono.

**Errore riportato:**
```
La bici "625E" (barcode: 625E) è già noleggiata o prenotata per il periodo richiesto
```

**Esempio concreto:**
- Prenotazione esistente: bici `625E` per il `02/07/2026`
- Nuovo contratto: bici `625E` per il `29/06/2026` (oggi)
- Risultato attuale: creazione bloccata ❌
- Risultato atteso: creazione permessa ✅

## Causa

Il controllo di disponibilità lato backend verifica solo se l'item è presente in un contratto attivo (`in-use` o `reserved`) senza confrontare gli intervalli di date tra il nuovo contratto e quelli esistenti.

## Fix necessario

Nel metodo di validazione della disponibilità degli item (bici/accessori), confrontare gli intervalli di date tra il nuovo contratto e quelli esistenti.

### Logica corretta

```javascript
function hasDateOverlap(newStart, newEnd, existingStart, existingEnd) {
  const ns = new Date(newStart).getTime();
  const ne = newEnd ? new Date(newEnd).getTime() : ns;
  const es = new Date(existingStart).getTime();
  const ee = existingEnd ? new Date(existingEnd).getTime() : es;
  return ns <= ee && ne >= es;
}
```

### Criterio di blocco

- **Blocca** la creazione del nuovo contratto **solo se** le date si sovrappongono: `newStart <= existingEnd && newEnd >= existingStart`
- **Permetti** la creazione se le date sono disgiunte (es. oggi vs data futura)
- I contratti `in-use` senza `endAt` si considerano attivi fino a `Date.now()` per il calcolo della sovrapposizione

### Esempio di scenario

| Contratto esistente | Nuovo contratto | Sovrapposizione? | Azione |
|---------------------|-----------------|------------------|--------|
| Prenotazione 02/07  | Contratto 29/06 | No | ✅ Permetti |
| Prenotazione 29/06  | Contratto 29/06 | Sì | ❌ Blocca |
| Contratto in-uso 29/06-30/06 | Contratto 29/06 | Sì | ❌ Blocca |
| Prenotazione 02/07  | Prenotazione 03/07 | No | ✅ Permetti |

## Payload frontend

Il frontend invia già `startAt` e `endAt` nel payload della richiesta `POST /api/contracts`. Il backend deve usare questi campi per il calcolo della sovrapposizione, non solo lo status dell'item.

## Riferimento

- Branch: `main`
- Commit fix parziale frontend: `d49aced` — "fix: do not change bike status to reserved on booking creation"
- File frontend correlati:
  - `src/utils/availabilityCheck.js`
  - `src/pages/Contracts.jsx`
  - `src/pages/ContractsBeautiful.jsx`
  - `src/pages/ContractsOptimized.jsx`
