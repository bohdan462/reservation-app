import { useState, FormEvent, ChangeEvent, useRef, useEffect } from 'react';
import { createReservation, CreateReservationResponse } from '../api/reservations';
import './ReservationForm.css';

interface FormData {
  guestName: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  partySize: string;
  customPartySize: string;
  specialOccasion: string;
  dietaryRestrictions: string[];
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

const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 17; hour <= 22; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      if (hour === 22 && minute > 0) break;
      const time24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      const hour12 = hour > 12 ? hour - 12 : hour;
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const time12 = `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
      const demandLevel = getDemandLevel(hour);
      slots.push({ value: time24, label: time12, demand: demandLevel });
    }
  }
  return slots;
};

const getDemandLevel = (hour: number): 'low' | 'medium' | 'high' | 'peak' => {
  if (hour === 19 || hour === 20) return 'peak';
  if (hour === 18 || hour === 21) return 'high';
  return 'medium';
};

const TIME_SLOTS = generateTimeSlots();

const DIETARY_OPTIONS = [
  { id: 'vegetarian', label: 'Vegetarian' },
  { id: 'vegan', label: 'Vegan' },
  { id: 'gluten-free', label: 'Gluten-Free' },
  { id: 'nut-allergy', label: 'Nut Allergy' },
  { id: 'dairy-free', label: 'Dairy-Free' },
  { id: 'halal', label: 'Halal' },
];

const OCCASION_OPTIONS = [
  { id: 'birthday', label: 'Birthday' },
  { id: 'anniversary', label: 'Anniversary' },
  { id: 'date', label: 'Date Night' },
  { id: 'business', label: 'Business' },
  { id: 'celebration', label: 'Celebration' },
];

const generateDateOptions = () => {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 5; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    // Use local date format to avoid UTC timezone shift
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    const dayName = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
    let label = i === 0 ? 'Today' : i === 1 ? 'Tmrw' : dayName;
    dates.push({ value: dateStr, label, day: date.getDate() });
  }
  return dates;
};

function FormSkeleton() {
  return (
    <div className="skeleton">
      <div className="skeleton-block">
        <div className="skeleton-line title"></div>
        <div className="skeleton-row">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="skeleton-chip"></div>
          ))}
        </div>
      </div>
      <div className="skeleton-block">
        <div className="skeleton-line title"></div>
        <div className="skeleton-row wide">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
            <div key={i} className="skeleton-chip wide"></div>
          ))}
        </div>
      </div>
      <div className="skeleton-block">
        <div className="skeleton-line title"></div>
        <div className="skeleton-row">
          {[1, 2, 3, 4, 5, 6, 7].map(i => (
            <div key={i} className="skeleton-chip square"></div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ReservationForm() {
  const [formData, setFormData] = useState<FormData>({
    guestName: '',
    email: '',
    phone: '',
    date: '',
    time: '',
    partySize: '',
    customPartySize: '',
    specialOccasion: '',
    dietaryRestrictions: [],
    notes: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<CreateReservationResponse | null>(null);
  const [submitError, setSubmitError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [showCalendar, setShowCalendar] = useState(false);
  const timeScrollRef = useRef<HTMLDivElement>(null);
  const DATE_OPTIONS = generateDateOptions();

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  

  const showTime = !!formData.date;
  const showPartySize = !!formData.time;
  const showOptional = !!formData.partySize;
  const showContact = showOptional;

  // Temporary on-screen debug overlay for mobile testing
  useEffect(() => {
    const id = 'rf-debug-overlay';
    let el = document.getElementById(id) as HTMLDivElement | null;
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      Object.assign(el.style, {
        position: 'fixed',
        bottom: '12px',
        right: '12px',
        background: 'rgba(0,0,0,0.7)',
        color: '#fff',
        padding: '8px 10px',
        borderRadius: '8px',
        fontSize: '12px',
        zIndex: '9999',
        maxWidth: '80vw',
        wordBreak: 'keep-all',
      });
      document.body.appendChild(el);
    }

    el.textContent = `isLoading:${isLoading} date:${formData.date || '-'} time:${formData.time || '-'} party:${formData.partySize || '-'} showContact:${showContact}`;

    return () => {
      const existing = document.getElementById(id);
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
    };
  }, [isLoading, formData.date, formData.time, formData.partySize, showContact]);

  useEffect(() => {
    if (formData.time && timeScrollRef.current) {
      const selectedSlot = timeScrollRef.current.querySelector('.chip.selected');
      if (selectedSlot) {
        selectedSlot.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [formData.time]);

  const formatPhoneNumber = (value: string): string => {
    let phoneNumber = value.replace(/\D/g, '');
    
    // Auto-prefix with 1 (US country code) if user starts typing without it
    if (phoneNumber.length > 0 && phoneNumber[0] !== '1') {
      phoneNumber = '1' + phoneNumber;
    }
    
    if (phoneNumber.length === 0) return '';
    if (phoneNumber.length === 1) return '+1';
    if (phoneNumber.length <= 4) return `+1 (${phoneNumber.slice(1)}`;
    if (phoneNumber.length <= 7) return `+1 (${phoneNumber.slice(1, 4)}) ${phoneNumber.slice(4)}`;
    return `+1 (${phoneNumber.slice(1, 4)}) ${phoneNumber.slice(4, 7)}-${phoneNumber.slice(7, 11)}`;
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      setFormData((prev) => ({ ...prev, [name]: formatPhoneNumber(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const toggleDietaryRestriction = (restriction: string) => {
    setFormData(prev => ({
      ...prev,
      dietaryRestrictions: prev.dietaryRestrictions.includes(restriction)
        ? prev.dietaryRestrictions.filter(r => r !== restriction)
        : [...prev.dietaryRestrictions, restriction]
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    if (!formData.guestName.trim()) newErrors.guestName = 'Name is required';
    if (!formData.email.trim()) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Invalid email';
    if (!formData.phone.trim()) newErrors.phone = 'Phone is required';
    else if (!/^\+1 \(\d{3}\) \d{3}-\d{4}$/.test(formData.phone)) newErrors.phone = 'Invalid format';
    if (!formData.date) newErrors.date = 'Select a date';
    if (!formData.time) newErrors.time = 'Select a time';
    const partySize = formData.partySize === 'custom' ? parseInt(formData.customPartySize) : parseInt(formData.partySize);
    if (isNaN(partySize) || partySize < 1 || partySize > 20) newErrors.partySize = 'Select party size';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const partySize = formData.partySize === 'custom' ? parseInt(formData.customPartySize) : parseInt(formData.partySize);
      let combinedNotes = formData.notes || '';
      if (formData.specialOccasion) {
        const occasion = OCCASION_OPTIONS.find(o => o.id === formData.specialOccasion);
        combinedNotes = `[${occasion?.label}] ${combinedNotes}`.trim();
      }
      if (formData.dietaryRestrictions.length > 0) {
        const restrictions = formData.dietaryRestrictions.map(r => DIETARY_OPTIONS.find(d => d.id === r)?.label).join(', ');
        combinedNotes = `${combinedNotes}\nDietary: ${restrictions}`.trim();
      }
      const response = await createReservation({
        guestName: formData.guestName,
        email: formData.email,
        phone: formData.phone,
        date: formData.date,
        time: formData.time.split(':').slice(0, 2).join(':'),
        partySize,
        notes: combinedNotes || undefined,
        source: 'WEB',
      });
      setResult(response);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({ guestName: '', email: '', phone: '', date: '', time: '', partySize: '', customPartySize: '', specialOccasion: '', dietaryRestrictions: [], notes: '' });
    setErrors({});
    setResult(null);
    setSubmitError('');
  };

  const minDate = new Date().toISOString().split('T')[0];

  if (isLoading) {
    return <FormSkeleton />;
  }

  if (result) {
    return (
      <div className="result">
        <div className={`result-icon ${result.status}`}>
          {result.status === 'confirmed' && '✓'}
          {result.status === 'pending' && '⏱'}
          {result.status === 'waitlisted' && '📋'}
        </div>
        <h2 className="result-title">
          {result.status === 'confirmed' && 'Reservation Confirmed'}
          {result.status === 'pending' && 'Request Received'}
          {result.status === 'waitlisted' && 'Added to Waitlist'}
        </h2>
        <p className="result-message">{result.message}</p>
        {(result.reservation || result.waitlistEntry) && (
          <div className="result-card">
            <div className="result-row">
              <span className="result-label">Date</span>
              <span className="result-value">
                {new Date((result.reservation || result.waitlistEntry)!.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div className="result-row">
              <span className="result-label">Time</span>
              <span className="result-value">{(result.reservation || result.waitlistEntry)!.time}</span>
            </div>
            <div className="result-row">
              <span className="result-label">Guests</span>
              <span className="result-value">{(result.reservation || result.waitlistEntry)!.partySize}</span>
            </div>
          </div>
        )}
        <p className="result-note">Confirmation sent to {formData.email}</p>
        <button onClick={handleReset} className="btn">Make Another Reservation</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      {submitError && <div className="error-banner">{submitError}</div>}

      {/* Date */}
      <section className="section visible">
        <h3 className="label">Select Date</h3>
        <div className="chips">
          {DATE_OPTIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => { setFormData(prev => ({ ...prev, date: d.value })); setErrors(prev => ({ ...prev, date: undefined })); }}
              className={`chip ${formData.date === d.value ? 'selected' : ''}`}
            >
              <span className="chip-sub">{d.label}</span>
              <span className="chip-main">{d.day}</span>
            </button>
          ))}
          <button 
            type="button" 
            onClick={() => setShowCalendar(!showCalendar)} 
            className={`chip ${showCalendar ? 'selected' : ''}`}
          >
            <span className="chip-sub">More</span>
            <span className="chip-main">📅</span>
          </button>
        </div>
        {showCalendar && (
          <input 
            type="date" 
            value={formData.date} 
            onChange={(e) => { handleChange(e); setShowCalendar(false); }} 
            name="date" 
            min={minDate} 
            className="input date-input" 
          />
        )}
        {errors.date && <span className="error-text">{errors.date}</span>}
      </section>

      {/* Time */}
      <section className={`section ${showTime ? 'visible' : ''}`}>
        <h3 className="label">Select Time</h3>
        <div className="chips scroll" ref={timeScrollRef}>
          {TIME_SLOTS.map((slot) => (
            <button
              key={slot.value}
              type="button"
              onClick={() => { setFormData(prev => ({ ...prev, time: slot.value })); setErrors(prev => ({ ...prev, time: undefined })); }}
              className={`chip time ${formData.time === slot.value ? 'selected' : ''} ${slot.demand === 'peak' ? 'peak' : ''}`}
            >
              {slot.label}
              {slot.demand === 'peak' && <span className="peak-dot"></span>}
            </button>
          ))}
        </div>
        {errors.time && <span className="error-text">{errors.time}</span>}
      </section>

      {/* Party Size */}
      <section className={`section ${showPartySize ? 'visible' : ''}`}>
        <h3 className="label">Number of Guests</h3>
        <div className="chips">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => { setFormData(prev => ({ ...prev, partySize: n.toString(), customPartySize: '' })); setErrors(prev => ({ ...prev, partySize: undefined })); }}
              className={`chip square ${formData.partySize === n.toString() ? 'selected' : ''}`}
            >
              {n}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setFormData(prev => ({ ...prev, partySize: 'custom' }))}
            className={`chip square ${formData.partySize === 'custom' ? 'selected' : ''}`}
          >
            7+
          </button>
        </div>
        {formData.partySize === 'custom' && (
          <div className="custom-row">
            <input
              type="number"
              min="7"
              max="20"
              value={formData.customPartySize}
              onChange={(e) => setFormData(prev => ({ ...prev, customPartySize: e.target.value }))}
              placeholder="7"
              className="input small"
              autoFocus
            />
            <span className="hint">guests</span>
          </div>
        )}
        {errors.partySize && <span className="error-text">{errors.partySize}</span>}
      </section>

      {/* Special Occasion */}
      <section className={`section ${showOptional ? 'visible' : ''}`}>
        <h3 className="label">Special Occasion <span className="optional">optional</span></h3>
        <div className="chips wrap">
          {OCCASION_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, specialOccasion: prev.specialOccasion === o.id ? '' : o.id }))}
              className={`chip pill ${formData.specialOccasion === o.id ? 'selected' : ''}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </section>

      {/* Dietary */}
      <section className={`section ${showOptional ? 'visible' : ''}`}>
        <h3 className="label">Dietary Needs <span className="optional">optional</span></h3>
        <div className="chips wrap">
          {DIETARY_OPTIONS.map((d) => (
            <button
              key={d.id}
              type="button"
              onClick={() => toggleDietaryRestriction(d.id)}
              className={`chip pill ${formData.dietaryRestrictions.includes(d.id) ? 'selected' : ''}`}
            >
              {d.label}
            </button>
          ))}
        </div>
      </section>

      {/* Notes */}
      <section className={`section ${showOptional ? 'visible' : ''}`}>
        <h3 className="label">Additional Notes <span className="optional">optional</span></h3>
        <textarea
          name="notes"
          value={formData.notes}
          onChange={handleChange}
          placeholder="Seating preferences, accessibility needs..."
          className="input textarea"
          rows={2}
        />
      </section>

      {/* Contact */}
      <section className={`section contact ${showContact ? 'visible' : ''}`}>
        <h3 className="label">Your Details</h3>
        
        <div className="oauth-row">
          <button type="button" className="oauth google" disabled>
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google
          </button>
          <button type="button" className="oauth apple" disabled>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            Apple
          </button>
        </div>

        <div className="divider"><span>or enter details</span></div>

        <div className="fields">
          <div className="field">
            <label className="field-label">Full Name</label>
            <input 
              type="text" 
              name="guestName" 
              value={formData.guestName} 
              onChange={handleChange} 
              placeholder="John Doe" 
              className={`input ${errors.guestName ? 'error' : ''}`} 
            />
            {errors.guestName && <span className="error-text">{errors.guestName}</span>}
          </div>
          <div className="field-row">
            <div className="field">
              <label className="field-label">Email</label>
              <input 
                type="email" 
                name="email" 
                value={formData.email} 
                onChange={handleChange} 
                placeholder="john@example.com" 
                className={`input ${errors.email ? 'error' : ''}`} 
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>
            <div className="field">
              <label className="field-label">Phone</label>
              <input 
                type="tel" 
                name="phone" 
                value={formData.phone} 
                onChange={handleChange} 
                placeholder="+1 (555) 123-4567" 
                className={`input ${errors.phone ? 'error' : ''}`} 
              />
              {errors.phone && <span className="error-text">{errors.phone}</span>}
            </div>
          </div>
        </div>

        <button type="submit" disabled={isSubmitting} className="btn submit">
          {isSubmitting ? (
            <>
              <span className="spinner"></span>
              Processing...
            </>
          ) : (
            'Complete Reservation'
          )}
        </button>
      </section>
    </form>
  );
}
