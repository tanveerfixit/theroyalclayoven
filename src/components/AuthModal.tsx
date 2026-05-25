import React, { useState } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  // Mobile active tab view toggle
  const [mobileTab, setMobileTab] = useState<'login' | 'signup'>('login');

  // Input states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Custom Google Login Hook
  const googleLoginTrigger = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        // Fetch user profile from google userinfo API
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        });
        if (userInfoRes.ok) {
          const decoded = await userInfoRes.json();
          const userProfile: UserProfile = {
            name: decoded.name,
            picture: decoded.picture,
            email: decoded.email
          };

          // Sync with Hostinger MySQL Database
          const response = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userProfile)
          });

          if (response.ok) {
            const dbUser = await response.json();
            const finalProfile = {
              ...userProfile,
              phone: dbUser.phone || undefined,
              eircode: dbUser.eircode || undefined,
              address: dbUser.address || undefined,
              dietaryPreferences: dbUser.dietaryPreferences || undefined
            };
            onLoginSuccess(finalProfile);
            setSuccessMessage('Successfully Authenticated via Google!');
            setTimeout(() => {
              setSuccessMessage('');
              onClose();
            }, 1500);
          }
        }
      } catch (err) {
        console.error('Google token exchange or DB sync failed', err);
        setErrorMessage('Failed to link Google account.');
      }
    },
    onError: () => {
      setErrorMessage('Google Authentication failed.');
    }
  });

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!loginEmail.trim() || !loginPassword) {
      setErrorMessage('Please fill in all email and password fields.');
      return;
    }
    
    // Simulate standard credential validation
    setSuccessMessage('Successfully Authenticated!');
    setTimeout(() => {
      setSuccessMessage('');
      onLoginSuccess({
        name: loginEmail.split('@')[0],
        email: loginEmail,
        picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120'
      });
      onClose();
    }, 1500);
  };

  const handleSignupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (!signupEmail.trim() || !signupPassword || !signupConfirmPassword) {
      setErrorMessage('All signup fields are required.');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setErrorMessage('Confirm password must match create password.');
      return;
    }

    setSuccessMessage('Registration Successful! Logging you in...');
    setTimeout(() => {
      setSuccessMessage('');
      onLoginSuccess({
        name: signupEmail.split('@')[0],
        email: signupEmail,
        picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120'
      });
      onClose();
    }, 1500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/60 animate-fade-in">
      
      {/* Flat Single Card Panel - sharp corners, thin border, no heavy shadow */}
      <div className="relative w-full max-w-md bg-white border border-brand-dark/15 p-8 flex flex-col space-y-6 overflow-y-auto max-h-[90vh] rounded-none">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 hover:bg-brand-dark hover:text-white transition-colors rounded-none"
          aria-label="Close portal modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Global Notifications Alert Banner */}
        {errorMessage && (
          <div className="p-3 bg-red-50 text-red-800 text-xs font-mono border border-red-200 text-center animate-shake">
            ★ {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-mono border border-emerald-200 text-center animate-pulse">
            ✓ {successMessage}
          </div>
        )}

        {mobileTab === 'login' ? (
          /* SINGLE CLEAN LOGIN VIEW */
          <div className="flex flex-col space-y-6">
            <h2 className="font-serif text-2xl font-bold text-center text-brand-dark">Login</h2>
            
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="flex flex-col space-y-4">
                <input
                  type="email"
                  placeholder="Email Address"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full border border-brand-dark/15 px-4 py-3 text-sm font-mono focus:border-brand-accent outline-none bg-brand-beige/5 rounded-none"
                  required
                />

                <div className="relative w-full">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full border border-brand-dark/15 pl-4 pr-10 py-3 text-sm font-mono focus:border-brand-accent outline-none bg-brand-beige/5 rounded-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-brand-muted hover:text-brand-dark"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setErrorMessage('Contact support at customers@clayoven.ie for credentials recovery.')}
                    className="font-mono text-[11px] text-brand-muted hover:text-brand-accent transition-colors underline"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-brand-dark text-white hover:bg-brand-accent py-3.5 text-xs font-mono uppercase tracking-widest font-bold transition-colors rounded-none"
              >
                Login
              </button>
            </form>

            <div className="space-y-4">
              <p className="text-center font-mono text-[11px] text-brand-muted">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setErrorMessage(''); setMobileTab('signup'); }}
                  className="text-brand-accent font-bold hover:underline"
                >
                  Signup
                </button>
              </p>

              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-brand-dark/10"></div>
                </div>
                <span className="relative px-3 bg-white font-mono text-[10px] text-brand-muted uppercase">Or</span>
              </div>

              <button
                type="button"
                onClick={() => googleLoginTrigger()}
                className="w-full border border-brand-dark/15 bg-white hover:bg-brand-dark/5 py-3.5 text-xs font-mono uppercase tracking-widest font-bold text-brand-dark flex items-center justify-center space-x-2 transition-all rounded-none"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-.14 3.01-1.01 4.22l3.12 2.42c1.83-1.69 2.94-4.19 2.94-6.49z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.97-1.09 7.96-2.92l-3.12-2.42c-.9.6-2.01.99-3.24.99-3.11 0-5.74-2.11-6.68-4.96L3.74 17.65C5.71 21.43 9.53 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.32 14.7c-.24-.7-.38-1.4-.38-2.2s.14-1.5.38-2.2L1.74 7.37C.63 9.49 0 11.75 0 14s.63 4.51 1.74 6.63l3.58-2.93z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.22 0 12 0 9.53 0 5.71 2.57 3.74 6.35l3.58 2.93c.94-2.85 3.57-4.53 6.68-4.53z"/>
                </svg>
                <span>Login with Google</span>
              </button>
            </div>
          </div>
        ) : (
          /* SINGLE CLEAN SIGNUP VIEW */
          <div className="flex flex-col space-y-6">
            <h2 className="font-serif text-2xl font-bold text-center text-brand-dark">Signup</h2>
            
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              <div className="flex flex-col space-y-4">
                <input
                  type="email"
                  placeholder="Email Address"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="w-full border border-brand-dark/15 px-4 py-3 text-sm font-mono focus:border-brand-accent outline-none bg-brand-beige/5 rounded-none"
                  required
                />

                <input
                  type="password"
                  placeholder="Create password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  className="w-full border border-brand-dark/15 px-4 py-3 text-sm font-mono focus:border-brand-accent outline-none bg-brand-beige/5 rounded-none"
                  required
                />

                <div className="relative w-full">
                  <input
                    type={showSignupConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm password"
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    className="w-full border border-brand-dark/15 pl-4 pr-10 py-3 text-sm font-mono focus:border-brand-accent outline-none bg-brand-beige/5 rounded-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-brand-muted hover:text-brand-dark"
                  >
                    {showSignupConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-brand-dark text-white hover:bg-brand-accent py-3.5 text-xs font-mono uppercase tracking-widest font-bold transition-colors rounded-none"
              >
                Signup
              </button>
            </form>

            <div className="space-y-4">
              <p className="text-center font-mono text-[11px] text-brand-muted">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setErrorMessage(''); setMobileTab('login'); }}
                  className="text-brand-accent font-bold hover:underline"
                >
                  Login
                </button>
              </p>

              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-brand-dark/10"></div>
                </div>
                <span className="relative px-3 bg-white font-mono text-[10px] text-brand-muted uppercase">Or</span>
              </div>

              <button
                type="button"
                onClick={() => googleLoginTrigger()}
                className="w-full border border-brand-dark/15 bg-white hover:bg-brand-dark/5 py-3.5 text-xs font-mono uppercase tracking-widest font-bold text-brand-dark flex items-center justify-center space-x-2 transition-all rounded-none"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-.14 3.01-1.01 4.22l3.12 2.42c1.83-1.69 2.94-4.19 2.94-6.49z"/>
                  <path fill="#34A853" d="M12 24c3.24 0 5.97-1.09 7.96-2.92l-3.12-2.42c-.9.6-2.01.99-3.24.99-3.11 0-5.74-2.11-6.68-4.96L3.74 17.65C5.71 21.43 9.53 24 12 24z"/>
                  <path fill="#FBBC05" d="M5.32 14.7c-.24-.7-.38-1.4-.38-2.2s.14-1.5.38-2.2L1.74 7.37C.63 9.49 0 11.75 0 14s.63 4.51 1.74 6.63l3.58-2.93z"/>
                  <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.22 0 12 0 9.53 0 5.71 2.57 3.74 6.35l3.58 2.93c.94-2.85 3.57-4.53 6.68-4.53z"/>
                </svg>
                <span>Login with Google</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
