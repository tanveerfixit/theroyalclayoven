/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Check, ArrowRight, ArrowLeft, Clock, MapPin, Sparkles, ShoppingBag, ChevronLeft, ChevronRight, Phone, X } from 'lucide-react';
import { MenuItem, CartItem, Order } from '../types';
import { MENU_ITEMS, CATEGORIES } from '../data/menu';

interface OrderViewProps {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  addToCart: (item: MenuItem, size?: { name: string; price: number }, notes?: string) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, delta: number) => void;
}

export const OrderView: React.FC<OrderViewProps> = ({
  cart,
  setCart,
  addToCart,
  removeFromCart,
  updateQuantity
}) => {
  const [selectedCategory, setSelectedCategory] = React.useState<string>('Pakistani Cuisine');
  const [customNotes, setCustomNotes] = React.useState<{ [itemId: string]: string }>({});
  const [selectedSizes, setSelectedSizes] = React.useState<{ [itemId: string]: { name: string; price: number } }>({});
  
  // Checkout journey steps
  const [isCheckoutMode, setIsCheckoutMode] = React.useState(false);
  const [showWarningModal, setShowWarningModal] = React.useState(false);
  const [serviceType, setServiceType] = React.useState<'takeaway' | 'delivery'>('takeaway');

  const [noticeText, setNoticeText] = React.useState(localStorage.getItem('clay_oven_notice_text') || 'We are Still Working on Website, for online order please contact.');
  const [noticePhone, setNoticePhone] = React.useState(localStorage.getItem('clay_oven_notice_phone') || '089 489 9950');
  const [takeawayEnabled, setTakeawayEnabled] = React.useState(localStorage.getItem('clay_oven_takeaway_enabled') !== 'false');
  const [takeawayNotice, setTakeawayNotice] = React.useState(localStorage.getItem('clay_oven_takeaway_notice') || 'We are temporarily not taking online orders. Please phone us to order directly!');
  const [showTakeawayWarningModal, setShowTakeawayWarningModal] = React.useState(false);

  const [businessInfo, setBusinessInfo] = React.useState({
    phone: '086 020 3720',
  });

  // Sync settings with database on mount
  React.useEffect(() => {
    const fetchBusinessInfo = async () => {
      try {
        const res = await fetch('/api/business-info');
        if (res.ok) {
          const data = await res.json();
          setBusinessInfo({
            phone: data.phone || '086 020 3720',
          });
        }
      } catch (err) {
        console.error('Failed to load business info in OrderView:', err);
      }
    };

    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
          if (data.clay_oven_notice_text) setNoticeText(data.clay_oven_notice_text);
          if (data.clay_oven_notice_phone) setNoticePhone(data.clay_oven_notice_phone);
          if (data.clay_oven_takeaway_enabled !== undefined) {
            const enabled = data.clay_oven_takeaway_enabled !== 'false';
            setTakeawayEnabled(enabled);
            setShowTakeawayWarningModal(!enabled);
          } else {
            setShowTakeawayWarningModal(!takeawayEnabled);
          }
          if (data.clay_oven_takeaway_notice) setTakeawayNotice(data.clay_oven_takeaway_notice);
        } else {
          setShowTakeawayWarningModal(!takeawayEnabled);
        }
      } catch (err) {
        console.error('Failed to retrieve storefront settings:', err);
        setShowTakeawayWarningModal(!takeawayEnabled);
      }
    };

    fetchBusinessInfo();
    loadSettings();

    window.addEventListener('business_info_updated', fetchBusinessInfo);
    return () => {
      window.removeEventListener('business_info_updated', fetchBusinessInfo);
    };
  }, []);
  
  // Checkout inputs
  const [customerName, setCustomerName] = React.useState('');
  const [customerPhone, setCustomerPhone] = React.useState('');
  const [customerEmail, setCustomerEmail] = React.useState('');
  const [deliveryAddress, setDeliveryAddress] = React.useState('');
  const [eirCode, setEirCode] = React.useState('');
  const [preferredTime, setPreferredTime] = React.useState('As soon as possible (approx. 30-45 mins)');
  const [checkoutNotes, setCheckoutNotes] = React.useState('');
  const [validationError, setValidationError] = React.useState('');

  const loadUserProfile = () => {
    const storedUser = localStorage.getItem('clay_oven_google_user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        if (user.name) setCustomerName(user.name);
        if (user.email) setCustomerEmail(user.email);
        if (user.phone) setCustomerPhone(user.phone);
        if (user.address) setDeliveryAddress(user.address);
        if (user.eircode) setEirCode(user.eircode);
      } catch (err) {
        console.error('Failed to parse Google user data for checkout', err);
      }
    }
  };

  // Pre-fill user data from Google Login / Profile if available
  React.useEffect(() => {
    loadUserProfile();
    window.addEventListener('profile_updated', loadUserProfile);
    return () => {
      window.removeEventListener('profile_updated', loadUserProfile);
    };
  }, []);

  // Alert customer that the site is under construction when entering checkout mode
  React.useEffect(() => {
    if (isCheckoutMode) {
      setShowWarningModal(true);
    }
  }, [isCheckoutMode]);
  
  // Successful order indicator
  const [placedOrder, setPlacedOrder] = React.useState<Order | null>(null);

  // Category navigation scroll controls
  const categoriesRef = React.useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = React.useState(false);
  const [showRightArrow, setShowRightArrow] = React.useState(false);

  const updateArrows = () => {
    const el = categoriesRef.current;
    if (el) {
      const { scrollLeft, scrollWidth, clientWidth } = el;
      setShowLeftArrow(scrollLeft > 2);
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 2);
    }
  };

  React.useEffect(() => {
    updateArrows();
    window.addEventListener('resize', updateArrows);
    // Double check sizes after a small delay to make sure layouts are ready
    const timer = setTimeout(updateArrows, 150);
    return () => {
      window.removeEventListener('resize', updateArrows);
      clearTimeout(timer);
    };
  }, [selectedCategory]);

  const scrollCategories = (direction: 'left' | 'right') => {
    const el = categoriesRef.current;
    if (el) {
      const scrollAmount = 150;
      el.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  // Initialize prices/sizes for items
  React.useEffect(() => {
    const initialSizes: { [itemId: string]: { name: string; price: number } } = {};
    MENU_ITEMS.forEach((item) => {
      if (item.sizeOptions && item.sizeOptions.length > 0) {
        initialSizes[item.id] = item.sizeOptions[0];
      }
    });
    setSelectedSizes(initialSizes);
  }, []);

  const handleSizeChange = (itemId: string, sizeName: string) => {
    const item = MENU_ITEMS.find((i) => i.id === itemId);
    if (item && item.sizeOptions) {
      const selectedOption = item.sizeOptions.find((opt) => opt.name === sizeName);
      if (selectedOption) {
        setSelectedSizes((prev) => ({ ...prev, [itemId]: selectedOption }));
      }
    }
  };

  const handleAddWithDetails = (item: MenuItem) => {
    const size = selectedSizes[item.id];
    const notes = customNotes[item.id] || '';
    addToCart(item, size, notes);

    // Clear notes for this item once added to improve UX
    setCustomNotes((prev) => ({ ...prev, [item.id]: '' }));
    
    // Quick visual cue of addition
    const notification = document.getElementById(`added-notif-${item.id}`);
    if (notification) {
      notification.classList.remove('opacity-0');
      notification.classList.add('opacity-100');
      setTimeout(() => {
        notification.classList.remove('opacity-100');
        notification.classList.add('opacity-0');
      }, 2000);
    }
  };

  // Calculations
  const subtotal = cart.reduce((acc, curr) => {
    const pricePerItem = curr.selectedSize ? curr.selectedSize.price : curr.menuItem.price;
    return acc + pricePerItem * curr.quantity;
  }, 0);
  
  const packagingFee = subtotal > 0 ? 0.95 : 0.00; // As explicitly mentioned in PDF
  const deliveryCharges = serviceType === 'delivery' ? 3.00 : 0.00;
  const total = subtotal + packagingFee + deliveryCharges;

  // Checkout submission handler
  const handlePlaceOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');

    if (!customerName.trim()) {
      setValidationError('Please specify your name.');
      return;
    }
    if (!customerPhone.trim()) {
      setValidationError('A valid telephone number is required to contact you.');
      return;
    }
    if (!customerEmail.trim()) {
      setValidationError('An email address is required to dispatch the receipt copy.');
      return;
    }
    if (serviceType === 'delivery' && !deliveryAddress.trim()) {
      setValidationError('Please supply your local delivery address inside Limerick.');
      return;
    }
    if (serviceType === 'delivery' && !eirCode.trim()) {
      setValidationError('Please supply your Eir Code for delivery.');
      return;
    }

    // Compose structural order object
    const finalOrder: Order = {
      id: 'CO-' + Math.floor(100000 + Math.random() * 900000),
      items: cart.map((item) => ({
        name: item.menuItem.name,
        quantity: item.quantity,
        price: item.selectedSize ? item.selectedSize.price : item.menuItem.price,
        size: item.selectedSize?.name,
        notes: item.notes
      })),
      packagingFee,
      subtotal,
      total,
      serviceType,
      customerInfo: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        address: serviceType === 'delivery' ? `${deliveryAddress}, Eir Code: ${eirCode}` : undefined,
        preferredTime,
        notes: checkoutNotes
      },
      status: 'Received',
      createdAt: new Date().toISOString()
    };

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(finalOrder)
      });
      if (!response.ok) {
        throw new Error('Database save failed');
      }
    } catch (err) {
      console.error('Failed to submit order to server, saving locally', err);
    }

    // Store in LocalStorage as secondary backup / cache
    const existingOrdersJson = localStorage.getItem('clay_oven_orders');
    const existingOrders = existingOrdersJson ? JSON.parse(existingOrdersJson) : [];
    existingOrders.unshift(finalOrder); // Insert newest at beginning
    localStorage.setItem('clay_oven_orders', JSON.stringify(existingOrders));

    // Sync customer details to local storage and database
    const storedUser = localStorage.getItem('clay_oven_google_user');
    let existingUser = {};
    if (storedUser) {
      try {
        existingUser = JSON.parse(storedUser);
      } catch (err) {
        console.error('Failed to parse existing user', err);
      }
    }

    const updatedUser = {
      ...existingUser,
      name: customerName,
      email: customerEmail,
      phone: customerPhone,
      address: deliveryAddress || (existingUser as any).address || '',
      eircode: eirCode || (existingUser as any).eircode || '',
      picture: (existingUser as any).picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120'
    };

    // Save to local storage
    localStorage.setItem('clay_oven_google_user', JSON.stringify(updatedUser));

    // Save to database
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedUser)
      });
    } catch (err) {
      console.error('Failed to upsert user profile to server', err);
    }

    // Reset current Cart and trigger state success
    setCart([]);
    setPlacedOrder(finalOrder);
    setIsCheckoutMode(false);

    // Notify all views of the profile update
    window.dispatchEvent(new Event('profile_updated'));
  };

  // Reset variables for starting a new order
  const handleOrderAgain = () => {
    setPlacedOrder(null);
    setCustomNotes({});
    setCheckoutNotes('');
  };

  const filteredItems = MENU_ITEMS.filter((item) => item.category === selectedCategory);

  if (placedOrder) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-8 animate-fade-in" id="order-success-screen">
        <div className="max-w-xl w-full text-center space-y-8">
          <div className="border border-brand-dark p-8 sm:p-12 bg-white relative space-y-6">
            <div className="w-16 h-16 bg-brand-dark text-white font-serif text-3xl flex items-center justify-center font-bold mx-auto">
              ✓
            </div>
            
            <div className="space-y-2">
              <span className="font-mono text-sm tracking-widest text-brand-accent uppercase font-bold">
                PAKISTANI KITCHEN ORDER CONFIRMED
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-brand-dark">
                Thank You For Your Order!
              </h2>
              <p className="font-mono text-sm text-brand-muted uppercase">
                Ref ID: <span className="text-brand-dark font-bold">{placedOrder.id}</span>
              </p>
            </div>

            <div className="border-t border-b border-brand-dark/10 py-6 text-left space-y-3 font-mono text-sm text-brand-muted">
              <div className="flex justify-between font-bold text-brand-dark">
                <span>Fulfillment Type</span>
                <span className="uppercase">{placedOrder.serviceType}</span>
              </div>
              <div className="flex justify-between">
                <span>Customer Name</span>
                <span className="text-brand-dark">{placedOrder.customerInfo.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Fulfillment Time</span>
                <span className="text-brand-dark">{placedOrder.customerInfo.preferredTime}</span>
              </div>
              
              {placedOrder.customerInfo.address && (
                <div className="border-t border-dashed border-brand-dark/5 pt-2">
                  <span className="font-semibold text-brand-dark block mb-1">Deliver To:</span>
                  <span className="text-brand-muted">{placedOrder.customerInfo.address}</span>
                </div>
              )}
            </div>

          <div className="space-y-3 text-left">
            <h4 className="font-serif text-base font-bold text-brand-dark">Order Items Summarized:</h4>
            <div className="text-sm font-mono border border-brand-dark/5 bg-brand-beige/30 p-4 space-y-2">
              {placedOrder.items.map((it, idx) => (
                <div key={idx} className="flex justify-between text-brand-muted">
                  <span>
                    {it.quantity}x {it.name} {it.size ? `(${it.size})` : ''}
                    {it.notes && (
                      <span className="block text-sm text-brand-accent italic font-sans">
                        &ldquo;{it.notes}&rdquo;
                      </span>
                    )}
                  </span>
                  <span className="text-brand-dark">&euro;{(it.price * it.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-dashed border-brand-dark/10 pt-2 font-semibold flex justify-between text-brand-dark">
                <span>TOTAL PAID</span>
                <span>&euro;{placedOrder.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <p className="text-sm text-brand-muted leading-relaxed font-normal">
            We are now preparing your authentic dishes using traditional charcoal fires. Standard turnaround time is 35 mins. If you have immediate inquiries, phone our line at <span className="font-semibold text-brand-dark">{businessInfo.phone}</span>.
          </p>

          <button
            type="button"
            id="order-again-btn"
            onClick={handleOrderAgain}
            className="w-full bg-brand-dark hover:bg-brand-accent text-white py-3.5 text-sm font-mono uppercase tracking-widest font-bold transition-colors"
          >
            START A NEW ORDER
          </button>
        </div>
      </div>
    </div>
    );
  }

  // Takeaway configurations are handled via synchronized React state hooks defined at the top of the view.

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 animate-fade-in" id="order-takeaway-view">
      
      {/* Editorial Header - Only displayed when online takeaway is active and not in checkout mode */}
      {!isCheckoutMode && takeawayEnabled && (
        <div className="text-center max-w-xl mx-auto pt-4 sm:pt-8 space-y-2 mb-6 sm:mb-10">
          <span className="font-mono text-xs sm:text-sm tracking-widest text-brand-accent uppercase font-bold">
            FAST ONLINE ORDER
          </span>
          <h1 className="font-serif text-2xl sm:text-4xl font-bold tracking-tight text-brand-dark">
            Order &amp; Takeaway Service
          </h1>
          <p className="text-xs sm:text-sm text-brand-muted leading-relaxed font-normal px-2 sm:px-0">
            Enjoy the same high-grade clay oven flavor at home. Choose self-collection or speedy delivery inside our local radius. A statutory €0.95 packaging fee applies.
          </p>
        </div>
      )}

      {/* TIGHT MOBILE RESPONSIVE EMERGENCY PHONE NOTICE (Only displays when online ordering is paused) */}
      {!takeawayEnabled && (
        <div className="mb-6 border border-red-200 bg-red-50 p-4 text-left animate-fade-in" id="takeaway-disabled-banner">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="font-mono text-[10px] text-red-800 font-extrabold uppercase tracking-widest block">★ ONLINE ORDERING PAUSED</span>
              <h2 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-brand-dark">
                We are actively taking orders over the phone!
              </h2>
              <p className="text-xs sm:text-sm text-red-700 leading-relaxed font-sans font-medium">
                {takeawayNotice}
              </p>
            </div>
            <div className="shrink-0">
              <a
                href={`tel:${noticePhone.replace(/\s+/g, '')}`}
                className="w-full sm:w-auto inline-flex items-center justify-center bg-red-700 hover:bg-red-800 text-white font-mono font-bold text-xs uppercase tracking-wider px-5 py-3.5 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 mr-2" />
                Call to Order Now: {noticePhone}
              </a>
            </div>
          </div>
        </div>
      )}     {isCheckoutMode ? (
        
        /* CHECKOUT EXPERIENCE STEP */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start max-w-5xl mx-auto pt-4 sm:pt-6" id="checkout-container">
          
          {/* Back button */}
          <div className="lg:col-span-12">
            <button
              type="button"
              id="back-to-shop-btn"
              onClick={() => setIsCheckoutMode(false)}
              className="inline-flex items-center text-sm font-mono font-bold tracking-wider text-brand-dark hover:text-brand-accent uppercase space-x-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back To Menu Selection</span>
            </button>
          </div>

          {/* Form Side - Decreased gaps and optimized padding for mobile centering */}
          <form onSubmit={handlePlaceOrderSubmit} className="lg:col-span-7 bg-white border border-brand-dark/10 p-5 sm:p-8 space-y-4">
            <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-tight border-b border-brand-dark/10 pb-3">
              Fulfillment &amp; Customer Details
            </h2>

            {validationError && (
              <div className="p-4 bg-red-50 text-red-800 text-sm font-mono border border-red-200" id="checkout-error-banner">
                {validationError}
              </div>
            )}

            {/* Service Selection */}
            <div className="space-y-1.5">
              <span className="block font-mono text-xs text-brand-accent uppercase tracking-widest font-bold">
                FULFILLMENT METHOD
              </span>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  id="checkout-option-takeaway"
                  onClick={() => setServiceType('takeaway')}
                  className={`py-3 px-4 border text-sm font-mono font-bold uppercase transition-all flex flex-col items-center justify-center space-y-1.5 ${
                    serviceType === 'takeaway'
                      ? 'border-brand-dark bg-brand-dark text-white'
                      : 'border-brand-dark/15 text-brand-dark hover:bg-brand-dark/5'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>COLLECTION (FREE)</span>
                </button>
                <button
                  type="button"
                  id="checkout-option-delivery"
                  onClick={() => setServiceType('delivery')}
                  className={`py-3 px-4 border text-sm font-mono font-bold uppercase transition-all flex flex-col items-center justify-center space-y-1.5 ${
                    serviceType === 'delivery'
                      ? 'border-brand-dark bg-brand-dark text-white'
                      : 'border-brand-dark/15 text-brand-dark hover:bg-brand-dark/5'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  <span>DELIVERY (&euro;3.00)</span>
                </button>
              </div>
            </div>

            {/* Text Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1">
                <label htmlFor="chk-custname" className="block font-mono text-xs text-brand-accent uppercase tracking-widest font-bold">
                  NAME
                </label>
                <input
                  id="chk-custname"
                  type="text"
                  required
                  placeholder="e.g. Liam O'Brien"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full border border-brand-dark/10 p-2.5 text-sm font-mono focus:border-brand-dark outline-none bg-brand-beige/10 rounded-none"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="chk-custphone" className="block font-mono text-xs text-brand-accent uppercase tracking-widest font-bold">
                  TELEPHONE NUMBER
                </label>
                <input
                  id="chk-custphone"
                  type="tel"
                  required
                  placeholder="e.g. 087 123 4567"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full border border-brand-dark/10 p-2.5 text-sm font-mono focus:border-brand-dark outline-none bg-brand-beige/10 rounded-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="chk-custemail" className="block font-mono text-xs text-brand-accent uppercase tracking-widest font-bold">
                EMAIL ADDRESS
              </label>
              <input
                id="chk-custemail"
                type="email"
                required
                placeholder="e.g. liam@example.ie"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full border border-brand-dark/10 p-2.5 text-sm font-mono focus:border-brand-dark outline-none bg-brand-beige/10 rounded-none"
              />
            </div>

            {serviceType === 'delivery' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-fade-in" id="delivery-address-area">
                <div className="space-y-1">
                  <label htmlFor="chk-custaddress" className="block font-mono text-xs text-brand-accent uppercase tracking-widest font-bold">
                    STREET ADDRESS (LIMERICK CITY ONLY)
                  </label>
                  <textarea
                    id="chk-custaddress"
                    rows={2}
                    required
                    placeholder="Street Address, Apartment or Suite number"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full border border-brand-dark/10 p-2.5 text-sm font-mono focus:border-brand-dark outline-none bg-brand-beige/10 rounded-none resize-none"
                  ></textarea>
                </div>
                <div className="space-y-1">
                  <label htmlFor="chk-custeircode" className="block font-mono text-xs text-brand-accent uppercase tracking-widest font-bold">
                    EIR CODE
                  </label>
                  <input
                    id="chk-custeircode"
                    type="text"
                    required
                    placeholder="e.g. V14 AW71"
                    value={eirCode}
                    onChange={(e) => setEirCode(e.target.value)}
                    className="w-full border border-brand-dark/10 p-2.5 text-sm font-mono focus:border-brand-dark outline-none bg-brand-beige/10 uppercase rounded-none"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label htmlFor="chk-custtime" className="block font-mono text-xs text-brand-accent uppercase tracking-widest font-bold">
                PREFERRED FULFILLMENT TIME
              </label>
              <select
                id="chk-custtime"
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="w-full border border-brand-dark/10 p-2.5 text-sm font-mono focus:border-brand-dark outline-none bg-brand-beige/10 bg-white rounded-none"
              >
                <option value="As soon as possible (approx. 30-45 mins)">As soon as possible (approx. 30-45 mins)</option>
                <option value="In 1 Hour">In 1 Hour</option>
                <option value="In 1.5 Hours">In 1.5 Hours</option>
                <option value="In 2 Hours">In 2 Hours</option>
                <option value="Later this evening (Selected for 19:30)">Later this evening (Selected for 19:30)</option>
                <option value="Later this evening (Selected for 20:30)">Later this evening (Selected for 20:30)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="chk-custnotes" className="block font-mono text-xs text-brand-accent uppercase tracking-widest font-bold">
                SPECIAL INSTRUCTIONS (E.G. ALLERGIES, CHILI LEVEL)
              </label>
              <textarea
                id="chk-custnotes"
                rows={2}
                placeholder="Spiciness requests, gate codes, etc."
                value={checkoutNotes}
                onChange={(e) => setCheckoutNotes(e.target.value)}
                className="w-full border border-brand-dark/10 p-2.5 text-sm font-mono focus:border-brand-dark outline-none bg-brand-beige/10 rounded-none resize-none"
              ></textarea>
            </div>

            <button
              type="submit"
              id="confirm-checkout-btn"
              className="w-full bg-brand-accent text-white hover:bg-brand-dark py-3.5 text-sm font-mono uppercase tracking-widest font-bold transition-colors rounded-none"
            >
              CONFIRM ORDER &amp; COMMENCE PREPARATION
            </button>
          </form>

          {/* Cart Summary Side */}
          <div className="lg:col-span-5 bg-brand-beige border border-brand-dark/15 p-6 space-y-6">
            <h3 className="font-serif text-lg font-bold text-brand-dark">Order Breakdown</h3>
            
            <div className="divide-y divide-brand-dark/5 space-y-3">
              {cart.map((item) => {
                const itemPrice = item.selectedSize ? item.selectedSize.price : item.menuItem.price;
                return (
                  <div key={item.id} className="pt-3 flex justify-between gap-4 font-mono text-sm">
                    <div>
                      <span className="font-bold text-brand-dark">
                        {item.quantity}x {item.menuItem.name}
                      </span>
                      {item.selectedSize && (
                        <span className="block text-sm text-brand-muted italic">
                          Size: {item.selectedSize.name}
                        </span>
                      )}
                      {item.notes && (
                        <span className="block text-sm text-brand-accent italic font-sans truncate max-w-[200px]">
                          &ldquo;{item.notes}&rdquo;
                        </span>
                      )}
                    </div>
                    <span className="text-brand-dark">&euro;{(itemPrice * item.quantity).toFixed(2)}</span>
                  </div>
                );
              })}
            </div>

            {/* Calculations block */}
            <div className="border-t border-brand-dark/10 pt-4 space-y-2 font-mono text-sm text-brand-muted">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-brand-dark">&euro;{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center">
                  Packaging Fee <span className="ml-1 text-xs bg-brand-dark/5 px-1 font-sans">Statutory</span>
                </span>
                <span className="text-brand-dark">&euro;{packagingFee.toFixed(2)}</span>
              </div>
              {serviceType === 'delivery' && (
                <div className="flex justify-between">
                  <span>Local Delivery Charge</span>
                  <span className="text-brand-dark">&euro;{deliveryCharges.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-brand-dark/15 pt-3 font-semibold text-base flex justify-between text-brand-dark">
                <span>GRAND TOTAL</span>
                <span>&euro;{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

        </div>

      ) : (

        /* MENU SELECTION & ACTIVE CART SPLIT SCREEN */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Categories Sidebar navigation - Desktop & Mobile with horizontal scroll arrows */}
          <div className="lg:col-span-3 space-y-2">
            <span className="block font-sans text-xs text-brand-accent tracking-wider font-extrabold uppercase mb-4 pl-3 lg:pl-0">
              Menu Sections
            </span>
            <div className="relative flex items-center lg:block">
              {/* Left Gradient Fade Mask - Mobile only */}
              {showLeftArrow && (
                <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-brand-beige to-transparent z-10 lg:hidden animate-fade-in" />
              )}
              
              {/* Left Arrow Button */}
              {showLeftArrow && (
                <button
                  type="button"
                  onClick={() => scrollCategories('left')}
                  className="absolute left-1 z-20 bg-transparent text-brand-dark hover:text-brand-accent w-9 h-9 flex items-center justify-center lg:hidden hover:scale-125 active:scale-90 transition-all duration-300"
                  aria-label="Scroll categories left"
                >
                  <ChevronLeft className="w-6 h-6 stroke-[3]" />
                </button>
              )}

              {/* Scrollable Container */}
              <div 
                ref={categoriesRef}
                onScroll={updateArrows}
                className="flex lg:flex-col overflow-x-auto lg:overflow-visible gap-2 pb-3 lg:pb-0 scrollbar-none w-full scroll-smooth px-3 lg:px-0"
              >
                {CATEGORIES.map((cat) => {
                  const isActive = selectedCategory === cat;
                  return (
                    <button
                      type="button"
                      id={`order-category-btn-${cat.replace(/\s+/g, '-').toLowerCase()}`}
                      key={cat}
                      onClick={(e) => {
                        setSelectedCategory(cat);
                        e.currentTarget.scrollIntoView({
                          behavior: 'smooth',
                          block: 'nearest',
                          inline: 'center'
                        });
                      }}
                      className={`text-left px-5 py-3 text-xs font-sans tracking-wider uppercase transition-all duration-500 ease-out lg:w-full whitespace-nowrap lg:whitespace-normal border-l-4 font-bold group relative flex items-center justify-between ${
                        isActive
                          ? 'bg-brand-dark text-white border-brand-accent shadow-md'
                          : 'bg-white border-transparent text-brand-muted hover:text-brand-dark hover:bg-brand-dark/5 hover:translate-x-1 hover:border-brand-dark/20'
                      }`}
                    >
                      <span>{cat}</span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 bg-brand-accent shrink-0 ml-2 hidden lg:inline-block animate-pulse"></span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Right Gradient Fade Mask - Mobile only */}
              {showRightArrow && (
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-brand-beige to-transparent z-10 lg:hidden animate-fade-in" />
              )}

              {/* Right Arrow Button */}
              {showRightArrow && (
                <button
                  type="button"
                  onClick={() => scrollCategories('right')}
                  className="absolute right-1 z-20 bg-transparent text-brand-dark hover:text-brand-accent w-9 h-9 flex items-center justify-center lg:hidden hover:scale-125 active:scale-90 transition-all duration-300"
                  aria-label="Scroll categories right"
                >
                  <ChevronRight className="w-6 h-6 stroke-[3]" />
                </button>
              )}
            </div>
          </div>

          {/* Menu Items Grid Column */}
          <div className="lg:col-span-5 space-y-6">
            <div className="border-b border-brand-dark/10 pb-4 flex justify-between items-baseline">
              <h2 className="font-serif text-2xl font-bold tracking-tight text-brand-dark">
                {selectedCategory}
              </h2>
              <span className="font-mono text-sm text-brand-muted">
                {filteredItems.length} items
              </span>
            </div>

            <div className="space-y-6 animate-slide-up" key={selectedCategory} id="order-items-scrollable">
              {filteredItems.map((item) => {
                const activeSize = selectedSizes[item.id];
                const activePrice = activeSize ? activeSize.price : item.price;
                const notes = customNotes[item.id] || '';

                return (
                  <div 
                    key={item.id} 
                    className="p-6 bg-white hover:bg-brand-beige/30 border-t border-brand-dark/10 hover:border-brand-dark/30 transition-all duration-300 flex flex-col justify-between space-y-5 shadow-[0_4px_16px_rgba(44,38,33,0.015)] hover:shadow-[0_6px_20px_rgba(44,38,33,0.03)]"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-4">
                        <h3 className="font-serif text-lg font-bold text-brand-dark flex items-center gap-1.5">
                          {item.name}
                          {item.isVeg && (
                            <span className="w-1.5 h-1.5 bg-emerald-600 inline-block rounded-none ring-1" title="Veg Available"></span>
                          )}
                        </h3>
                        <span className="font-mono text-base font-semibold text-brand-dark">
                          &euro;{activePrice.toFixed(2)}
                        </span>
                      </div>

                      {item.description && (
                        <p className="text-sm text-brand-muted leading-relaxed font-normal">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Options area: size selector if any */}
                    {item.sizeOptions && item.sizeOptions.length > 0 && (
                      <div className="space-y-1">
                        <span className="block font-mono text-xs text-brand-accent tracking-widest font-bold">
                          CHOOSE SIZE:
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {item.sizeOptions.map((opt) => (
                            <button
                              type="button"
                              id={`size-opt-${item.id}-${opt.name.replace(/\s+/g, '-').toLowerCase()}`}
                              key={opt.name}
                              onClick={() => handleSizeChange(item.id, opt.name)}
                              className={`py-1.5 px-3 text-sm font-mono border transition-all truncate text-center ${
                                activeSize?.name === opt.name
                                  ? 'bg-brand-dark text-white border-brand-dark font-bold'
                                  : 'border-brand-dark/15 text-brand-muted hover:border-brand-dark'
                              }`}
                            >
                              {opt.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Inline special chefs notes */}
                    <div className="space-y-1">
                      <label htmlFor={`custom-notes-${item.id}`} className="block font-mono text-xs text-brand-accent tracking-widest font-bold">
                        ADD SPECIAL NOTES FOR CHEF (OPTIONAL)
                      </label>
                      <input
                        id={`custom-notes-${item.id}`}
                        type="text"
                        placeholder="e.g., extra hot, garlic sauce on top, no salad..."
                        value={notes}
                        onChange={(e) => setCustomNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        className="w-full text-sm font-mono border border-brand-dark/10 px-3 py-2 bg-brand-beige/25 outline-none focus:border-brand-dark placeholder:text-brand-muted/50 rounded-none"
                      />
                    </div>

                    {/* Core action button */}
                    <div className="pt-2 flex items-center justify-between">
                      {/* Temporary indicator on addition */}
                      <span 
                        id={`added-notif-${item.id}`}
                        className="text-sm font-mono text-emerald-600 font-bold opacity-0 transition-opacity duration-300 flex items-center"
                      >
                        ✓ ADDED TO BASKET
                      </span>

                      <button
                        type="button"
                        id={`add-to-cart-btn-${item.id}`}
                        onClick={() => handleAddWithDetails(item)}
                        className="bg-brand-dark text-white hover:bg-brand-accent px-6 py-2.5 text-sm font-mono font-bold uppercase tracking-wider transition-colors"
                      >
                        ADD TO CART &bull; &euro;{activePrice.toFixed(2)}
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Checkout Basket Column */}
          <div className="lg:col-span-4 bg-white border border-brand-dark/10 p-6 space-y-6 lg:sticky lg:top-24">
            <div className="flex items-center justify-between border-b border-brand-dark/10 pb-4">
              <h3 className="font-serif text-lg font-bold text-brand-dark flex items-center">
                <ShoppingCart className="w-4 h-4 mr-2" />
                Shopping Basket
              </h3>
              <span className="font-mono text-sm bg-brand-dark text-white px-2 py-0.5 rounded-none font-semibold">
                {cart.reduce((acc, curr) => acc + curr.quantity, 0)} items
              </span>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-16 text-brand-muted space-y-3" id="empty-basket-message">
                <p className="font-serif text-base">Your basket is empty.</p>
                <p className="font-mono text-sm text-brand-accent font-normal uppercase">
                  Select item options on the left to build your feast.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Active items scroll box */}
                <div className="max-h-[320px] overflow-y-auto space-y-4 pr-1 divide-y divide-brand-dark/5" id="cart-items-scroller">
                  {cart.map((cartItem, idx) => {
                    const price = cartItem.selectedSize ? cartItem.selectedSize.price : cartItem.menuItem.price;
                    return (
                      <div key={cartItem.id} className={`pt-3 space-y-1.5 ${idx === 0 ? 'border-t-0 pt-0' : ''}`}>
                        <div className="flex justify-between items-start gap-4">
                          <div className="space-y-0.5">
                            <span className="font-serif text-sm font-bold text-brand-dark block">
                              {cartItem.menuItem.name}
                            </span>
                            {cartItem.selectedSize && (
                              <span className="font-mono text-xs bg-brand-dark/5 px-1 py-0.5 border border-brand-dark/5 text-brand-dark block w-max">
                                Size: {cartItem.selectedSize.name}
                              </span>
                            )}
                            {cartItem.notes && (
                              <span className="block text-sm text-brand-accent italic font-sans max-w-[160px] truncate">
                                Notes: &ldquo;{cartItem.notes}&rdquo;
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-sm font-bold text-brand-dark">
                            &euro;{(price * cartItem.quantity).toFixed(2)}
                          </span>
                        </div>

                        {/* Adjust qty panel */}
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            id={`remove-cart-item-btn-${cartItem.id}`}
                            onClick={() => removeFromCart(cartItem.id)}
                            className="text-sm text-red-600 hover:text-red-800 font-mono flex items-center space-x-1"
                            aria-label={`Remove ${cartItem.menuItem.name} from cart`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>

                          <div className="flex items-center space-x-2 border border-brand-dark/10 p-0.5">
                            <button
                              type="button"
                              id={`decrease-qty-btn-${cartItem.id}`}
                              onClick={() => updateQuantity(cartItem.id, -1)}
                              className="p-1 text-brand-dark hover:bg-brand-dark/5"
                              disabled={cartItem.quantity <= 1}
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-mono text-sm font-bold text-brand-dark px-1.5">
                              {cartItem.quantity}
                            </span>
                            <button
                              type="button"
                              id={`increase-qty-btn-${cartItem.id}`}
                              onClick={() => updateQuantity(cartItem.id, 1)}
                              className="p-1 text-brand-dark hover:bg-brand-dark/5"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Calculation breakdown */}
                <div className="border-t border-brand-dark/15 pt-4 space-y-2 font-mono text-sm text-brand-muted">
                  <div className="flex justify-between">
                    <span>Menu Subtotal</span>
                    <span className="text-brand-dark">&euro;{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center">
                      Statutory Packaging Fee
                    </span>
                    <span className="text-brand-dark">&euro;{packagingFee.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-dashed border-brand-dark/10 pt-2 font-bold text-base flex justify-between text-brand-dark">
                    <span>ESTIMATED TOTAL</span>
                    <span>&euro;{total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Continue checkout path trigger */}
                <button
                  type="button"
                  id="start-checkout-btn"
                  onClick={() => {
                    if (!takeawayEnabled) {
                      setShowTakeawayWarningModal(true);
                    } else {
                      setIsCheckoutMode(true);
                    }
                  }}
                  className={`w-full py-4 text-sm font-mono font-bold uppercase tracking-widest text-center transition-all flex items-center justify-center space-x-2 ${
                    !takeawayEnabled
                      ? 'bg-red-700 hover:bg-red-800 text-white'
                      : 'bg-brand-dark text-white hover:bg-brand-accent'
                  }`}
                >
                  <span>{!takeawayEnabled ? 'ONLINE ORDER CLOSED' : 'PROCEED TO DETAILS'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

              </div>
            )}

          </div>

        </div>
      )}

      {/* Mobile Floating Action Checkout Button */}
      {cart.length > 0 && !isCheckoutMode && (
        <div className="fixed bottom-6 left-4 right-4 z-40 lg:hidden animate-slide-up">
          <button
            type="button"
            onClick={() => {
              if (!takeawayEnabled) {
                setShowTakeawayWarningModal(true);
              } else {
                setIsCheckoutMode(true);
              }
            }}
            className={`w-full backdrop-blur-md px-5 py-4 flex items-center justify-between border border-brand-dark shadow-[0_12px_40px_-6px_rgba(44,38,33,0.15),inset_0_1px_1px_rgba(255,255,255,0.8)] active:scale-98 transition-all duration-300 ${
              !takeawayEnabled
                ? 'bg-gradient-to-b from-red-50/95 to-red-100/80 text-red-900 border-red-800'
                : 'bg-gradient-to-b from-white/95 to-white/80 text-brand-dark'
            }`}
          >
            <div className="flex items-center space-x-3">
              <span className={`font-mono text-xs w-5 h-5 flex items-center justify-center font-bold ${!takeawayEnabled ? 'bg-red-800 text-white' : 'bg-brand-dark text-white'}`}>
                {cart.reduce((acc, curr) => acc + curr.quantity, 0)}
              </span>
              <span className="font-mono text-xs uppercase font-bold tracking-widest">FEAST SELECTED</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm font-bold">&euro;{total.toFixed(2)}</span>
              <span className={`font-mono text-xs uppercase font-bold tracking-widest border-l pl-3 ${!takeawayEnabled ? 'border-red-900/20' : 'border-brand-dark/20'}`}>
                {!takeawayEnabled ? 'ORDER CLOSED →' : 'PROCEED →'}
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Custom Warning Modal Dialog */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-md bg-white border border-brand-dark p-6 sm:p-8 space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-slide-up">
            
            {/* Close Button X */}
            <button
              type="button"
              onClick={() => setShowWarningModal(false)}
              className="absolute top-4 right-4 p-1.5 text-brand-muted hover:text-brand-dark hover:bg-brand-dark/5 transition-colors border border-transparent hover:border-brand-dark/10"
              aria-label="Close warning"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Warning Content */}
            <div className="text-center space-y-4 pt-2">
              <div className="w-12 h-12 bg-brand-accent/10 text-brand-accent flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="font-sans text-xl sm:text-2xl font-bold tracking-tight text-brand-dark">
                Online Ordering Notice
              </h3>
              <p className="font-sans text-base text-brand-muted leading-relaxed font-medium text-center">
                {noticeText}
              </p>
              <p className="font-sans text-3xl font-extrabold text-brand-dark tracking-tight">
                {noticePhone}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href={`tel:${noticePhone.replace(/\s+/g, '')}`}
                className="flex-1 bg-brand-accent hover:bg-brand-dark text-white py-3.5 text-sm font-sans font-bold uppercase tracking-wider text-center transition-colors flex items-center justify-center space-x-2"
              >
                <Phone className="w-4 h-4" />
                <span>Call Now</span>
              </a>
              <button
                type="button"
                onClick={() => setShowWarningModal(false)}
                className="flex-1 border border-brand-dark/15 hover:border-brand-dark text-brand-dark py-3.5 text-sm font-sans font-bold uppercase tracking-wider text-center transition-colors"
              >
                Dismiss
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Custom Takeaway Closed Warning Modal Dialog */}
      {showTakeawayWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-dark/70 backdrop-blur-sm animate-fade-in" id="takeaway-disabled-modal">
          <div className="relative w-full max-w-md bg-white border border-brand-dark p-6 sm:p-8 space-y-6 shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-slide-up">
            
            {/* Close Button X */}
            <button
              type="button"
              onClick={() => setShowTakeawayWarningModal(false)}
              className="absolute top-4 right-4 p-1.5 text-brand-muted hover:text-brand-dark hover:bg-brand-dark/5 transition-colors border border-transparent hover:border-brand-dark/10"
              aria-label="Close warning"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Warning Content */}
            <div className="text-center space-y-4 pt-2">
              <div className="w-12 h-12 bg-red-100 text-red-700 flex items-center justify-center mx-auto">
                <ShoppingBag className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="font-sans text-xl sm:text-2xl font-bold tracking-tight text-brand-dark">
                Online Ordering Paused
              </h3>
              <p className="font-sans text-sm sm:text-base text-brand-muted leading-relaxed font-medium text-center">
                {takeawayNotice}
              </p>
              <p className="font-sans text-xs text-brand-accent font-bold uppercase tracking-wider">
                We are actively taking orders by phone! Please dial:
              </p>
              <p className="font-sans text-3xl font-extrabold text-brand-dark tracking-tight">
                {noticePhone}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <a
                href={`tel:${noticePhone.replace(/\s+/g, '')}`}
                className="flex-1 bg-brand-accent hover:bg-brand-dark text-white py-3.5 text-sm font-sans font-bold uppercase tracking-wider text-center transition-colors flex items-center justify-center space-x-2"
              >
                <Phone className="w-4 h-4" />
                <span>Call Us Now</span>
              </a>
              <button
                type="button"
                onClick={() => setShowTakeawayWarningModal(false)}
                className="flex-1 border border-brand-dark/15 hover:border-brand-dark text-brand-dark py-3.5 text-sm font-sans font-bold uppercase tracking-wider text-center transition-colors"
              >
                Browse Menu
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
