import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { HistoryView } from './HistoryView';

export const ProfileView: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'details' | 'transactions'>('details');

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [eircode, setEircode] = useState('');
  const [address, setAddress] = useState('');
  const [dietary, setDietary] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('clay_oven_google_user');
    if (stored) {
      try {
        const parsed: UserProfile = JSON.parse(stored);
        setProfile(parsed);
        setName(parsed.name || '');
        setPhone(parsed.phone || '');
        setEircode(parsed.eircode || '');
        setAddress(parsed.address || '');
        setDietary(parsed.dietaryPreferences || '');
      } catch (err) {
        console.error('Failed to parse user profile', err);
      }
    }
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    const updatedProfile: UserProfile = {
      ...profile,
      name,
      phone,
      eircode,
      address,
      dietaryPreferences: dietary
    };

    localStorage.setItem('clay_oven_google_user', JSON.stringify(updatedProfile));
    setProfile(updatedProfile);
    setIsEditing(false);
    setSaveSuccess(true);
    
    // Dispatch a custom event to notify Navbar or other components of the update
    window.dispatchEvent(new Event('profile_updated'));

    setTimeout(() => setSaveSuccess(false), 3000);
  };

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-serif text-3xl font-bold text-brand-dark">Not Logged In</h2>
        <p className="text-brand-muted font-mono text-sm uppercase tracking-widest">Please sign in to view your profile</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 md:py-16 space-y-10">
      
      {/* Editorial Title Block */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-brand-dark/10">
        <div className="space-y-2">
          <h2 className="font-serif text-4xl font-bold text-brand-dark tracking-tight">
            Your Profile
          </h2>
          <p className="font-mono text-[11px] tracking-widest text-brand-muted uppercase">
            Manage your personal details and preferences
          </p>
        </div>
        {saveSuccess && (
          <span className="font-mono text-xs uppercase font-bold tracking-widest text-emerald-700 animate-pulse">
            Saved Successfully
          </span>
        )}
      </div>

      {/* Sub-tabs Minimalist Navigation */}
      <div className="flex space-x-8 border-b border-brand-dark/10">
        <button
          onClick={() => {
            setActiveSubTab('details');
            setIsEditing(false);
          }}
          className={`pb-4 font-mono text-xs font-bold uppercase tracking-widest border-b-2 transition-all duration-200 ${
            activeSubTab === 'details'
              ? 'border-brand-dark text-brand-dark'
              : 'border-transparent text-brand-muted hover:text-brand-dark'
          }`}
        >
          Profile Details
        </button>
        <button
          onClick={() => setActiveSubTab('transactions')}
          className={`pb-4 font-mono text-xs font-bold uppercase tracking-widest border-b-2 transition-all duration-200 ${
            activeSubTab === 'transactions'
              ? 'border-brand-dark text-brand-dark'
              : 'border-transparent text-brand-muted hover:text-brand-dark'
          }`}
        >
          My Transactions
        </button>
      </div>

      {/* Main Content Area */}
      {activeSubTab === 'details' ? (
        <div className="space-y-12 animate-fade-in">
          
          {/* Header Card - Clean & Flat */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-8">
            <img 
              src={profile.picture} 
              alt={profile.name} 
              className="w-20 h-20 rounded-full filter grayscale hover:grayscale-0 transition-all duration-300 border border-brand-dark/10 p-1"
              referrerPolicy="no-referrer"
            />
            <div className="text-center sm:text-left flex-grow space-y-2">
              <h3 className="font-serif text-2xl font-bold text-brand-dark">{profile.name}</h3>
              <p className="text-brand-muted font-mono text-sm">{profile.email}</p>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2">
                <span className="text-[10px] text-brand-accent font-mono uppercase tracking-widest bg-brand-accent/5 px-2.5 py-1">
                  Google Account Verified
                </span>
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="font-mono text-xs font-bold uppercase tracking-wider text-brand-dark hover:text-brand-accent transition-colors"
                  >
                    Edit Details
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Form / Display - Flat Design */}
          {isEditing ? (
            <form onSubmit={handleSave} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-8 gap-x-12">
                
                <div className="space-y-1">
                  <label className="block text-[11px] font-mono font-bold text-brand-muted uppercase tracking-widest">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-transparent border-b border-brand-dark/20 focus:border-brand-dark py-2 font-sans text-brand-dark focus:outline-none transition-colors rounded-none"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-mono font-bold text-brand-muted uppercase tracking-widest">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+353 XXX XXXX"
                    className="w-full bg-transparent border-b border-brand-dark/20 focus:border-brand-dark py-2 font-sans text-brand-dark focus:outline-none transition-colors rounded-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-mono font-bold text-brand-muted uppercase tracking-widest">
                    Eircode
                  </label>
                  <input
                    type="text"
                    value={eircode}
                    onChange={(e) => setEircode(e.target.value.toUpperCase())}
                    placeholder="e.g. V14 AW71"
                    className="w-full bg-transparent border-b border-brand-dark/20 focus:border-brand-dark py-2 font-sans text-brand-dark focus:outline-none transition-colors rounded-none uppercase"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="block text-[11px] font-mono font-bold text-brand-muted uppercase tracking-widest">
                    Address Detail
                  </label>
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    placeholder="House/Apartment number, street name, town, county..."
                    className="w-full bg-transparent border-b border-brand-dark/20 focus:border-brand-dark py-2 font-sans text-brand-dark focus:outline-none transition-colors rounded-none resize-none"
                  />
                </div>

                <div className="space-y-1 md:col-span-2">
                  <label className="block text-[11px] font-mono font-bold text-brand-muted uppercase tracking-widest">
                    Dietary Preferences & Allergies
                  </label>
                  <input
                    type="text"
                    value={dietary}
                    onChange={(e) => setDietary(e.target.value)}
                    placeholder="e.g. Vegetarian, Gluten-Free"
                    className="w-full bg-transparent border-b border-brand-dark/20 focus:border-brand-dark py-2 font-sans text-brand-dark focus:outline-none transition-colors rounded-none"
                  />
                </div>
              </div>

              <div className="pt-6 flex justify-end space-x-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setName(profile.name || '');
                    setPhone(profile.phone || '');
                    setEircode(profile.eircode || '');
                    setAddress(profile.address || '');
                    setDietary(profile.dietaryPreferences || '');
                  }}
                  className="font-mono text-xs font-bold uppercase tracking-wider text-brand-muted hover:text-brand-dark transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-brand-dark text-white px-8 py-3.5 font-mono text-xs font-bold uppercase tracking-widest hover:bg-brand-accent transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-12">
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono font-bold text-brand-muted uppercase tracking-widest block">
                  Phone Number
                </span>
                <p className="font-sans text-brand-dark text-lg">
                  {profile.phone || <span className="text-brand-muted/40 italic text-sm">Not provided</span>}
                </p>
              </div>
              
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono font-bold text-brand-muted uppercase tracking-widest block">
                  Dietary Preferences
                </span>
                <p className="font-sans text-brand-dark text-lg">
                  {profile.dietaryPreferences || <span className="text-brand-muted/40 italic text-sm">None specified</span>}
                </p>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-mono font-bold text-brand-muted uppercase tracking-widest block">
                  Eircode
                </span>
                <p className="font-sans text-brand-dark text-lg uppercase">
                  {profile.eircode || <span className="text-brand-muted/40 italic text-sm">Not provided</span>}
                </p>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <span className="text-[11px] font-mono font-bold text-brand-muted uppercase tracking-widest block">
                  Address Detail
                </span>
                <p className="font-sans text-brand-dark text-lg whitespace-pre-line leading-relaxed">
                  {profile.address || <span className="text-brand-muted/40 italic text-sm">No address detail saved</span>}
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="animate-fade-in">
          <HistoryView hideHeader={true} />
        </div>
      )}
      
      {/* Success Toast */}
      {saveSuccess && (
        <div className="fixed bottom-6 right-6 bg-brand-dark text-white font-mono text-[11px] uppercase font-bold tracking-widest px-6 py-3 shadow-xl z-50">
          Profile Updated
        </div>
      )}
    </div>
  );
};
