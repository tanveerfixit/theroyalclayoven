/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Menu, X, ShoppingBag, Calendar, Home, BookOpen, Clock, LogOut, User } from 'lucide-react';
import { GoogleLogin, googleLogout } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';
import { UserProfile } from '../types';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  cartCount: number;
  openCartDrawer: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  cartCount,
  openCartDrawer
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [user, setUser] = React.useState<UserProfile | null>(null);

  const navRef = React.useRef<HTMLDivElement>(null);

  const loadUser = () => {
    const storedUser = localStorage.getItem('clay_oven_google_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Failed to parse user', e);
      }
    }
  };

  useEffect(() => {
    loadUser();
    window.addEventListener('profile_updated', loadUser);

    // Auto-close on scroll
    const handleScroll = () => {
      setIsOpen(false);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Auto-close when clicking outside navbar
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('profile_updated', loadUser);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLoginSuccess = (credentialResponse: any) => {
    if (credentialResponse.credential) {
      const decoded = jwtDecode<any>(credentialResponse.credential);
      const userProfile: UserProfile = {
        name: decoded.name,
        picture: decoded.picture,
        email: decoded.email
      };
      setUser(userProfile);
      localStorage.setItem('clay_oven_google_user', JSON.stringify(userProfile));
      // User noted they will send token to backend from here
    }
  };

  const handleLogout = () => {
    googleLogout();
    setUser(null);
    localStorage.removeItem('clay_oven_google_user');
  };

  const navItems = [
    { id: 'home', label: 'THE RESTAURANT', icon: Home },
    { id: 'menu', label: 'OUR MENU', icon: BookOpen },
    { id: 'takeaway', label: 'ORDER ONLINE / TAKEAWAY', icon: ShoppingBag },
    { id: 'booking', label: 'BOOK A TABLE', icon: Calendar },
    ...(user ? [{ id: 'profile', label: 'MY PROFILE', icon: User }] : [])
  ];

  return (
    <nav ref={navRef} className="sticky top-0 z-50 bg-brand-beige border-b border-brand-dark/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Mobile Left: Hamburger Menu */}
          <div className="flex items-center lg:hidden">
            <button
              type="button"
              id="mobile-nav-toggle"
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 text-brand-dark hover:bg-brand-dark/5 transition-all duration-200 rounded-none inline-flex items-center justify-center -ml-2"
              aria-expanded={isOpen}
            >
              {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Logo Brand Area (Centered on Mobile, Left on Desktop) */}
          <div className="flex-1 flex justify-center lg:justify-start lg:flex-none">
            <button 
              type="button"
              id="nav-logo"
              onClick={() => {
                setCurrentTab('home');
                setIsOpen(false);
              }}
              className="flex flex-col text-center lg:text-left focus:outline-none group"
            >
              <span className="font-serif text-lg sm:text-xl lg:text-2xl font-bold tracking-widest text-brand-dark group-hover:text-brand-accent transition-colors duration-200">
                THE ROYAL CLAY OVEN
              </span>
              <span className="hidden sm:block font-mono text-[10px] lg:text-xs tracking-[0.25em] text-brand-muted uppercase mt-0.5">
                Pakistani Cuisine & Outdoor Catering
              </span>
            </button>
          </div>

          {/* Desktop Navigation (Center) */}
          <div className="hidden lg:flex flex-grow justify-center items-center lg:space-x-0.5 xl:space-x-1 px-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  type="button"
                  id={`nav-item-desktop-${item.id}`}
                  key={item.id}
                  onClick={() => {
                    setCurrentTab(item.id);
                    setIsOpen(false);
                  }}
                  className={`flex items-center justify-center gap-1.5 px-2 xl:px-3 py-2 text-[11px] xl:text-xs 2xl:text-sm font-mono tracking-wider transition-colors duration-200 border border-transparent rounded-none uppercase whitespace-nowrap ${
                    isActive
                      ? 'bg-brand-dark text-white'
                      : 'text-brand-dark hover:bg-brand-dark/5 hover:border-brand-dark/10'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 stroke-[1.5] shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Right Accoutrements: Auth & Cart */}
          <div className="flex items-center justify-end space-x-3 lg:space-x-4">
            
            {/* Desktop Auth */}
            <div className="hidden lg:flex items-center">
              {user ? (
                <div className="flex items-center space-x-3">
                  <img src={user.picture} alt={user.name} className="w-6 h-6 rounded-full" referrerPolicy="no-referrer" />
                  <span className="font-mono text-xs font-bold text-brand-dark truncate max-w-[120px]">{user.name}</span>
                  <button onClick={handleLogout} className="p-1.5 text-brand-dark hover:text-brand-accent transition-colors" title="Logout">
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="h-[38px] flex items-center">
                  <GoogleLogin
                    onSuccess={handleLoginSuccess}
                    onError={() => console.log('Login Failed')}
                    type="standard"
                    theme="outline"
                    size="medium"
                    text="signin_with"
                    shape="rectangular"
                  />
                </div>
              )}
            </div>

            {/* Mobile Auth Quick-Access Icon */}
            <div className="flex lg:hidden items-center">
              {user ? (
                <button onClick={() => setIsOpen(!isOpen)} className="relative p-1 hover:opacity-70 transition-opacity">
                  <img src={user.picture} alt={user.name} className="w-7 h-7 rounded-full" referrerPolicy="no-referrer" />
                </button>
              ) : (
                <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-brand-dark hover:text-brand-accent transition-colors">
                  <User className="w-4 h-4 stroke-[2]" />
                </button>
              )}
            </div>

            {/* Cart Indicator */}
            <button
              type="button"
              id="navbar-cart-trigger"
              onClick={openCartDrawer}
              className="relative p-2 text-brand-dark hover:text-brand-accent transition-colors duration-200 flex items-center justify-center"
              aria-label="Toggle Shopping Cart"
            >
              <ShoppingBag className="w-5 h-5 stroke-[1.5]" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-brand-accent text-white font-mono text-[10px] w-4 h-4 flex items-center justify-center font-bold rounded-full">
                  {cartCount}
                </span>
              )}
            </button>

          </div>

        </div>
      </div>

      {/* Mobile Drawer (Accordion style) */}
      {isOpen && (
        <div id="mobile-menu-drawer" className="lg:hidden bg-brand-beige border-b border-brand-dark/20 animate-fade-in absolute w-full left-0 shadow-2xl z-40 max-h-[calc(100vh-80px)] overflow-y-auto">
          <div className="px-2 pt-2 pb-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  type="button"
                  id={`nav-item-mobile-${item.id}`}
                  key={item.id}
                  onClick={() => {
                    setCurrentTab(item.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center px-4 py-3.5 text-sm font-mono tracking-wider text-left rounded-none border border-transparent uppercase transition-all ${
                    isActive
                      ? 'bg-brand-dark text-white'
                      : 'text-brand-dark hover:bg-brand-dark/5 border-b border-brand-dark/5'
                  }`}
                >
                  <Icon className="w-4 h-4 mr-3 stroke-[2]" />
                  {item.label}
                </button>
              );
            })}
            
            {/* Mobile Auth */}
            <div className="px-4 py-4 mt-2 border-t border-brand-dark/10">
              {user ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img src={user.picture} alt={user.name} className="w-8 h-8 rounded-none" referrerPolicy="no-referrer" />
                    <span className="font-mono text-sm font-bold text-brand-dark">{user.name}</span>
                  </div>
                  <button onClick={handleLogout} className="flex items-center px-3 py-2 text-sm font-mono tracking-wider text-red-600 border border-red-200 hover:bg-red-50 uppercase">
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleLoginSuccess}
                    onError={() => console.log('Login Failed')}
                    width="100%"
                  />
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </nav>
  );
};
