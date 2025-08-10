import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast'; // ⬅️ Import Toaster
import Home from './Home';
import FireDashboard from './Fire_Disaster/FireDashboard';
import FloodDashboard from './Flood Disaster/FloodDashboard';
import LandslideDashboard from './Landslide_Disaster/LandslideDashboard';

import RescueControl from './RescueControl'; // Make sure this import is correct

import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        {/* Add Toaster once at the top level */}
        <Toaster position="top-center" reverseOrder={false} />
        
        <Routes>
          {/* Home Route */}
          <Route path="/" element={<Home />} />
          
          {/* Disaster Dashboard Routes */}
          <Route path="/Fire_disaster/firedashboard" element={<FireDashboard />} />
          <Route path="/Flood_disaster/flooddashboard" element={<FloodDashboard />} />
          <Route path="/landslidedisaster/landslidedashboard" element={<LandslideDashboard />} />

          <Route path="/rescue" element={<RescueControl />} /> {/* Add this route */}
          
          {/* Fallback route - redirect to home if no match */}
          <Route path="*" element={<Home />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
