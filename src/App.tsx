/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Navbar } from './components/Navbar';
import { HomeView } from './components/HomeView';
import { MenuView } from './components/MenuView';
import { OrderView } from './components/OrderView';
import { BookingView } from './components/BookingView';
import { HistoryView } from './components/HistoryView';
import { ProfileView } from './components/ProfileView';
import { AdminDashboard } from './components/AdminDashboard';
import { AuthModal } from './components/AuthModal';
import { CartItem, MenuItem } from './types';
import { Plus, Minus, Trash2, X, ShoppingBag, Send, PhoneCall } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = React.useState<string>('home');
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
      />

      {/* Main Responsive Canvas */}
      <main className="flex-grow pt-0 font-sans">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="w-full"
          >
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
              THE ROYAL CLAY OVEN
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
              <li>
                <button type="button" onClick={() => setCurrentTab('admin')} className="text-brand-accent hover:text-brand-dark transition-colors font-bold">
                  Admin Console
                </button>
              </li>
            </ul>
          </div>

          {/* Direct Address */}
          <div className="md:col-span-3 space-y-3 text-sm text-left">
            <span className="font-mono font-bold text-brand-dark tracking-wider block uppercase text-sm">
              THE CLAY HOUSE
            </span>
            <a
              href="https://maps.google.com/?q=The+Royal+Clay+Oven+Ballycasey+Craft+And+Design+Center+Shannon+County+Clare+V14+AW71"
              target="_blank"
              rel="noopener noreferrer"
              className="block group hover:text-brand-accent transition-colors"
            >
              <p className="text-brand-muted leading-relaxed font-normal group-hover:text-brand-dark transition-colors">
                Ballycasey Craft And Design Center,<br />
                Shannon, County Clare V14 AW71
              </p>
            </a>
            <div className="flex flex-col text-sm text-brand-muted font-mono space-y-1.5 pt-1">
              <span>Phone: <a href="tel:061703636" className="hover:text-brand-accent transition-colors">061 703 636</a></span>
              <span>Mobile: <a href="tel:0894899950" className="hover:text-brand-accent transition-colors">089 489 9950</a></span>
              <span>Whatsapp: <a href="https://wa.me/353894899950" target="_blank" rel="noopener noreferrer" className="hover:text-brand-accent transition-colors font-bold underline decoration-brand-accent/30 decoration-2 underline-offset-4">089 489 9950 (Click to Chat)</a></span>
            </div>
          </div>

        </div>
      </footer>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onLoginSuccess={(user) => {
          localStorage.setItem('clay_oven_google_user', JSON.stringify(user));
          window.dispatchEvent(new Event('profile_updated'));
          setCurrentTab('profile');
        }}
      />

    </div>
  );
}
