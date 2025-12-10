import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getReservationByToken, updateReservationByToken, cancelReservationByToken } from '../api/reservations';
import type { Reservation } from '../api/reservations';
import './ManageReservation.css';

export default function ManageReservation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editing, setEditing] = useState(false);
  
  const [formData, setFormData] = useState({
    date: '',
    time: '',
    partySize: 1,
    notes: '',
  });

  useEffect(() => {
    if (!token) {
      setError('Invalid reservation link');
      setLoading(false);
      return;
    }

    loadReservation();
  }, [token]);

  const loadReservation = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getReservationByToken(token!);
      setReservation(data);
      
      // Populate form with current data
      setFormData({
        date: data.date,
        time: data.time,
        partySize: data.partySize,
        notes: data.notes || '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load reservation');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      const updated = await updateReservationByToken(token!, formData);
      setReservation(updated);
      setEditing(false);
      setSuccess('Reservation updated! Status changed to PENDING for review. Check your email for confirmation.');
    } catch (err: any) {
      setError(err.message || 'Failed to update reservation');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Are you sure you want to cancel this reservation?')) {
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      await cancelReservationByToken(token!);
      setSuccess('Reservation cancelled successfully. You will receive a confirmation email.');
      
      // Wait 2 seconds then navigate home
      setTimeout(() => navigate('/'), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to cancel reservation');
      setLoading(false);
    }
  };

  const formatPhoneDisplay = (phone: string) => {
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');
    
    // Format as +1 (XXX) XXX-XXXX
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    return phone;
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'CONFIRMED': return 'status-confirmed';
      case 'PENDING': return 'status-pending';
      case 'CANCELLED': return 'status-cancelled';
      case 'SEATED': return 'status-seated';
      case 'NO_SHOW': return 'status-no-show';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="manage-reservation">
        <div className="loading">Loading your reservation...</div>
      </div>
    );
  }

  if (error && !reservation) {
    return (
      <div className="manage-reservation">
        <div className="error-box">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/')}>Make a New Reservation</button>
        </div>
      </div>
    );
  }

  if (!reservation) {
    return null;
  }

  return (
    <div className="manage-reservation">
      <div className="manage-container">
        <h1>Manage Your Reservation</h1>
        
        {success && <div className="success-message">{success}</div>}
        {error && <div className="error-message">{error}</div>}

        <div className="reservation-details">
          <div className="detail-row">
            <span className="label">Status:</span>
            <span className={`status-badge ${getStatusBadgeClass(reservation.status)}`}>
              {reservation.status}
            </span>
          </div>
          
          <div className="detail-row">
            <span className="label">Name:</span>
            <span>{reservation.guestName}</span>
          </div>
          
          <div className="detail-row">
            <span className="label">Email:</span>
            <span>{reservation.email}</span>
          </div>
          
          <div className="detail-row">
            <span className="label">Phone:</span>
            <span>{formatPhoneDisplay(reservation.phone)}</span>
          </div>
        </div>

        {!editing ? (
          <div className="view-mode">
            <div className="reservation-info">
              <div className="info-row">
                <span className="label">Date:</span>
                <span className="value">{reservation.date}</span>
              </div>
              
              <div className="info-row">
                <span className="label">Time:</span>
                <span className="value">{reservation.time}</span>
              </div>
              
              <div className="info-row">
                <span className="label">Party Size:</span>
                <span className="value">{reservation.partySize} {reservation.partySize === 1 ? 'person' : 'people'}</span>
              </div>
              
              {reservation.notes && (
                <div className="info-row">
                  <span className="label">Notes:</span>
                  <span className="value">{reservation.notes}</span>
                </div>
              )}
            </div>

            {reservation.status !== 'CANCELLED' && (
              <div className="action-buttons">
                <button 
                  className="btn-edit" 
                  onClick={() => setEditing(true)}
                  disabled={loading}
                >
                  Edit Reservation
                </button>
                <button 
                  className="btn-cancel" 
                  onClick={handleCancel}
                  disabled={loading}
                >
                  Cancel Reservation
                </button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleUpdate} className="edit-form">
            <div className="form-group">
              <label htmlFor="date">Date</label>
              <input
                type="date"
                id="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="time">Time</label>
              <input
                type="time"
                id="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="partySize">Party Size</label>
              <input
                type="number"
                id="partySize"
                min="1"
                max="20"
                value={formData.partySize}
                onChange={(e) => setFormData({ ...formData, partySize: parseInt(e.target.value) })}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="notes">Special Requests</label>
              <textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-save" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
              <button 
                type="button" 
                className="btn-cancel-edit" 
                onClick={() => {
                  setEditing(false);
                  // Reset form to current reservation data
                  setFormData({
                    date: reservation.date,
                    time: reservation.time,
                    partySize: reservation.partySize,
                    notes: reservation.notes || '',
                  });
                }}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="back-link">
          <button onClick={() => navigate('/')} className="btn-back">
            ← Make Another Reservation
          </button>
        </div>
      </div>
    </div>
  );
}
