/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect } from 'react';
import { Menu, X, ShoppingBag, Calendar, Home, BookOpen, Clock, LogOut, User } from 'lucide-react';
import { googleLogout } from '@react-oauth/google';
import { UserProfile } from '../types';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  cartCount: number;
  openCartDrawer: () => void;
  onOpenAuthModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  cartCount,
  openCartDrawer,
  onOpenAuthModal
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [user, setUser] = React.useState<UserProfile | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);

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
      setIsDropdownOpen(false);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });

    // Auto-close when clicking outside navbar
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      window.removeEventListener('profile_updated', loadUser);
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Listening to profile_updated handles standard session changes.

  const handleLogout = () => {
    googleLogout();
    setUser(null);
    localStorage.removeItem('clay_oven_google_user');
    window.dispatchEvent(new Event('profile_updated'));
  };

  const navItems = [
    { id: 'home', label: 'THE RESTAURANT', icon: Home },
    { id: 'menu', label: 'OUR MENU', icon: BookOpen },
    { id: 'takeaway', label: 'ORDER ONLINE / TAKEAWAY', icon: ShoppingBag },
    { id: 'booking', label: 'BOOK A TABLE', icon: Calendar }
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
            
            {/* Unified User Account Profile Console */}
            <div className="flex items-center">
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="relative flex items-center gap-2 focus:outline-none hover:opacity-85 transition-opacity"
                    title="User Account"
                    id="profile-dropdown-trigger"
                  >
                    <img
                      src={user.picture}
                      alt={user.name}
                      className="w-8 h-8 rounded-full border border-brand-dark/15 p-0.5 bg-white shadow-[0_2px_8px_rgba(44,38,33,0.04)]"
                      referrerPolicy="no-referrer"
                    />
                    <span className="hidden sm:inline font-mono text-[11px] font-bold text-brand-dark truncate max-w-[80px]">{user.name}</span>
                  </button>

                  {isDropdownOpen && (
                    <div 
                      className="absolute right-0 mt-3 w-56 bg-white border border-brand-dark/15 shadow-xl py-1.5 z-50 animate-fade-in rounded-none"
                      id="profile-dropdown-menu"
                    >
                      {/* Header summary details */}
                      <div className="px-4 py-3 border-b border-brand-dark/10">
                        <p className="text-xs font-mono font-bold text-brand-dark truncate">{user.name}</p>
                        <p className="text-[10px] font-mono text-brand-muted truncate mt-0.5">{user.email}</p>
                      </div>

                      {/* Dropdown Options */}
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setCurrentTab('profile');
                            setIsDropdownOpen(false);
                          }}
                          className="w-full flex items-center px-4 py-2.5 text-left text-xs font-mono text-brand-dark hover:bg-brand-dark hover:text-white transition-colors uppercase gap-2 rounded-none"
                        >
                          <User className="w-3.5 h-3.5" />
                          <span>My Profile</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            handleLogout();
                            setIsDropdownOpen(false);
                          }}
                          className="w-full flex items-center px-4 py-2.5 text-left text-xs font-mono text-red-600 hover:bg-red-50 transition-colors uppercase gap-2 border-t border-brand-dark/5 rounded-none"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>Exit / Logout</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAuthModal}
                  className="p-2 text-brand-dark hover:text-brand-accent transition-colors flex items-center justify-center"
                  title="Login / Signup"
                >
                  <User className="w-5 h-5 stroke-[1.5]" />
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
            
            {/* Mobile Drawer Auth Panel */}
            <div className="px-4 py-4 mt-2 border-t border-brand-dark/10">
              {user ? (
                <div className="flex flex-col space-y-3.5">
                  <div className="flex items-center space-x-3">
                    <img 
                      src={user.picture} 
                      alt={user.name} 
                      className="w-9 h-9 rounded-full border border-brand-dark/10 p-0.5 bg-white" 
                      referrerPolicy="no-referrer" 
                    />
                    <div className="truncate">
                      <p className="font-mono text-xs font-bold text-brand-dark truncate">{user.name}</p>
                      <p className="font-mono text-[10px] text-brand-muted truncate mt-0.5">{user.email}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => {
                        setCurrentTab('profile');
                        setIsOpen(false);
                      }}
                      className="flex items-center justify-center px-3 py-2 text-xs font-mono tracking-wider text-brand-dark border border-brand-dark/15 hover:bg-brand-dark hover:text-white transition-colors uppercase gap-1.5 rounded-none"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Profile</span>
                    </button>
                    <button
                      onClick={() => {
                        handleLogout();
                        setIsOpen(false);
                      }}
                      className="flex items-center justify-center px-3 py-2 text-xs font-mono tracking-wider text-red-600 border border-red-200 hover:bg-red-50 transition-colors uppercase gap-1.5 rounded-none"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenAuthModal();
                    }}
                    className="w-full bg-brand-dark text-white hover:bg-brand-accent py-3 text-xs font-mono uppercase tracking-widest font-bold text-center transition-colors rounded-none"
                  >
                    Login / Signup
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}
    </nav>
  );
};
