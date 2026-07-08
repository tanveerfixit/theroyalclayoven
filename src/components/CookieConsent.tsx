import React from 'react';
import { ShieldCheck, Settings, ArrowRight } from 'lucide-react';

export function CookieConsent() {
  const [isVisible, setIsVisible] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [analytics, setAnalytics] = React.useState(true);
  const [marketing, setMarketing] = React.useState(true);

  React.useEffect(() => {
    const consent = localStorage.getItem('clay_oven_cookie_consent');
    if (!consent) {
      // Delay display slightly for smoother entrance transition
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const updateConsent = (preferences: { analytics: boolean; marketing: boolean }) => {
    localStorage.setItem('clay_oven_cookie_consent', JSON.stringify(preferences));
    
    if (window.gtag) {
      window.gtag('consent', 'update', {
        ad_storage: preferences.marketing ? 'granted' : 'denied',
        ad_user_data: preferences.marketing ? 'granted' : 'denied',
        ad_personalization: preferences.marketing ? 'granted' : 'denied',
        analytics_storage: preferences.analytics ? 'granted' : 'denied',
      });
    }
    
    setIsVisible(false);
  };

  const handleAcceptAll = () => {
    updateConsent({ analytics: true, marketing: true });
  };

  const handleDeclineAll = () => {
    updateConsent({ analytics: false, marketing: false });
  };

  const handleSavePreferences = () => {
    updateConsent({ analytics, marketing });
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 bg-brand-beige border-t border-brand-border shadow-2xl animate-slide-up">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
        
        {/* Consent Info / Text */}
        <div className="flex-1 space-y-2">
          <div className="flex items-center space-x-2 text-brand-accent">
            <ShieldCheck className="w-5 h-5" />
            <span className="font-mono text-xs font-bold tracking-widest uppercase">Privacy & Cookies Policy</span>
          </div>
          <h4 className="text-sm font-bold uppercase tracking-wider text-brand-dark">We respect your privacy</h4>
          <p className="text-xs text-brand-muted max-w-3xl leading-relaxed">
            We use cookies to optimize your reservation flow, remember your ordering details, and measure our website traffic to improve our authentic Pakistani dining experience. Select your preferred settings below.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center space-x-1.5 px-4 py-2.5 text-xs font-mono font-bold border border-brand-border text-brand-muted hover:border-brand-accent hover:text-brand-accent transition-all cursor-pointer"
            aria-label="Customize cookie settings"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>{showSettings ? 'Hide Options' : 'Customize'}</span>
          </button>
          
          <button
            onClick={handleDeclineAll}
            className="px-4 py-2.5 text-xs font-mono font-bold border border-brand-border text-brand-dark hover:border-brand-dark transition-all cursor-pointer"
          >
            Decline All
          </button>
          
          <button
            onClick={handleAcceptAll}
            className="flex items-center space-x-1.5 px-6 py-2.5 text-xs font-mono font-bold bg-brand-accent text-white hover:bg-brand-dark transition-all cursor-pointer"
          >
            <span>Accept All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Granular Settings Dropdown */}
      {showSettings && (
        <div className="max-w-7xl mx-auto mt-6 pt-6 border-t border-brand-border grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
          
          {/* Strictly Necessary */}
          <div className="p-4 border border-brand-border bg-white/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wide text-brand-dark">Necessary Cookies</span>
              <span className="text-[10px] font-mono font-bold tracking-widest text-brand-accent uppercase">Always Active</span>
            </div>
            <p className="text-[11px] text-brand-muted leading-relaxed">
              Required for basic site operation, shopping cart memory, and maintaining your authentication session.
            </p>
          </div>

          {/* Analytics Cookies */}
          <div className="p-4 border border-brand-border bg-white/40">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="analytics-cookies" className="text-xs font-bold uppercase tracking-wide text-brand-dark cursor-pointer">
                Analytics Cookies
              </label>
              <input
                id="analytics-cookies"
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="w-4 h-4 text-brand-accent border-brand-border focus:ring-brand-accent"
              />
            </div>
            <p className="text-[11px] text-brand-muted leading-relaxed">
              Allows Google Analytics measurement of page views, reservation frequency, and interface performance optimizations.
            </p>
          </div>

          {/* Marketing Cookies */}
          <div className="p-4 border border-brand-border bg-white/40">
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="marketing-cookies" className="text-xs font-bold uppercase tracking-wide text-brand-dark cursor-pointer">
                Marketing Cookies
              </label>
              <input
                id="marketing-cookies"
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="w-4 h-4 text-brand-accent border-brand-border focus:ring-brand-accent"
              />
            </div>
            <p className="text-[11px] text-brand-muted leading-relaxed">
              Enables advertising customization and measurement capabilities for Google Ads, helping personalize promotions.
            </p>
          </div>

          <div className="col-span-1 md:col-span-3 flex justify-end">
            <button
              onClick={handleSavePreferences}
              className="px-6 py-2.5 text-xs font-mono font-bold bg-brand-dark text-white hover:bg-brand-accent transition-all cursor-pointer"
            >
              Save Preferences
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
