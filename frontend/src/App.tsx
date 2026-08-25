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
import PlatformLayout from './components/platform/PlatformLayout'
import Overview from './pages/platform/Overview'
import Hospitals from './pages/platform/Hospitals'
import Subscriptions from './pages/platform/Subscriptions'
import StaffDirectory from './pages/platform/StaffDirectory'
import PatientCensus from './pages/platform/PatientCensus'
import Availability from './pages/Availability'
import Profile from './pages/Profile'
import { useAuth, type Role } from './auth/AuthContext'

// Mirrors the @PreAuthorize rules on the API. The server is the one that enforces
// them; these keep a typed URL from landing on a screen that would only 403.
const PHARMACY: Role[] = ['Pharmacist', 'Administrator']
const LABORATORY: Role[] = ['Lab Technician', 'Administrator']
const ADMIN: Role[] = ['Administrator']
const PATIENT_DIRECTORY: Role[] = ['Receptionist', 'Administrator']
const APPOINTMENTS: Role[] = ['Receptionist', 'Clinician', 'Administrator']
const CLINICIAN: Role[] = ['Clinician']

export default function App() {
  return (
    <>
      <SessionExpiry />
      <Routes>
      <Route path="/login" element={<Login />} />

      {/* Platform super-admin console: no tenant, and no clinical data. Its two
          directories are read-only — the platform runs hospitals, not their records. */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute platformOnly>
            <PlatformLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Overview />} />
        <Route path="hospitals" element={<Hospitals />} />
        <Route path="subscriptions" element={<Subscriptions />} />
        <Route path="staff" element={<StaffDirectory />} />
        <Route path="patients" element={<PatientCensus />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      {/* Clinical app (tenant-scoped) */}
      <Route
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/patients" element={
          <ProtectedRoute roles={PATIENT_DIRECTORY}><Patients /></ProtectedRoute>} />
        <Route path="/patients/:patientId" element={<PatientDetails />} />
        <Route path="/appointments" element={
          <ProtectedRoute roles={APPOINTMENTS}><Appointments /></ProtectedRoute>} />
        <Route path="/records" element={<MedicalRecords />} />
        <Route path="/availability" element={
          <ProtectedRoute roles={CLINICIAN}><Availability /></ProtectedRoute>} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/pharmacy" element={
          <ProtectedRoute roles={PHARMACY}><Pharmacy /></ProtectedRoute>} />
        <Route path="/laboratory" element={
          <ProtectedRoute roles={LABORATORY}><Laboratory /></ProtectedRoute>} />
        <Route path="/staff" element={
          <ProtectedRoute roles={ADMIN}><Staff /></ProtectedRoute>} />
        <Route path="/clinic" element={
          <ProtectedRoute roles={ADMIN}><ClinicSettings /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Home />} />
      </Routes>
    </>
  )
}

/** Whatever you typed, you belong either in a clinic or above all of them. */
function Home() {
  const { session } = useAuth()
  return <Navigate to={session?.isPlatformAdmin ? '/admin' : '/dashboard'} replace />
}
