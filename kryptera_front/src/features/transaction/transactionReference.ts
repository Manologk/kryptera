/** Display reference like `#KRP-2041` — works when API omits `reference_code` (client serializer). */
export function transactionReferenceDisplay(tx: { id: string; referenceCode?: string }): string {
  const code =
    tx.referenceCode?.trim() ||
    `KRP-${tx.id.replace(/-/g, '').slice(0, 8).toUpperCase()}`
  const normalized = code.startsWith('#') ? code.slice(1) : code
  return `#${normalized}`
}
