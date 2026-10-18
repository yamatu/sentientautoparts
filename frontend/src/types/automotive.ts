export interface VehicleFitment {
  make: string;
  model: string;
  year_from?: number;
  year_to?: number;
  engine: string;
  notes: string;
}
export interface AutomotiveFields {
  part_type: string;
  vehicle_make: string;
  oe_numbers: string[];
  interchange_numbers: string[];
  fitments: VehicleFitment[];
  compressor_type: string;
  refrigerant: string;
  voltage: string;
  pulley_grooves: string;
  pulley_diameter: string;
  displacement: string;
  oil_type: string;
  oil_capacity: string;
  fitment_notes: string;
}
export const EMPTY_AUTOMOTIVE: AutomotiveFields = {
  part_type: '', vehicle_make: '', oe_numbers: [], interchange_numbers: [], fitments: [],
  compressor_type: '', refrigerant: '', voltage: '', pulley_grooves: '', pulley_diameter: '', displacement: '', oil_type: '', oil_capacity: '', fitment_notes: '',
};
export function automotiveFromProduct(value: Partial<AutomotiveFields>): AutomotiveFields {
  const result = { ...EMPTY_AUTOMOTIVE };
  for (const key of Object.keys(EMPTY_AUTOMOTIVE) as (keyof AutomotiveFields)[]) {
    const v = value[key];
    if (Array.isArray(EMPTY_AUTOMOTIVE[key])) Object.assign(result, { [key]: Array.isArray(v) ? v : [] });
    else Object.assign(result, { [key]: typeof v === 'string' ? v : '' });
  }
  return result;
}

type ListingAutomotive = Partial<Omit<AutomotiveFields, 'fitments'>> & { fitments?: Partial<VehicleFitment>[] };

function unionReferences(current: string[], incoming: string[] = []): string[] {
  const seen = new Set(current.map((value) => value.trim().toUpperCase()).filter(Boolean));
  const merged = current.map((value) => value.trim()).filter(Boolean);
  for (const value of incoming) {
    const key = value.trim().toUpperCase();
    if (key && !seen.has(key)) {
      seen.add(key);
      merged.push(value.trim());
    }
  }
  return merged;
}

// Fills the form's automotive block from an AI listing: empty values are filled,
// OE / interchange lists are extended, and fitment rows are only added when the
// form has none, so anything the administrator typed is kept.
export function mergeListingAutomotive(current: AutomotiveFields, listing: ListingAutomotive): AutomotiveFields {
  const next: AutomotiveFields = { ...current };
  const textKeys = ['part_type', 'vehicle_make', 'compressor_type', 'refrigerant', 'voltage', 'pulley_grooves', 'pulley_diameter',
    'displacement', 'oil_type', 'oil_capacity', 'fitment_notes'] as const;
  for (const key of textKeys) {
    const incoming = (listing[key] || '').trim();
    if (!next[key].trim() && incoming) next[key] = incoming;
  }
  next.oe_numbers = unionReferences(current.oe_numbers, listing.oe_numbers);
  next.interchange_numbers = unionReferences(current.interchange_numbers, listing.interchange_numbers);
  if (current.fitments.length === 0 && listing.fitments?.length) {
    next.fitments = listing.fitments
      .filter((row) => (row.make || next.vehicle_make).trim())
      .map((row) => ({
        make: (row.make || next.vehicle_make).trim(),
        model: row.model || '',
        engine: row.engine || '',
        notes: row.notes || '',
        year_from: row.year_from ?? undefined,
        year_to: row.year_to ?? undefined,
      }));
  }
  return next;
}
