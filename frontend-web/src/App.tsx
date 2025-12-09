import './App.css';
import ReservationForm from './components/ReservationForm';

function App() {
  return (
    <div className="reservation-app">
      <header className="app-header">
        <h1>Reserve Your Table</h1>
        <p>Book your dining experience with us</p>
      </header>
      <main className="app-content">
        <ReservationForm />
      </main>
    </div>
  );
}

export default App;
