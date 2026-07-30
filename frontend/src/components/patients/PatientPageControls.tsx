import type { ReactNode } from 'react'

interface Props {
  search: string
  onSearch: (value: string) => void
  onAdd: () => void
  children: ReactNode
}

export default function PatientPageControls({ search, onSearch, onAdd, children }: Props) {
  return (
    <>
      <div className="page-header patient-header">
        <div>
          <h2>Patients</h2>
          <p>Manage patient information</p>
        </div>
        <button className="btn" onClick={onAdd}>Add patient</button>
      </div>
      <div className="card">
        <div className="patient-toolbar">
          <input aria-label="Search patients" placeholder="Search by name or phone"
            value={search} onChange={(event) => onSearch(event.target.value)} />
        </div>
        {children}
      </div>
    </>
  )
}
