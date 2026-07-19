import { Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { AIProvider } from './context/AIContext'
import { NotificationsProvider } from './context/NotificationsContext'
import MainLayout from './layouts/MainLayout'
import SolarSystem from './pages/SolarSystem'
import PlanetPage from './pages/PlanetPage'
import MissionControl from './pages/MissionControl'
import AIChat from './pages/AIChat'
import Login from './pages/Login'
import NotFound from './pages/NotFound'

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AIProvider>
          <NotificationsProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<MainLayout />}>
                <Route path="/" element={<SolarSystem />} />
                <Route path="/planet/:planetId" element={<PlanetPage />} />
                <Route path="/mission-control" element={<MissionControl />} />
                <Route path="/ai-chat" element={<AIChat />} />
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
          </NotificationsProvider>
        </AIProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
