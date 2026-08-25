/** Mirrors CatalogResponse.MedicationOption. */
export interface MedicationOption {
  id: string
  name: string
  strength: string | null
  form: string | null
  category: string | null
  /** What lands on the prescription line — composed by the API so it is one string. */
  label: string
}

/** Mirrors CatalogResponse.LabTestOption. */
export interface LabTestOption {
  id: string
  name: string
  category: string | null
  specimen: string | null
}
