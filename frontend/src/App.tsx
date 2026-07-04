import { Routes, Route, Navigate } from 'react-router-dom'
import ProtectedRoute from './routes/ProtectedRoute'
import DashboardLayout from './components/DashboardLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Patients from './pages/Patients'
import Appointments from './pages/Appointments'
import MedicalRecords from './pages/MedicalRecords'
import Pharmacy from './pages/Pharmacy'
import Laboratory from './pages/Laboratory'
import Staff from './pages/Staff'
import PlatformAdmin from './pages/PlatformAdmin'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {/* Platform super-admin surface (no tenant). TODO: full admin console. */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
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
        <Route path="/patients" element={<Patients />} />
        <Route path="/appointments" element={<Appointments />} />
        <Route path="/records" element={<MedicalRecords />} />
        <Route path="/pharmacy" element={<Pharmacy />} />
        <Route path="/laboratory" element={<Laboratory />} />
        <Route path="/staff" element={<Staff />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
