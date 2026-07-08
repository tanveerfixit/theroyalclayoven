import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.tsx';
import './index.css';

declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

// Securely load and initialize Google Tag dynamically to avoid inline script CSP issues
if (typeof window !== 'undefined') {
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=G-DDQKPQ4NSE';
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function (...args: any[]) {
    window.dataLayer.push(args);
  };
  window.gtag('js', new Date());

  // Determine initial consent state from localStorage
  let hasConsent = { analytics: false, marketing: false };
  try {
    const saved = localStorage.getItem('clay_oven_cookie_consent');
    if (saved) {
      hasConsent = JSON.parse(saved);
    }
  } catch (err) {
    console.error('Failed to read cookie consent from storage:', err);
  }

  // Configure Google Consent Mode v2 default states
  window.gtag('consent', 'default', {
    ad_storage: hasConsent.marketing ? 'granted' : 'denied',
    ad_user_data: hasConsent.marketing ? 'granted' : 'denied',
    ad_personalization: hasConsent.marketing ? 'granted' : 'denied',
    analytics_storage: hasConsent.analytics ? 'granted' : 'denied',
    wait_for_update: 500
  });

  window.gtag('config', 'G-DDQKPQ4NSE');
}

const GOOGLE_CLIENT_ID = '1002488832719-mkmp4n48l15f0rbsqdec95phfj6h7apm.apps.googleusercontent.com';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <App />
    </GoogleOAuthProvider>
  </StrictMode>,
);

