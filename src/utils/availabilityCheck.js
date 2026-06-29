import { api } from '../services/api.js';

export function checkDateOverlap(start1, end1, start2, end2) {
  const s1 = new Date(start1).getTime();
  const e1 = end1 ? new Date(end1).getTime() : s1;
  const s2 = new Date(start2).getTime();
  const e2 = end2 ? new Date(end2).getTime() : s2;
  return s1 <= e2 && s2 <= e1;
}

export async function loadActiveContracts() {
  const [inUse, reserved] = await Promise.all([
    api.get('/api/contracts?status=in-use'),
    api.get('/api/contracts?status=reserved')
  ]);
  return [...(inUse.data || []), ...(reserved.data || [])];
}

export async function loadAllContractsForAvailability() {
  const [inUse, reserved] = await Promise.all([
    api.get('/api/contracts?status=in-use'),
    api.get('/api/contracts?status=reserved')
  ]);
  return [...(inUse.data || []), ...(reserved.data || [])];
}

export function isItemAvailableForDates(itemId, kind, contractStart, contractEnd, contracts) {
  if (!contracts || !contracts.length) return true;
  const newStart = new Date(contractStart).getTime();
  const newEnd = contractEnd ? new Date(contractEnd).getTime() : newStart;
  
  const hasConflict = contracts.some(contract => {
    if (!contract.items) return false;
    const hasItem = contract.items.some(item =>
      item.kind === kind && item.refId === itemId
    );
    if (!hasItem) return false;
    
    const existingStart = new Date(contract.startAt || contract.createdAt).getTime();
    let existingEnd;
    
    if (contract.endAt) {
      existingEnd = new Date(contract.endAt).getTime();
    } else if (contract.status === 'in-use') {
      existingEnd = Date.now();
    } else if (contract.status === 'reserved') {
      // Per le prenotazioni, l'intervallo è dalla data di inizio fino al giorno prima della fine
      // Se la prenotazione inizia il 5/7, la bici è occupata solo il 5/7 non prima
      existingEnd = existingStart;
    } else {
      existingEnd = existingStart;
    }
    
    // Verifica sovrapposizione date
    // Un contratto conflette se: inizia prima della fine esistente E finisce dopo l'inizio esistente
    return newStart <= existingEnd && newEnd >= existingStart;
  });
  return !hasConflict;
}

// Verifica se un item è disponibile per le date specificate, considerando prenotazioni future
export function isItemAvailableForDatesWithFutureCheck(itemId, kind, contractStart, contractEnd, contracts) {
  if (!contracts || !contracts.length) return { available: true, reason: null };
  
  // Se i parametri sono stringhe, converti in Date
  const newStart = contractStart ? new Date(contractStart) : new Date();
  const newEnd = contractEnd ? new Date(contractEnd) : newStart;
  
  // Normalizza le date a mezzanotte per confronto giornaliero
  const newStartDay = new Date(newStart);
  newStartDay.setHours(0, 0, 0, 0);
  const newEndDay = new Date(newEnd);
  newEndDay.setHours(0, 0, 0, 0);
  
  for (const contract of contracts) {
    if (!contract.items) continue;
    
    const hasItem = contract.items.some(item =>
      item.kind === kind && item.refId === itemId
    );
    if (!hasItem) continue;
    
    const existingStart = new Date(contract.startAt || contract.createdAt);
    const existingStartDay = new Date(existingStart);
    existingStartDay.setHours(0, 0, 0, 0);
    
    let existingEndDay;
    if (contract.endAt) {
      existingEndDay = new Date(contract.endAt);
    } else if (contract.status === 'in-use') {
      existingEndDay = new Date();
    } else {
      // Per le prenotazioni senza endAt, la prenotazione è solo per quel giorno
      // ma la bici è disponibile prima di quella data
      existingEndDay = new Date(existingStartDay);
    }
    existingEndDay.setHours(0, 0, 0, 0);
    
    // Gestione speciale per prenotazioni future
    if (contract.status === 'reserved') {
      // Per le prenotazioni, la bici è riservata solo nel periodo della prenotazione
      // Se il nuovo contratto si sovrappa al periodo della prenotazione, non è disponibile
      // Condizione: nuovo inizio <= fine prenotazione E nuovo fine >= inizio prenotazione
      if (newStartDay <= existingEndDay && newEndDay >= existingStartDay) {
        return { 
          available: false, 
          reason: `Bici prenotata per questa data (contratto #${contract._id.slice(-6)})` 
        };
      }
    } else {
      // Per i contratti in-use, controlla la sovrapposizione
      if (newStartDay <= existingEndDay && newEndDay >= existingStartDay) {
        return { 
          available: false, 
          reason: `Bici già in uso (contratto #${contract._id.slice(-6)})` 
        };
      }
    }
  }
  
  return { available: true, reason: null };
}

export async function updateItemStatus(itemId, kind, newStatus) {
  const base = kind === 'bike' ? '/api/bikes' : '/api/accessories';
  await api.patch(`${base}/${itemId}`, { status: newStatus });
}

export async function updateBikesStatuses(itemIds, newStatus) {
  await Promise.all(itemIds.map(id => updateItemStatus(id, 'bike', newStatus)));
}