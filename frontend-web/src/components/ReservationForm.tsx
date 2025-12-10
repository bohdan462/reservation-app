import { useState, FormEvent, ChangeEvent } from 'react';
import { createReservation, CreateReservationResponse } from '../api/reservations';

interface FormData {
  guestName: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  partySize: string;
  notes: string;
}

interface FormErrors {
  guestName?: string;
  email?: string;
  phone?: string;
  date?: string;
  time?: string;
  partySize?: string;
}

export default function ReservationForm() {
  const [formData, setFormData] = useState<FormData>({
    guestName: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    partySize: '2',
    notes: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<CreateReservationResponse | null>(null);
  const [submitError, setSubmitError] = useState<string>('');

  const formatPhoneNumber = (value: string): string => {
    // Remove all non-numeric characters
    const phoneNumber = value.replace(/\D/g, '');
    
    // Format as +1 (XXX) XXX-XXXX
    if (phoneNumber.length === 0) {
      return '';
    } else if (phoneNumber.length <= 1) {
      return `+${phoneNumber}`;
    } else if (phoneNumber.length <= 4) {
      return `+${phoneNumber.slice(0, 1)} (${phoneNumber.slice(1)}`;
    } else if (phoneNumber.length <= 7) {
      return `+${phoneNumber.slice(0, 1)} (${phoneNumber.slice(1, 4)}) ${phoneNumber.slice(4)}`;
    } else {
      return `+${phoneNumber.slice(0, 1)} (${phoneNumber.slice(1, 4)}) ${phoneNumber.slice(4, 7)}-${phoneNumber.slice(7, 11)}`;
    }
  };

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    // Auto-format phone number
    if (name === 'phone') {
      const formattedPhone = formatPhoneNumber(value);
      setFormData((prev) => ({ ...prev, [name]: formattedPhone }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    
    // Clear error for this field
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.guestName.trim()) {
      newErrors.guestName = 'Name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+1 \(\d{3}\) \d{3}-\d{4}$/.test(formData.phone)) {
      newErrors.phone = 'Phone must be in format: +1 (XXX) XXX-XXXX';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    } else {
      const selectedDate = new Date(formData.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.date = 'Date cannot be in the past';
      }
    }

    if (!formData.time) {
      newErrors.time = 'Time is required';
    }

    const partySize = parseInt(formData.partySize);
    if (isNaN(partySize) || partySize < 1 || partySize > 20) {
      newErrors.partySize = 'Party size must be between 1 and 20';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    console.log('=== FORM SUBMISSION DEBUG ===');
    console.log('Raw form data:', formData);
    console.log('Guest Name:', formData.guestName, '| Type:', typeof formData.guestName);
    console.log('Email:', formData.email, '| Type:', typeof formData.email);
    console.log('Phone:', formData.phone, '| Type:', typeof formData.phone);
    console.log('Phone Regex Test:', /^\+1 \(\d{3}\) \d{3}-\d{4}$/.test(formData.phone));
    console.log('Date:', formData.date, '| Type:', typeof formData.date);
    console.log('Date Regex Test:', /^\d{4}-\d{2}-\d{2}$/.test(formData.date));
    console.log('Time:', formData.time, '| Type:', typeof formData.time);
    console.log('Time Regex Test:', /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/.test(formData.time));
    console.log('Party Size:', formData.partySize, '| Type:', typeof formData.partySize);
    console.log('Notes:', formData.notes);

    if (!validateForm()) {
      console.log('Validation failed with errors:', errors);
      return;
    }

    setIsSubmitting(true);

    try {
      // Ensure date is in YYYY-MM-DD format
      let normalizedDate = formData.date;
      if (formData.date && !formData.date.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const dateObj = new Date(formData.date);
        normalizedDate = dateObj.toISOString().split('T')[0];
        console.log('Date normalized from', formData.date, 'to', normalizedDate);
      }

      // Normalize time to HH:mm format (remove seconds if present)
      const normalizedTime = formData.time.includes(':') 
        ? formData.time.split(':').slice(0, 2).join(':')
        : formData.time;

      const requestData = {
        guestName: formData.guestName,
        email: formData.email,
        phone: formData.phone,
        date: normalizedDate,
        time: normalizedTime,
        partySize: parseInt(formData.partySize),
        notes: formData.notes || undefined,
        source: 'WEB' as const,
      };

      console.log('=== REQUEST DATA TO BACKEND ===');
      console.log('Request object:', requestData);
      console.log('Stringified:', JSON.stringify(requestData, null, 2));

      const response = await createReservation(requestData);

      setResult(response);
    } catch (error) {
      console.error('Reservation error:', error);
      if (error instanceof Error) {
        setSubmitError(error.message);
      } else {
        setSubmitError('An error occurred while creating your reservation');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      guestName: '',
      email: '',
      phone: '',
      date: '',
      time: '',
      partySize: '2',
      notes: '',
    });
    setErrors({});
    setResult(null);
    setSubmitError('');
  };

  // Get minimum date (today)
  const minDate = new Date().toISOString().split('T')[0];

  // If we have a result, show the status view
  if (result) {
    return (
      <div className="status-view">
        {result.status === 'confirmed' && (
          <>
            <div className="status-icon success">✓</div>
            <h2 className="status-title">Reservation Confirmed!</h2>
            <p className="status-message">{result.message}</p>
            {result.reservation && (
              <div className="reservation-details">
                <div className="detail-row">
                  <span className="detail-label">Name</span>
                  <span className="detail-value">{result.reservation.guestName}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Date</span>
                  <span className="detail-value">
                    {new Date(result.reservation.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Time</span>
                  <span className="detail-value">{result.reservation.time}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Party Size</span>
                  <span className="detail-value">{result.reservation.partySize} people</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Email</span>
                  <span className="detail-value">{result.reservation.email}</span>
                </div>
              </div>
            )}
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
              A confirmation email has been sent to {formData.email}
            </p>
            <button onClick={handleReset} className="back-button">
              Make Another Reservation
            </button>
          </>
        )}

        {result.status === 'pending' && (
          <>
            <div className="status-icon pending">⏱</div>
            <h2 className="status-title">Request Received</h2>
            <p className="status-message">{result.message}</p>
            {result.reservation && (
              <div className="reservation-details">
                <div className="detail-row">
                  <span className="detail-label">Name</span>
                  <span className="detail-value">{result.reservation.guestName}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Date</span>
                  <span className="detail-value">
                    {new Date(result.reservation.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Time</span>
                  <span className="detail-value">{result.reservation.time}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Party Size</span>
                  <span className="detail-value">{result.reservation.partySize} people</span>
                </div>
              </div>
            )}
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
              We'll contact you at {formData.email} to confirm your reservation.
            </p>
            <button onClick={handleReset} className="back-button">
              Back to Home
            </button>
          </>
        )}

        {result.status === 'waitlisted' && (
          <>
            <div className="status-icon waitlisted">📋</div>
            <h2 className="status-title">Added to Waitlist</h2>
            <p className="status-message">{result.message}</p>
            {result.waitlistEntry && (
              <div className="reservation-details">
                <div className="detail-row">
                  <span className="detail-label">Name</span>
                  <span className="detail-value">{result.waitlistEntry.guestName}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Date</span>
                  <span className="detail-value">
                    {new Date(result.waitlistEntry.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Time</span>
                  <span className="detail-value">{result.waitlistEntry.time}</span>
                </div>
                <div className="detail-row">
                  <span className="detail-label">Party Size</span>
                  <span className="detail-value">{result.waitlistEntry.partySize} people</span>
                </div>
              </div>
            )}
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>
              We'll notify you at {formData.email} if a spot becomes available.
            </p>
            <button onClick={handleReset} className="back-button">
              Back to Home
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="reservation-form">
      {submitError && <div className="error-message">{submitError}</div>}

      {/* Debug Panel */}
      <div style={{
        background: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '24px',
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#0f0'
      }}>
        <div style={{ color: '#fff', marginBottom: '8px', fontWeight: 'bold' }}>📊 Debug Data Preview:</div>
        <div style={{ color: '#888' }}>Guest Name: <span style={{ color: '#0f0' }}>{formData.guestName || '(empty)'}</span></div>
        <div style={{ color: '#888' }}>Email: <span style={{ color: '#0f0' }}>{formData.email || '(empty)'}</span></div>
        <div style={{ color: '#888' }}>Phone: <span style={{ color: '#0f0' }}>{formData.phone || '(empty)'}</span> 
          {formData.phone && (
            <span style={{ color: /^\+1 \(\d{3}\) \d{3}-\d{4}$/.test(formData.phone) ? '#0f0' : '#f00' }}>
              {' '}[{/^\+1 \(\d{3}\) \d{3}-\d{4}$/.test(formData.phone) ? '✓' : '✗'} Pattern]
            </span>
          )}
        </div>
        <div style={{ color: '#888' }}>Date: <span style={{ color: '#0f0' }}>{formData.date || '(empty)'}</span>
          {formData.date && (
            <span style={{ color: /^\d{4}-\d{2}-\d{2}$/.test(formData.date) ? '#0f0' : '#f00' }}>
              {' '}[{/^\d{4}-\d{2}-\d{2}$/.test(formData.date) ? '✓' : '✗'} Pattern]
            </span>
          )}
        </div>
        <div style={{ color: '#888' }}>Time: <span style={{ color: '#0f0' }}>{formData.time || '(empty)'}</span>
          {formData.time && (
            <span style={{ color: /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/.test(formData.time) ? '#0f0' : '#f00' }}>
              {' '}[{/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/.test(formData.time) ? '✓' : '✗'} Pattern]
            </span>
          )}
        </div>
        <div style={{ color: '#888' }}>Party Size: <span style={{ color: '#0f0' }}>{formData.partySize}</span></div>
        <div style={{ color: '#888' }}>Notes: <span style={{ color: '#0f0' }}>{formData.notes || '(empty)'}</span></div>
      </div>

      <div className="form-group">
        <label htmlFor="guestName" className="form-label">
          Your Name *
        </label>
        <input
          type="text"
          id="guestName"
          name="guestName"
          value={formData.guestName}
          onChange={handleChange}
          className="form-input"
          placeholder="John Doe"
        />
        {errors.guestName && <span className="form-error">{errors.guestName}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="email" className="form-label">
          Email *
        </label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          className="form-input"
          placeholder="john@example.com"
        />
        {errors.email && <span className="form-error">{errors.email}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="phone" className="form-label">
          Phone Number *
        </label>
        <input
          type="tel"
          id="phone"
          name="phone"
          value={formData.phone}
          onChange={handleChange}
          className="form-input"
          placeholder="+1 (555) 123-4567"
        />
        {errors.phone && <span className="form-error">{errors.phone}</span>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="date" className="form-label">
            Date *
          </label>
          <input
            type="date"
            id="date"
            name="date"
            value={formData.date}
            onChange={handleChange}
            min={minDate}
            className="form-input"
          />
          {errors.date && <span className="form-error">{errors.date}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="time" className="form-label">
            Time *
          </label>
          <select
            id="time"
            name="time"
            value={formData.time}
            onChange={handleChange}
            className="form-select"
          >
            <option value="">Select a time</option>
            <option value="17:00">5:00 PM</option>
            <option value="17:30">5:30 PM</option>
            <option value="18:00">6:00 PM</option>
            <option value="18:30">6:30 PM</option>
            <option value="19:00">7:00 PM</option>
            <option value="19:30">7:30 PM</option>
            <option value="20:00">8:00 PM</option>
            <option value="20:30">8:30 PM</option>
            <option value="21:00">9:00 PM</option>
            <option value="21:30">9:30 PM</option>
            <option value="22:00">10:00 PM</option>
          </select>
          {errors.time && <span className="form-error">{errors.time}</span>}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="partySize" className="form-label">
          Party Size *
        </label>
        <select
          id="partySize"
          name="partySize"
          value={formData.partySize}
          onChange={handleChange}
          className="form-select"
        >
          {Array.from({ length: 20 }, (_, i) => i + 1).map((num) => (
            <option key={num} value={num}>
              {num} {num === 1 ? 'person' : 'people'}
            </option>
          ))}
        </select>
        {errors.partySize && <span className="form-error">{errors.partySize}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="notes" className="form-label">
          Special Requests (Optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          className="form-textarea"
          placeholder="Any special requests or dietary requirements?"
        />
      </div>

      <button type="submit" disabled={isSubmitting} className="submit-button">
        {isSubmitting ? (
          <>
            <div className="spinner" style={{ display: 'inline-block', width: 20, height: 20, marginRight: 8, verticalAlign: 'middle' }} />
            Processing...
          </>
        ) : (
          'Make Reservation'
        )}
      </button>
    </form>
  );
}
