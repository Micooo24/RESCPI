import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './Home'
import FireDashboard from './Fire_Disaster/FireDashboard'
import FloodDashboard from './Flood Disaster/FloodDashboard'
import LandslideDashboard from './Landslide_Disaster/LandslideDashboard'
import './App.css'

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Home Route */}
          <Route path="/" element={<Home />} />
          
          {/* Disaster Dashboard Routes */}
          <Route path="/Fire_disaster/firedashboard" element={<FireDashboard />} />
          <Route path="/Flood_disaster/flooddashboard" element={<FloodDashboard />} />
          <Route path="/landslidedisaster/landslidedashboard" element={<LandslideDashboard />} />
          
          {/* Fallback route - redirect to home if no match */}
          <Route path="*" element={<Home />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
