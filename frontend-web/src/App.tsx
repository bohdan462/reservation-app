import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ReservationForm from './components/ReservationForm';
import ManageReservation from './pages/ManageReservation';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route 
          path="/" 
          element={
            <div className="reservation-app">
              <header className="app-header">
                <h1>Reserve Your Table</h1>
                <p>Secure your spot in moments</p>
              </header>
              <main className="app-content">
                <ReservationForm />
              </main>
            </div>
          } 
        />
        <Route path="/manage/:token" element={<ManageReservation />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
