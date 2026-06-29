/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Navbar } from './components/Navbar';
import { CartItem, MenuItem } from './types';
import { Plus, Minus, Trash2, X, ShoppingBag, Send, PhoneCall, MessageCircle } from 'lucide-react';
import { useGoogleOneTapLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode';

// Dynamic imports of views to improve mobile load speeds and reduce FCP bundle footprint
const HomeView = React.lazy(() => import('./components/HomeView').then(m => ({ default: m.HomeView })));
const MenuView = React.lazy(() => import('./components/MenuView').then(m => ({ default: m.MenuView })));
const OrderView = React.lazy(() => import('./components/OrderView').then(m => ({ default: m.OrderView })));
const BookingView = React.lazy(() => import('./components/BookingView').then(m => ({ default: m.BookingView })));
const HistoryView = React.lazy(() => import('./components/HistoryView').then(m => ({ default: m.HistoryView })));
const ProfileView = React.lazy(() => import('./components/ProfileView').then(m => ({ default: m.ProfileView })));
const AdminDashboard = React.lazy(() => import('./components/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AuthModal = React.lazy(() => import('./components/AuthModal').then(m => ({ default: m.AuthModal })));

// Brand themed loading animation aligned with editorial/sharp style guidelines
const BrandLoader = () => (
  <div className="min-h-[60vh] w-full flex flex-col items-center justify-center space-y-4 animate-fade-in bg-brand-beige">
    <div className="relative w-10 h-10">
      <div className="absolute inset-0 border border-brand-accent/20 rounded-none"></div>
      <div className="absolute inset-0 border border-t-brand-accent border-r-brand-accent rounded-none animate-spin"></div>
    </div>
    <span className="font-mono text-[10px] font-bold tracking-[0.25em] text-brand-accent uppercase animate-pulse">
      Preparing Authenticity...
    </span>
  </div>
);

export default function App() {
  // Check if session exists to determine whether to disable One Tap auto-login
  const hasUserSession = !!localStorage.getItem('clay_oven_google_user');

  useGoogleOneTapLogin({
    onSuccess: async (credentialResponse) => {
      try {
        const token = credentialResponse.credential;
        if (!token) return;

        const decoded: any = jwtDecode(token);
        const user = {
          name: decoded.name || '',
          email: decoded.email || '',
          picture: decoded.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120',
          provider: 'google'
        };

        // Save user to localStorage
        localStorage.setItem('clay_oven_google_user', JSON.stringify(user));

        // Sync profile with database server
        try {
          await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user)
          });
        } catch (err) {
          console.error('Failed to sync google auto-login profile with database:', err);
        }

        // Notify app components to re-load user state
        window.dispatchEvent(new Event('profile_updated'));
      } catch (err) {
        console.error('Failed to parse Google One Tap credentials:', err);
      }
    },
    onError: () => {
      console.log('Google One Tap auto-login was closed or failed.');
    },
    disabled: hasUserSession,
    auto_select: true
  });

  const [businessInfo, setBusinessInfo] = React.useState({
    business_name: 'THE ROYAL CLAY OVEN',
    address: 'Ballycasey Craft And Design Center, Shannon, County Clare V14 AW71',
    maps_url: 'https://maps.google.com/?q=The+Royal+Clay+Oven+Ballycasey+Craft+And+Design+Center+Shannon+County+Clare+V14+AW71',
    phone: '086 020 3720',
    mobile: '089 489 9950',
    whatsapp: '089 489 9950',
    email: 'sales@clayoven.ie'
  });

  React.useEffect(() => {
    const fetchBusinessInfo = async () => {
      try {
        const res = await fetch('/api/business-info');
        if (res.ok) {
          const data = await res.json();
          setBusinessInfo({
            business_name: data.business_name || 'THE ROYAL CLAY OVEN',
            address: data.address || 'Ballycasey Craft And Design Center, Shannon, County Clare V14 AW71',
            maps_url: data.maps_url || 'https://maps.google.com/?q=The+Royal+Clay+Oven+Ballycasey+Craft+And+Design+Center+Shannon+County+Clare+V14+AW71',
            phone: data.phone || '086 020 3720',
            mobile: data.mobile || '089 489 9950',
            whatsapp: data.whatsapp || '089 489 9950',
            email: data.email || 'sales@clayoven.ie'
          });
        }
      } catch (err) {
        console.error('Failed to load business information:', err);
      }
    };
    fetchBusinessInfo();
    window.addEventListener('business_info_updated', fetchBusinessInfo);
    return () => window.removeEventListener('business_info_updated', fetchBusinessInfo);
  }, []);

  const [currentTab, setCurrentTabInternal] = React.useState<string>(() => {
    const path = window.location.pathname.replace(/^\/|\/$/g, '');
    if (['home', 'menu', 'takeaway', 'booking', 'history', 'profile', 'admin'].includes(path)) {
      return path;
    }
    return 'home';
  });

  const setCurrentTab = (tab: string) => {
    setCurrentTabInternal(tab);
    const targetPath = tab === 'home' ? '/' : `/${tab}`;
    if (window.location.pathname !== targetPath) {
      window.history.pushState(null, '', targetPath);
    }
  };

  React.useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname.replace(/^\/|\/$/g, '');
      if (['home', 'menu', 'takeaway', 'booking', 'history', 'profile', 'admin'].includes(path)) {
        setCurrentTabInternal(path);
      } else if (path === '') {
        setCurrentTabInternal('home');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  React.useEffect(() => {
    const metaTitles: Record<string, string> = {
      home: 'The Royal Clay Oven | Authentic Pakistani Cuisine & Takeaway Shannon',
      menu: 'Our Menu | The Royal Clay Oven | Authentic Pakistani Dishes',
      takeaway: 'Order Takeaway Online | The Royal Clay Oven Shannon',
      booking: 'Book a Table | The Royal Clay Oven Shannon',
      history: 'Order History | The Royal Clay Oven',
      profile: 'My Profile | The Royal Clay Oven',
      admin: 'Admin Console | The Royal Clay Oven',
    };

    const metaDescriptions: Record<string, string> = {
      home: 'Enjoy authentic Pakistani cuisine, charcoal-fired clay oven tandoori, fresh flame-grilled kebabs, and pizzas from The Royal Clay Oven in Shannon, Co. Clare.',
      menu: 'Browse the menu booklet of The Royal Clay Oven. Choose from authentic biryanis, flame-grilled kebabs, tandoori clay oven specialties, and fresh pizzas.',
      takeaway: 'Order fresh Halal Pakistani food and takeaway collection online directly from The Royal Clay Oven in Shannon.',
      booking: 'Book your dining table online or reserve layouts for your events at The Royal Clay Oven in Shannon.',
      history: 'View your local takeaway orders and history at The Royal Clay Oven.',
      profile: 'Manage your user account profile and preferences at The Royal Clay Oven.',
      admin: 'Administrative dashboard for managing store settings, menus, and orders at The Royal Clay Oven.',
    };

    const title = metaTitles[currentTab] || metaTitles.home;
    const description = metaDescriptions[currentTab] || metaDescriptions.home;

    document.title = title;

    const metaDescTag = document.querySelector('meta[name="description"]');
    if (metaDescTag) {
      metaDescTag.setAttribute('content', description);
    }

    const ogTitleTag = document.querySelector('meta[property="og:title"]');
    if (ogTitleTag) {
      ogTitleTag.setAttribute('content', title);
    }

    const ogDescTag = document.querySelector('meta[property="og:description"]');
    if (ogDescTag) {
      ogDescTag.setAttribute('content', description);
    }
  }, [currentTab]);

  const [cart, setCart] = React.useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = React.useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = React.useState<boolean>(false);

  // Synchronize cart with localStorage for continuity
  React.useEffect(() => {
    const savedCart = localStorage.getItem('clay_oven_active_cart');
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (err) {
        console.error('Failed to parse active cart', err);
      }
    }
  }, []);

  const saveCartToStorage = (updatedCart: CartItem[]) => {
    localStorage.setItem('clay_oven_active_cart', JSON.stringify(updatedCart));
  };

  // Stateful shopping cart actions
  const addToCart = (item: MenuItem, size?: { name: string; price: number }, notes?: string) => {
    setCart((prevCart) => {
      // Formulate unique cart item ID depending on chosen size and custom instructions
      const optionId = `${item.id}-${size ? size.name : 'std'}-${notes ? notes.trim() : 'none'}`;
      const existingIndex = prevCart.findIndex((c) => c.id === optionId);

      let newCart;
      if (existingIndex > -1) {
        newCart = prevCart.map((c, idx) =>
          idx === existingIndex ? { ...c, quantity: c.quantity + 1 } : c
        );
      } else {
        newCart = [
          ...prevCart,
          {
            id: optionId,
            menuItem: item,
            selectedSize: size,
            quantity: 1,
            notes: notes?.trim() || undefined
          }
        ];
      }
      saveCartToStorage(newCart);
      return newCart;
    });
  };

  const removeFromCart = (cartItemId: string) => {
    setCart((prevCart) => {
      const newCart = prevCart.filter((c) => c.id !== cartItemId);
      saveCartToStorage(newCart);
      return newCart;
    });
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setCart((prevCart) => {
      const newCart = prevCart.map((c) => {
        if (c.id === cartItemId) {
          const freshQty = c.quantity + delta;
          return { ...c, quantity: freshQty < 1 ? 1 : freshQty };
        }
        return c;
      });
      saveCartToStorage(newCart);
      return newCart;
    });
  };

  const totalCartCount = cart.reduce((acc, curr) => acc + curr.quantity, 0);

  const subtotal = cart.reduce((acc, curr) => {
    const itemPrice = curr.selectedSize ? curr.selectedSize.price : curr.menuItem.price;
    return acc + itemPrice * curr.quantity;
  }, 0);

  // Clear entire cart helper
  const clearCart = () => {
    setCart([]);
    saveCartToStorage([]);
  };

  return (
    <div className="min-h-screen bg-brand-beige flex flex-col justify-between overflow-x-hidden relative selection:bg-brand-dark selection:text-white">
      
      {/* Accessibility: Skip to main content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[9999] focus:bg-brand-dark focus:text-white focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:outline-none"
      >
        Skip to main content
      </a>
      
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          // Scroll smoothly to top on tab modification
          window.scrollTo({ top: 0, behavior: 'instant' });
        }}
        cartCount={totalCartCount}
        openCartDrawer={() => setIsCartOpen(true)}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        businessName={businessInfo.business_name}
      />

      {/* Main Responsive Canvas */}
      <main id="main-content" className="flex-grow pt-0 font-sans">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full"
          >
            <React.Suspense fallback={<BrandLoader />}>
              {currentTab === 'home' && <HomeView setCurrentTab={setCurrentTab} />}
              {currentTab === 'menu' && <MenuView />}
              {currentTab === 'takeaway' && (
                <OrderView
                  cart={cart}
                  setCart={setCart}
                  addToCart={addToCart}
                  removeFromCart={removeFromCart}
                  updateQuantity={updateQuantity}
                />
              )}
              {currentTab === 'booking' && <BookingView />}
              {currentTab === 'history' && <HistoryView />}
              {currentTab === 'profile' && <ProfileView />}
              {currentTab === 'admin' && <AdminDashboard />}
            </React.Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Slide-out Shopping Tray Drawer Overlay */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex justify-end" id="cart-drawer-overlay">
            
            {/* Dark transparent Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCartOpen(false)}
              className="absolute inset-0 bg-brand-dark"
            />

            {/* Right Drawer Panel with strictly rounded-none corners */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'tween', duration: 0.25 }}
              className="relative w-full max-w-md h-full bg-brand-beige border-l border-brand-dark/20 flex flex-col justify-between rounded-none shadow-2xl p-6"
            >
              <div>
                
                {/* Header title */}
                <div className="flex items-center justify-between border-b border-brand-dark/15 pb-4 mb-6">
                  <h3 className="font-serif text-lg font-bold text-brand-dark flex items-center">
                    <ShoppingBag className="w-5 h-5 mr-2" />
                    Shopping Basket
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsCartOpen(false)}
                    className="p-1 border border-brand-dark/10 hover:bg-brand-dark hover:text-white transition-colors rounded-none"
                    aria-label="Close basket drawer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Basket List list */}
                {cart.length === 0 ? (
                  <div className="text-center py-20 text-brand-muted space-y-3">
                    <ShoppingBag className="w-8 h-8 mx-auto stroke-[1.5] text-brand-muted/70" />
                    <p className="font-serif text-base">Your basket is standardly empty.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCartOpen(false);
                        setCurrentTab('takeaway');
                      }}
                      className="inline-block text-sm font-mono font-bold text-brand-accent hover:underline uppercase"
                    >
                      BROWSE OUR DISHES NOW
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
                    {cart.map((cartItem) => {
                      const basePrice = cartItem.selectedSize ? cartItem.selectedSize.price : cartItem.menuItem.price;
                      return (
                        <div key={cartItem.id} className="border-b border-brand-dark/5 pb-4 last:border-b-0 space-y-2">
                          <div className="flex justify-between items-start gap-4">
                            <div>
                              <h4 className="font-serif text-sm font-bold text-brand-dark">
                                {cartItem.menuItem.name}
                              </h4>
                              {cartItem.selectedSize && (
                                <span className="font-mono text-xs bg-brand-dark/5 px-1 py-0.5 border border-brand-dark/5 text-brand-dark mt-0.5 inline-block">
                                  Size: {cartItem.selectedSize.name}
                                </span>
                              )}
                              {cartItem.notes && (
                                <span className="block text-sm text-brand-accent italic font-sans max-w-[200px] truncate">
                                  &ldquo;{cartItem.notes}&rdquo;
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-sm font-bold text-brand-dark">
                              &euro;{(basePrice * cartItem.quantity).toFixed(2)}
                            </span>
                          </div>

                          {/* Control actions inside drawer */}
                          <div className="flex items-center justify-between">
                            <button
                              type="button"
                              onClick={() => removeFromCart(cartItem.id)}
                              className="text-sm uppercase font-mono text-red-600 hover:text-red-900 flex items-center space-x-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>REMOVE</span>
                            </button>

                            <div className="flex items-center space-x-2 border border-brand-dark/15 p-0.5">
                              <button
                                type="button"
                                onClick={() => updateQuantity(cartItem.id, -1)}
                                className="p-1 hover:bg-brand-dark/5"
                                disabled={cartItem.quantity <= 1}
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="font-mono text-sm font-bold text-brand-dark px-1">
                                {cartItem.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateQuantity(cartItem.id, 1)}
                                className="p-1 hover:bg-brand-dark/5"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

              </div>

              {/* Subtotal & Action checkout path */}
              {cart.length > 0 && (
                <div className="border-t border-brand-dark/15 pt-6 space-y-4">
                  <div className="font-mono text-sm text-brand-muted space-y-2">
                    <div className="flex justify-between">
                      <span>Menu Subtotal</span>
                      <span className="text-brand-dark font-medium">&euro;{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Packaging Fee</span>
                      <span className="text-brand-dark font-medium">&euro;0.95</span>
                    </div>
                    <div className="border-t border-dashed border-brand-dark/10 pt-2 font-bold text-base flex justify-between text-brand-dark">
                      <span>ESTIMATED TOTAL</span>
                      <span>&euro;{(subtotal + 0.95).toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={clearCart}
                      className="border border-red-200 text-red-600 hover:bg-red-50 py-3 text-sm font-mono font-bold uppercase tracking-wider text-center transition-all"
                    >
                      Clear All
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsCartOpen(false);
                        setCurrentTab('takeaway');
                        // Trigger checkout focus if possible
                        setTimeout(() => {
                          const checkoutBtn = document.getElementById('start-checkout-btn');
                          if (checkoutBtn) checkoutBtn.click();
                        }, 100);
                      }}
                      className="bg-brand-dark text-white hover:bg-brand-accent py-3 text-sm font-mono font-bold uppercase tracking-wider text-center transition-all"
                    >
                      Checkout
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Comprehensive Minimalist Editorial Footer with sharp shapes */}
      <footer className="bg-white border-t border-brand-dark/15 mt-20 p-8 sm:p-12 lg:p-16">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Logo & Headline */}
          <div className="md:col-span-4 space-y-3 text-left">
            <span className="font-serif text-lg font-bold tracking-widest text-brand-dark block">
              {businessInfo.business_name}
            </span>
            <p className="text-sm text-brand-muted leading-relaxed font-normal">
              Providing freshly prepared authentic Pakistani cuisine, kebabs, and pizzas meticulously flame-grilled. High-fire clay cooked under familial recipe care.
            </p>
            <div className="font-mono text-xs text-brand-accent font-bold uppercase tracking-wider">
              100% Halal Ingredients &bull; Locally Sourced Meats
            </div>
          </div>

          {/* Quick links map */}
          <div className="md:col-span-3 space-y-3 font-mono text-sm">
            <span className="font-bold text-brand-dark tracking-wider block uppercase text-sm">
              QUICK ROADS
            </span>
            <ul className="space-y-1.5 text-brand-muted uppercase">
              <li>
                <button type="button" onClick={() => setCurrentTab('home')} className="hover:text-brand-dark transition-colors">
                  The Restaurant
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setCurrentTab('menu')} className="hover:text-brand-dark transition-colors">
                  Our Menu Booklet
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setCurrentTab('takeaway')} className="hover:text-brand-dark transition-colors">
                  Collection Takeaway
                </button>
              </li>
              <li>
                <button type="button" onClick={() => setCurrentTab('booking')} className="hover:text-brand-dark transition-colors">
                  Book Event Layout
                </button>
              </li>
            </ul>
          </div>

          {/* Direct Address */}
          <div className="md:col-span-3 space-y-3 text-sm text-left">
            <span className="font-mono font-bold text-brand-dark tracking-wider block uppercase text-sm">
              {businessInfo.business_name}
            </span>
            <a
              href={businessInfo.maps_url}
              target="_blank"
              rel="noopener noreferrer"
              className="block group hover:text-brand-accent transition-colors"
            >
              <p className="text-brand-muted leading-relaxed font-normal group-hover:text-brand-dark transition-colors whitespace-pre-line">
                {businessInfo.address}
              </p>
            </a>
            <div className="flex flex-col text-sm text-brand-muted font-mono space-y-1.5 pt-1">
              <span>Phone: <a href={`tel:${businessInfo.phone.replace(/\s+/g, '')}`} className="hover:text-brand-accent transition-colors">{businessInfo.phone}</a></span>
              <span>Mobile: <a href={`tel:${businessInfo.mobile.replace(/\s+/g, '')}`} className="hover:text-brand-accent transition-colors">{businessInfo.mobile}</a></span>
            </div>
          </div>

        </div>
      </footer>

      {/* Dynamic Floating Messenger Button */}
      {(currentTab === 'home' || currentTab === 'menu') && (
        <a
          href={businessInfo.whatsapp.replace(/\s+/g, '').startsWith('0') ? `https://wa.me/353${businessInfo.whatsapp.replace(/\s+/g, '').substring(1)}` : `https://wa.me/${businessInfo.whatsapp.replace(/\s+/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-40 bg-[#25D366] hover:bg-[#20ba5a] text-white p-3.5 rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all duration-200 flex items-center justify-center group"
          aria-label="Order on WhatsApp"
        >
          <MessageCircle className="w-6 h-6 text-white" />
          <span className="absolute right-15 bg-brand-dark text-white text-[10px] font-mono font-bold tracking-wider py-1.5 px-3 rounded-none shadow-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap uppercase">
            Order on WhatsApp
          </span>
        </a>
      )}

      <React.Suspense fallback={null}>
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onLoginSuccess={(user) => {
            localStorage.setItem('clay_oven_google_user', JSON.stringify(user));
            window.dispatchEvent(new Event('profile_updated'));
            setCurrentTab('profile');
          }}
        />
      </React.Suspense>

    </div>
  );
}
