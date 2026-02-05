import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/NavBar';
import Dashboard from './pages/Dashboard';
import UtentiPage from './pages/UtentiPage';
import AbitazioniPage from './pages/AbitazioniPage';
import HostPage from './pages/HostPage';
import PrenotazioniPage from './pages/PrenotazioniPage';
import FeedbackPage from './pages/FeedbackPage';
import StatistichePage from './pages/StatistichePage';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/utenti" element={<UtentiPage />} />
            <Route path="/abitazioni" element={<AbitazioniPage />} />
            <Route path="/host" element={<HostPage />} />
            <Route path="/prenotazioni" element={<PrenotazioniPage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            <Route path="/statistiche" element={<StatistichePage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;