# Frontend Web

React + Vite guest-facing reservation form for the restaurant reservation system.

## Features

- Mobile-native design with overlay modal appearance
- Real-time form validation
- Responsive layout
- Three result states: Confirmed, Pending, and Waitlisted
- Clean, modern UI with gradient design

## Setup

1. Install dependencies:
```bash
npm install
```

2. Make sure the backend is running on port 3001

## Development

```bash
npm run dev
```

The app will start on http://localhost:5173

## Building for Production

```bash
npm run build
```

The build output will be in the `dist` folder.

## Embedding in WordPress

To embed this app in a WordPress page:

1. Build the production version
2. Upload the contents of `dist/` to your WordPress site
3. Add the following to your WordPress page:

```html
<div id="reservation-widget"></div>
<script type="module" src="/path/to/dist/assets/index-[hash].js"></script>
```

Alternatively, you can open it in an overlay modal using JavaScript:

```javascript
// Create overlay
const overlay = document.createElement('div');
overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;';

const iframe = document.createElement('iframe');
iframe.src = 'https://yoursite.com/reservations';
iframe.style.cssText = 'width:100%;max-width:500px;height:90vh;border:none;border-radius:20px;';

overlay.appendChild(iframe);
document.body.appendChild(overlay);

// Close on overlay click
overlay.addEventListener('click', (e) => {
  if (e.target === overlay) {
    overlay.remove();
  }
});
```

## Tech Stack

- React 18
- TypeScript
- Vite
- CSS Modules
- Fetch API for HTTP requests
