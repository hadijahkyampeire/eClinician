import { StrictMode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from '@mui/material/styles'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext.tsx'
import { queryClient } from './lib/queryClient.ts'
import { theme } from './theme.ts'
import './index.css'
import './App.css'
import './styles/patient-list.css'
import './styles/patient-modal.css'
import './styles/patient-detail.css'
import './styles/medical-records.css'
import './styles/pharmacy.css'
import './styles/staff.css'
import './styles/dashboard.css'
import './styles/platform.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <App />
          </AuthProvider>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
