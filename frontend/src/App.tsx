import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './routes/ProtectedRoute'
import DashboardLayout from './components/DashboardLayout'
import SessionExpiry from './components/SessionExpiry'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Patients from './pages/Patients'
import PatientDetails from './pages/PatientDetails'
import Appointments from './pages/Appointments'
import MedicalRecords from './pages/MedicalRecords'
import Pharmacy from './pages/Pharmacy'
import Laboratory from './pages/Laboratory'
import Staff from './pages/Staff'
import ClinicSettings from './pages/ClinicSettings'
import PlatformAdmin from './pages/PlatformAdmin'
import type { Role } from './auth/AuthContext'

// Mirrors the @PreAuthorize rules on the API. The server is the one that enforces
// them; these keep a typed URL from landing on a screen that would only 403.
const PHARMACY: Role[] = ['Pharmacist', 'Administrator']
const LABORATORY: Role[] = ['Lab Technician', 'Administrator']
const ADMIN: Role[] = ['Administrator']
const PATIENT_DIRECTORY: Role[] = ['Receptionist', 'Administrator']
const APPOINTMENTS: Role[] = ['Receptionist', 'Clinician', 'Administrator']

export default function App() {
  return (
    <>
      <SessionExpiry />
      <Routes>
      <Route path="/login" element={<Login />} />

      {/* Platform super-admin console: no tenant, and no clinical data. */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute platformOnly>
            <PlatformAdmin />
          </ProtectedRoute>
        }
      />

      {/* Clinical app (tenant-scoped) */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/patients" element={
          <ProtectedRoute roles={PATIENT_DIRECTORY}><Patients /></ProtectedRoute>} />
        <Route path="/patients/:patientId" element={<PatientDetails />} />
        <Route path="/appointments" element={
          <ProtectedRoute roles={APPOINTMENTS}><Appointments /></ProtectedRoute>} />
        <Route path="/records" element={<MedicalRecords />} />
        <Route path="/pharmacy" element={
          <ProtectedRoute roles={PHARMACY}><Pharmacy /></ProtectedRoute>} />
        <Route path="/laboratory" element={
          <ProtectedRoute roles={LABORATORY}><Laboratory /></ProtectedRoute>} />
        <Route path="/staff" element={
          <ProtectedRoute roles={ADMIN}><Staff /></ProtectedRoute>} />
        <Route path="/clinic" element={
          <ProtectedRoute roles={ADMIN}><ClinicSettings /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </>
  )
}
