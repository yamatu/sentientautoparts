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
