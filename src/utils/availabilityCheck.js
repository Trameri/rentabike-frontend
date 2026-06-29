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
    const existingEnd = contract.endAt 
      ? new Date(contract.endAt).getTime() 
      : (contract.status === 'in-use' ? Date.now() : existingStart);
    return newStart <= existingEnd && newEnd >= existingStart;
  });
  return !hasConflict;
}

export async function updateItemStatus(itemId, kind, newStatus) {
  const base = kind === 'bike' ? '/api/bikes' : '/api/accessories';
  await api.patch(`${base}/${itemId}`, { status: newStatus });
}

export async function updateBikesStatuses(itemIds, newStatus) {
  await Promise.all(itemIds.map(id => updateItemStatus(id, 'bike', newStatus)));
}
