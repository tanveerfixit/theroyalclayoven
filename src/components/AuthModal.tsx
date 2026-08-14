import React, { useState } from 'react';
import { Eye, EyeOff, X, Loader2 } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: UserProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  // Authentication Modes: 'login' | 'signup' | 'forgot' | 'reset'
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>('login');

  // Input states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);

  // Forgot password & Reset inputs
  const [resetOtp, setResetOtp] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  // Refs for tracking timer
  const timerRef = React.useRef<any>(null);
  const googleTimeoutRef = React.useRef<any>(null);

  React.useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (googleTimeoutRef.current) clearTimeout(googleTimeoutRef.current);
    };
  }, []);

  const startResendTimer = () => {
    setResendTimer(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // Custom Google Login Hook with fast optimistic login & background sync
  const googleLoginTrigger = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        });

        if (!userInfoRes.ok) {
          throw new Error('Could not retrieve profile from Google.');
        }

        const decoded = await userInfoRes.json();
        const userProfile: UserProfile = {
          name: decoded.name || 'Google User',
          picture: decoded.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120',
          email: decoded.email
        };

        // 1. Instant optimistic login & close modal immediately
        localStorage.setItem('clay_oven_google_user', JSON.stringify(userProfile));
        onLoginSuccess(userProfile);
        window.dispatchEvent(new Event('profile_updated'));
        onClose();

        // 2. Asynchronous background database synchronization
        fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userProfile)
        }).then(async (res) => {
          if (res.ok) {
            const dbUser = await res.json();
            if (dbUser.adminToken) {
              localStorage.setItem('clay_oven_admin_token', dbUser.adminToken);
              window.dispatchEvent(new Event('admin_session_updated'));
            }
            if (dbUser.phone || dbUser.address || dbUser.eircode || dbUser.dietaryPreferences) {
              const enrichedProfile: UserProfile = {
                ...userProfile,
                phone: dbUser.phone || undefined,
                address: dbUser.address || undefined,
                eircode: dbUser.eircode || undefined,
                dietaryPreferences: dbUser.dietaryPreferences || undefined
              };
              localStorage.setItem('clay_oven_google_user', JSON.stringify(enrichedProfile));
              onLoginSuccess(enrichedProfile);
              window.dispatchEvent(new Event('profile_updated'));
            }
          }
        }).catch((syncErr) => {
          console.warn('Background profile sync deferred:', syncErr);
        });

      } catch (err: any) {
        console.error('Google token exchange or DB sync failed', err);
        setErrorMessage(err.message || 'Failed to complete Google authentication.');
      } finally {
        setIsGoogleLoading(false);
      }
    },
    onError: (errRes) => {
      console.warn('Google authentication cancelled or closed:', errRes);
      setIsGoogleLoading(false);
      setErrorMessage('Google Authentication was cancelled.');
    }
  });

  const handleGoogleClick = () => {
    setIsGoogleLoading(true);
    setErrorMessage('');
    // Safety guard timeout to reset button if popup is closed outside lifecycle
    if (googleTimeoutRef.current) clearTimeout(googleTimeoutRef.current);
    googleTimeoutRef.current = setTimeout(() => {
      setIsGoogleLoading(false);
    }, 15000);
    googleLoginTrigger();
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    if (!loginEmail.trim() || !loginPassword) {
      setErrorMessage('Please fill in all email and password fields.');
      return;
    }
    
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim(), password: loginPassword })
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      onLoginSuccess({
        name: data.name,
        email: data.email,
        picture: data.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120',
        phone: data.phone || undefined,
        address: data.address || undefined,
        eircode: data.eircode || undefined,
        dietaryPreferences: data.dietaryPreferences || undefined
      });
      onClose();
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMessage(err.message || 'Failed to authenticate. Please check credentials.');
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    if (!signupEmail.trim() || !signupPassword || !signupConfirmPassword || !signupName.trim()) {
      setErrorMessage('All signup fields are required.');
      return;
    }
    if (signupPassword !== signupConfirmPassword) {
      setErrorMessage('Confirm password must match create password.');
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: signupEmail.trim(),
          password: signupPassword,
          name: signupName.trim()
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      onLoginSuccess({
        name: data.name,
        email: data.email,
        picture: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120'
      });
      onClose();
    } catch (err: any) {
      console.error('Signup error:', err);
      setErrorMessage(err.message || 'Registration failed.');
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    if (!loginEmail.trim()) {
      setErrorMessage('Please enter your email address to reset password.');
      return;
    }

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim() })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to request OTP');
      }

      setSuccessMessage('OTP verification code has been dispatched to your email.');
      setAuthMode('reset');
      startResendTimer();
    } catch (err: any) {
      console.error('Forgot password error:', err);
      setErrorMessage(err.message || 'Failed to dispatch verification code.');
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim() })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to resend OTP');
      }

      setSuccessMessage('A fresh OTP passcode has been sent to your email!');
      startResendTimer();
    } catch (err: any) {
      console.error('Resend OTP error:', err);
      setErrorMessage(err.message || 'Failed to resend verification code.');
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!resetOtp.trim() || !resetPassword || !resetConfirmPassword) {
      setErrorMessage('All reset fields are required.');
      return;
    }

    if (resetPassword !== resetConfirmPassword) {
      setErrorMessage('Confirm password must match your new password.');
      return;
    }

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim(),
          otp: resetOtp.trim(),
          newPassword: resetPassword
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Reset password failed');
      }

      setSuccessMessage('Password reset successful! Please log in.');
      setAuthMode('login');
      setLoginPassword('');
      setResetOtp('');
      setResetPassword('');
      setResetConfirmPassword('');
    } catch (err: any) {
      console.error('Reset password error:', err);
      setErrorMessage(err.message || 'Failed to reset password. Please check your verification code.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-brand-dark/60 backdrop-blur-[2px] animate-fade-in">
      
      {/* Flat Single Card Panel - sharp corners, clean borders, perfectly proportioned on mobile & desktop */}
      <div className="relative w-full max-w-md bg-white border border-brand-dark/15 p-5 sm:p-7 flex flex-col space-y-4 sm:space-y-5 overflow-y-auto max-h-[92vh] rounded-none shadow-2xl">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 p-1.5 hover:bg-brand-dark hover:text-white transition-colors rounded-none"
          aria-label="Close portal modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Global Notifications Alert Banner */}
        {errorMessage && (
          <div className="p-2.5 sm:p-3 bg-red-50 text-red-800 text-xs font-mono border border-red-200 text-center animate-shake">
            ★ {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="p-2.5 sm:p-3 bg-emerald-50 text-emerald-800 text-xs font-mono border border-emerald-200 text-center animate-pulse">
            ✓ {successMessage}
          </div>
        )}

        {authMode === 'login' && (
          /* SINGLE CLEAN LOGIN VIEW */
          <div className="flex flex-col space-y-4 sm:space-y-5 animate-fade-in">
            <h2 className="font-serif text-2xl font-bold text-center text-brand-dark">Login</h2>
            
            <form onSubmit={handleLoginSubmit} className="space-y-3 sm:space-y-4">
              <div className="flex flex-col space-y-3 sm:space-y-3.5">
                <input
                  type="email"
                  placeholder="Email Address"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full border border-brand-dark/15 px-3.5 py-2.5 sm:px-4 sm:py-3 text-sm font-mono focus:border-brand-accent outline-none bg-brand-beige/5 rounded-none"
                  required
                />

                <div className="relative w-full">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    placeholder="Password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full border border-brand-dark/15 pl-3.5 pr-10 py-2.5 sm:pl-4 sm:pr-10 sm:py-3 text-sm font-mono focus:border-brand-accent outline-none bg-brand-beige/5 rounded-none"
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
                    onClick={() => { setErrorMessage(''); setSuccessMessage(''); setAuthMode('forgot'); }}
                    className="font-mono text-[11px] text-brand-muted hover:text-brand-accent transition-colors underline"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-brand-dark text-white hover:bg-brand-accent py-3 sm:py-3.5 text-xs font-mono uppercase tracking-widest font-bold transition-colors rounded-none"
              >
                Login
              </button>
            </form>

            <div className="space-y-3 sm:space-y-4">
              <p className="text-center font-mono text-[11px] text-brand-muted">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setErrorMessage(''); setSuccessMessage(''); setAuthMode('signup'); }}
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
                disabled={isGoogleLoading}
                onClick={handleGoogleClick}
                className="w-full border border-brand-dark/15 bg-white hover:bg-brand-dark/5 disabled:opacity-60 disabled:cursor-not-allowed py-3 sm:py-3.5 text-xs font-mono uppercase tracking-widest font-bold text-brand-dark flex items-center justify-center space-x-2 transition-all rounded-none"
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-brand-dark shrink-0" />
                    <span>Connecting with Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-.14 3.01-1.01 4.22l3.12 2.42c1.83-1.69 2.94-4.19 2.94-6.49z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.97-1.09 7.96-2.92l-3.12-2.42c-.9.6-2.01.99-3.24.99-3.11 0-5.74-2.11-6.68-4.96L3.74 17.65C5.71 21.43 9.53 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.32 14.7c-.24-.7-.38-1.4-.38-2.2s.14-1.5.38-2.2L1.74 7.37C.63 9.49 0 11.75 0 14s.63 4.51 1.74 6.63l3.58-2.93z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.22 0 12 0 9.53 0 5.71 2.57 3.74 6.35l3.58 2.93c.94-2.85 3.57-4.53 6.68-4.53z"/>
                    </svg>
                    <span>Login with Google</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {authMode === 'signup' && (
          /* SINGLE CLEAN SIGNUP VIEW */
          <div className="flex flex-col space-y-4 sm:space-y-5 animate-fade-in">
            <h2 className="font-serif text-2xl font-bold text-center text-brand-dark">Signup</h2>
            
            <form onSubmit={handleSignupSubmit} className="space-y-3 sm:space-y-3.5">
              <div className="flex flex-col space-y-3 sm:space-y-3.5">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={signupName}
                  onChange={(e) => setSignupName(e.target.value)}
                  className="w-full border border-brand-dark/15 px-3.5 py-2.5 sm:px-4 sm:py-3 text-sm font-mono focus:border-brand-accent outline-none bg-brand-beige/5 rounded-none"
                  required
                />

                <input
                  type="email"
                  placeholder="Email Address"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  className="w-full border border-brand-dark/15 px-3.5 py-2.5 sm:px-4 sm:py-3 text-sm font-mono focus:border-brand-accent outline-none bg-brand-beige/5 rounded-none"
                  required
                />

                <input
                  type="password"
                  placeholder="Create Password"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  className="w-full border border-brand-dark/15 px-3.5 py-2.5 sm:px-4 sm:py-3 text-sm font-mono focus:border-brand-accent outline-none bg-brand-beige/5 rounded-none"
                  required
                />

                <div className="relative w-full">
                  <input
                    type={showSignupConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm Password"
                    value={signupConfirmPassword}
                    onChange={(e) => setSignupConfirmPassword(e.target.value)}
                    className="w-full border border-brand-dark/15 pl-3.5 pr-10 py-2.5 sm:pl-4 sm:pr-10 sm:py-3 text-sm font-mono focus:border-brand-accent outline-none bg-brand-beige/5 rounded-none"
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
                className="w-full bg-brand-dark text-white hover:bg-brand-accent py-3 sm:py-3.5 text-xs font-mono uppercase tracking-widest font-bold transition-colors rounded-none mt-1"
              >
                Create Account
              </button>
            </form>

            <div className="space-y-3 sm:space-y-4">
              <p className="text-center font-mono text-[11px] text-brand-muted">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => { setErrorMessage(''); setSuccessMessage(''); setAuthMode('login'); }}
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
                disabled={isGoogleLoading}
                onClick={handleGoogleClick}
                className="w-full border border-brand-dark/15 bg-white hover:bg-brand-dark/5 disabled:opacity-60 disabled:cursor-not-allowed py-3 sm:py-3.5 text-xs font-mono uppercase tracking-widest font-bold text-brand-dark flex items-center justify-center space-x-2 transition-all rounded-none"
              >
                {isGoogleLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-brand-dark shrink-0" />
                    <span>Connecting with Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69c-.29 1.5-.14 3.01-1.01 4.22l3.12 2.42c1.83-1.69 2.94-4.19 2.94-6.49z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.97-1.09 7.96-2.92l-3.12-2.42c-.9.6-2.01.99-3.24.99-3.11 0-5.74-2.11-6.68-4.96L3.74 17.65C5.71 21.43 9.53 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.32 14.7c-.24-.7-.38-1.4-.38-2.2s.14-1.5.38-2.2L1.74 7.37C.63 9.49 0 11.75 0 14s.63 4.51 1.74 6.63l3.58-2.93z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.22 0 12 0 9.53 0 5.71 2.57 3.74 6.35l3.58 2.93c.94-2.85 3.57-4.53 6.68-4.53z"/>
                    </svg>
                    <span>Login with Google</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {authMode === 'forgot' && (
          /* SINGLE CLEAN FORGOT PASSWORD VIEW */
          <div className="flex flex-col space-y-4 sm:space-y-5 animate-fade-in">
            <div className="space-y-1.5 text-center">
              <h2 className="font-serif text-2xl font-bold text-brand-dark">Forgot Password</h2>
              <p className="text-[11px] font-mono text-brand-muted leading-relaxed uppercase tracking-wider">
                Enter your registered email below to receive a One-Time Verification passcode (OTP) valid for 15 minutes.
              </p>
            </div>
            
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-3 sm:space-y-4">
              <input
                type="email"
                placeholder="Email Address"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full border border-brand-dark/15 px-3.5 py-2.5 sm:px-4 sm:py-3 text-sm font-mono focus:border-brand-accent outline-none bg-brand-beige/5 rounded-none"
                required
              />

              <button
                type="submit"
                className="w-full bg-brand-accent text-white hover:bg-brand-dark py-3 sm:py-3.5 text-xs font-mono uppercase tracking-widest font-bold transition-colors rounded-none"
              >
                Send OTP Verification Code
              </button>
            </form>

            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => { setErrorMessage(''); setSuccessMessage(''); setAuthMode('login'); }}
                className="font-mono text-xs font-bold uppercase tracking-wider text-brand-muted hover:text-brand-dark transition-colors"
              >
                ← Back to Login
              </button>
            </div>
          </div>
        )}

        {authMode === 'reset' && (
          /* SINGLE CLEAN RESET PASSWORD VIEW */
          <div className="flex flex-col space-y-4 sm:space-y-5 animate-fade-in">
            <div className="space-y-1.5 text-center">
              <h2 className="font-serif text-2xl font-bold text-brand-dark">Verify Code &amp; Reset</h2>
              <p className="text-[11px] font-mono text-brand-muted leading-relaxed uppercase tracking-wider">
                Enter the 6-digit OTP passcode dispatched to <span className="font-bold text-brand-dark">{loginEmail}</span> and set your new password.
              </p>
            </div>
            
            <form onSubmit={handleResetPasswordSubmit} className="space-y-3 sm:space-y-4">
              <div className="flex flex-col space-y-3 sm:space-y-3.5">
                <input
                  type="text"
                  maxLength={6}
                  placeholder="6-Digit OTP Code"
                  value={resetOtp}
                  onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full border border-brand-dark/15 px-3.5 py-2.5 sm:px-4 sm:py-3 text-center text-lg font-mono font-bold tracking-[0.5em] focus:border-brand-accent outline-none bg-brand-beige/5 rounded-none placeholder:tracking-normal placeholder:font-normal placeholder:text-sm"
                  required
                />

                <input
                  type="password"
                  placeholder="New Password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="w-full border border-brand-dark/15 px-3.5 py-2.5 sm:px-4 sm:py-3 text-sm font-mono focus:border-brand-accent outline-none bg-brand-beige/5 rounded-none"
                  required
                />

                <div className="relative w-full">
                  <input
                    type={showResetConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm New Password"
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    className="w-full border border-brand-dark/15 pl-3.5 pr-10 py-2.5 sm:pl-4 sm:pr-10 sm:py-3 text-sm font-mono focus:border-brand-accent outline-none bg-brand-beige/5 rounded-none"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-brand-muted hover:text-brand-dark"
                  >
                    {showResetConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
                <button
                  type="submit"
                  className="w-full bg-brand-dark text-white hover:bg-brand-accent py-3 sm:py-3.5 text-xs font-mono uppercase tracking-widest font-bold transition-colors rounded-none"
                >
                  Reset Password
                </button>

                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendTimer > 0}
                  className={`w-full py-2 sm:py-2.5 text-xs font-mono uppercase tracking-widest font-bold border transition-colors rounded-none ${
                    resendTimer > 0
                      ? 'border-brand-dark/10 text-brand-muted/50 cursor-not-allowed bg-brand-dark/[0.02]'
                      : 'border-brand-dark/15 text-brand-dark hover:bg-brand-dark/5'
                  }`}
                >
                  {resendTimer > 0 ? `Resend OTP (${resendTimer}s)` : 'Resend OTP Code'}
                </button>
              </div>
            </form>

            <div className="pt-1 text-center flex justify-between items-center font-mono text-xs text-brand-muted">
              <button
                type="button"
                onClick={() => { setErrorMessage(''); setSuccessMessage(''); setAuthMode('forgot'); }}
                className="font-bold uppercase hover:text-brand-dark transition-colors"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => { setErrorMessage(''); setSuccessMessage(''); setAuthMode('login'); }}
                className="font-bold uppercase hover:text-brand-dark transition-colors"
              >
                Cancel &amp; Login
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
