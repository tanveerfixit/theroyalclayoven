/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { ShoppingCart, Plus, Minus, Trash2, Check, ArrowRight, ArrowLeft, Clock, MapPin, Sparkles, ShoppingBag, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Phone, X, CookingPot } from 'lucide-react';
import { MenuItem, CartItem, Order } from '../types';
import { MENU_ITEMS, CATEGORIES } from '../data/menu';
import {
  DeliverySchedule,
  DAY_NAMES,
  getDefaultDeliverySchedule,
  parseDeliverySchedule,
  getStoreOperatingStatus,
  getTakeawayTimeOptions,
  getTodayDeliveryStatus,
  getTodayDeliveryTimeOptions
} from '../utils/deliveryScheduler';

interface OrderViewProps {
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  addToCart: (item: MenuItem, size?: { name: string; price: number }, notes?: string) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, delta: number) => void;
  businessInfo: {
    business_name: string;
    address: string;
    maps_url: string;
    phone: string;
    mobile: string;
    whatsapp: string;
    email: string;
  };
  storeSettings: Record<string, string>;
}

export const OrderView: React.FC<OrderViewProps> = ({
  cart,
  setCart,
  addToCart,
  removeFromCart,
  updateQuantity,
  businessInfo: parentBusinessInfo,
  storeSettings
}) => {
  const [selectedCategory, setSelectedCategory] = React.useState<string>('Pakistani Cuisine');
  const [customNotes, setCustomNotes] = React.useState<{ [itemId: string]: string }>({});
  const [selectedSizes, setSelectedSizes] = React.useState<{ [itemId: string]: { name: string; price: number } }>({});
  
  // Checkout journey steps
  const [isCheckoutMode, setIsCheckoutMode] = React.useState(false);
  const [showMobileOrderSummary, setShowMobileOrderSummary] = React.useState(false);
  const [showWarningModal, setShowWarningModal] = React.useState(false);
  const [serviceType, setServiceType] = React.useState<'takeaway' | 'delivery'>('takeaway');

  const [noticeText, setNoticeText] = React.useState(localStorage.getItem('clay_oven_notice_text') || 'We are Still Working on Website, for online order please contact.');
  const [noticePhone, setNoticePhone] = React.useState(localStorage.getItem('clay_oven_notice_phone') || '089 489 9950');
  const [noticeEnabled, setNoticeEnabled] = React.useState(localStorage.getItem('clay_oven_notice_enabled') === 'true');
  const [takeawayEnabled, setTakeawayEnabled] = React.useState(localStorage.getItem('clay_oven_takeaway_enabled') !== 'false');
  const [takeawayNotice, setTakeawayNotice] = React.useState(localStorage.getItem('clay_oven_takeaway_notice') || 'We are temporarily not taking online orders. Please phone us to order directly!');
  const [showTakeawayWarningModal, setShowTakeawayWarningModal] = React.useState(false);
  const [takeawayCharges, setTakeawayCharges] = React.useState(parseFloat(localStorage.getItem('clay_oven_takeaway_charges') || '0.95'));
  const [deliveryChargesSetting, setDeliveryChargesSetting] = React.useState(parseFloat(localStorage.getItem('clay_oven_delivery_charges') || '3.00'));

  const [businessInfo, setBusinessInfo] = React.useState({
    phone: parentBusinessInfo.phone || '086 020 3720',
  });

  React.useEffect(() => {
    setBusinessInfo({ phone: parentBusinessInfo.phone });
  }, [parentBusinessInfo]);

  // Sync settings with props
  React.useEffect(() => {
    if (!storeSettings || Object.keys(storeSettings).length === 0) return;
    const data = storeSettings;
    if (data.clay_oven_notice_text) {
      setNoticeText(data.clay_oven_notice_text);
      localStorage.setItem('clay_oven_notice_text', data.clay_oven_notice_text);
    }
    if (data.clay_oven_notice_phone) {
      setNoticePhone(data.clay_oven_notice_phone);
      localStorage.setItem('clay_oven_notice_phone', data.clay_oven_notice_phone);
    }
    if (data.clay_oven_notice_enabled !== undefined) {
      const enabled = data.clay_oven_notice_enabled !== 'false';
      setNoticeEnabled(enabled);
      localStorage.setItem('clay_oven_notice_enabled', String(enabled));
    }
    if (data.clay_oven_takeaway_enabled !== undefined) {
      const enabled = data.clay_oven_takeaway_enabled !== 'false';
      setTakeawayEnabled(enabled);
      setShowTakeawayWarningModal(!enabled);
      localStorage.setItem('clay_oven_takeaway_enabled', String(enabled));
    } else {
      setShowTakeawayWarningModal(!takeawayEnabled);
    }
    if (data.clay_oven_takeaway_notice) {
      setTakeawayNotice(data.clay_oven_takeaway_notice);
      localStorage.setItem('clay_oven_takeaway_notice', data.clay_oven_takeaway_notice);
    }
    if (data.clay_oven_takeaway_charges !== undefined) {
      const charge = parseFloat(data.clay_oven_takeaway_charges);
      setTakeawayCharges(isNaN(charge) ? 0.95 : charge);
      localStorage.setItem('clay_oven_takeaway_charges', data.clay_oven_takeaway_charges);
    }
    if (data.clay_oven_delivery_charges !== undefined) {
      const charge = parseFloat(data.clay_oven_delivery_charges);
      setDeliveryChargesSetting(isNaN(charge) ? 3.00 : charge);
      localStorage.setItem('clay_oven_delivery_charges', data.clay_oven_delivery_charges);
    }
    if (data.clay_oven_delivery_schedule) {
      const sched = parseDeliverySchedule(data.clay_oven_delivery_schedule);
      setDeliverySchedule(sched);
      localStorage.setItem(
        'clay_oven_delivery_schedule',
        typeof data.clay_oven_delivery_schedule === 'string'
          ? data.clay_oven_delivery_schedule
          : JSON.stringify(data.clay_oven_delivery_schedule)
      );
    }
  }, [storeSettings]);
  
  // Checkout inputs
  const [customerName, setCustomerName] = React.useState('');
  const [customerPhone, setCustomerPhone] = React.useState('');
  const [customerEmail, setCustomerEmail] = React.useState('');
  const [deliveryAddress, setDeliveryAddress] = React.useState('');
  const [eirCode, setEirCode] = React.useState('');
  const [preferredTime, setPreferredTime] = React.useState('As soon as possible (approx. 30-45 mins)');
  const [deliverySchedule, setDeliverySchedule] = React.useState<DeliverySchedule>(() => {
    const saved = localStorage.getItem('clay_oven_delivery_schedule');
    return parseDeliverySchedule(saved);
  });
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

  // Alert customer that the site is under construction when entering checkout mode (only if notice is enabled)
  React.useEffect(() => {
    if (isCheckoutMode && noticeEnabled) {
      setShowWarningModal(true);
    }
  }, [isCheckoutMode, noticeEnabled]);
  
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

  // Pakistani Cuisine side choice modal state
  const [pakistaniSideModalItem, setPakistaniSideModalItem] = React.useState<MenuItem | null>(null);
  const [selectedSideChoice, setSelectedSideChoice] = React.useState<'Naan Bread' | 'White Rice'>('Naan Bread');
  const [modalChefNotes, setModalChefNotes] = React.useState<string>('');

  // Free Cold Drink modal state for Burgers, Wraps & Sandwiches
  const [drinkModalItem, setDrinkModalItem] = React.useState<MenuItem | null>(null);
  const [selectedDrinkChoice, setSelectedDrinkChoice] = React.useState<string>('Cola');
  const [drinkModalNotes, setDrinkModalNotes] = React.useState<string>('');

  const handleSizeChange = (itemId: string, sizeName: string) => {
    const item = MENU_ITEMS.find((i) => i.id === itemId);
    if (item && item.sizeOptions) {
      const selectedOption = item.sizeOptions.find((opt) => opt.name === sizeName);
      if (selectedOption) {
        setSelectedSizes((prev) => ({ ...prev, [itemId]: selectedOption }));
      }
    }
  };

  const executeAddToCart = (item: MenuItem, size?: { name: string; price: number }, notes?: string) => {
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

  const handleAddWithDetails = (item: MenuItem) => {
    if (item.category === 'Pakistani Cuisine') {
      setPakistaniSideModalItem(item);
      setSelectedSideChoice('Naan Bread');
      setModalChefNotes(customNotes[item.id] || '');
      return;
    }

    if (item.category === 'Burgers' || item.category === 'Wraps & Sandwiches') {
      setDrinkModalItem(item);
      setSelectedDrinkChoice('Cola');
      setDrinkModalNotes(customNotes[item.id] || '');
      return;
    }

    const size = selectedSizes[item.id];
    const notes = customNotes[item.id] || '';
    executeAddToCart(item, size, notes);
  };

  const handleConfirmPakistaniSide = () => {
    if (!pakistaniSideModalItem) return;
    const size = selectedSizes[pakistaniSideModalItem.id];
    const sideNote = `Side: ${selectedSideChoice}`;
    const fullNotes = [sideNote, modalChefNotes.trim()].filter(Boolean).join(' | ');

    executeAddToCart(pakistaniSideModalItem, size, fullNotes);
    setPakistaniSideModalItem(null);
    setModalChefNotes('');
  };

  const handleConfirmDrinkChoice = () => {
    if (!drinkModalItem) return;
    const size = selectedSizes[drinkModalItem.id];
    const drinkNote = `Free Drink: ${selectedDrinkChoice}`;
    const fullNotes = [drinkNote, drinkModalNotes.trim()].filter(Boolean).join(' | ');

    executeAddToCart(drinkModalItem, size, fullNotes);
    setDrinkModalItem(null);
    setDrinkModalNotes('');
  };

  // Calculations
  const subtotal = cart.reduce((acc, curr) => {
    const pricePerItem = curr.selectedSize ? curr.selectedSize.price : curr.menuItem.price;
    return acc + pricePerItem * curr.quantity;
  }, 0);
  
  const packagingFee = subtotal > 0 ? takeawayCharges : 0.00;
  const deliveryCharges = serviceType === 'delivery' ? deliveryChargesSetting : 0.00;
  const total = subtotal + packagingFee + deliveryCharges;

  // Today's Delivery status & simple time options
  const deliveryStatusToday = React.useMemo(
    () => getTodayDeliveryStatus(deliverySchedule),
    [deliverySchedule]
  );
  const deliveryTimeOptions = React.useMemo(
    () => getTodayDeliveryTimeOptions(deliveryStatusToday),
    [deliveryStatusToday]
  );

  // Today's operating hours and Takeaway time options
  const todayDayName = DAY_NAMES[new Date().getDay()];
  const todayTimingStr =
    (storeSettings && storeSettings[`clay_oven_timing_${todayDayName}`]) ||
    localStorage.getItem(`clay_oven_timing_${todayDayName}`) ||
    '4:00 PM - 9:00 PM';
  const storeStatus = React.useMemo(() => getStoreOperatingStatus(todayTimingStr), [todayTimingStr]);
  const takeawayTimeOptions = React.useMemo(() => getTakeawayTimeOptions(todayTimingStr), [todayTimingStr]);

  // Synchronize preferredTime when toggling between delivery and takeaway
  React.useEffect(() => {
    if (serviceType === 'delivery') {
      if (deliveryTimeOptions.length > 0) {
        const isValid = deliveryTimeOptions.some((opt) => opt.value === preferredTime && opt.isAvailable);
        if (!isValid) {
          const firstAvailable = deliveryTimeOptions.find((opt) => opt.isAvailable);
          if (firstAvailable) setPreferredTime(firstAvailable.value);
        }
      }
    } else {
      if (takeawayTimeOptions.length > 0) {
        const isValid = takeawayTimeOptions.some((opt) => opt.value === preferredTime && opt.isAvailable);
        if (!isValid) {
          const firstAvailable = takeawayTimeOptions.find((opt) => opt.isAvailable);
          if (firstAvailable) setPreferredTime(firstAvailable.value);
        }
      }
    }
  }, [serviceType, deliveryTimeOptions, takeawayTimeOptions, preferredTime]);

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

    if (serviceType === 'delivery') {
      if (!deliveryStatusToday.isDeliveryDay) {
        setValidationError(`Home delivery is available on ${deliveryStatusToday.activeDaysLabel}. Please choose Collection for your order today.`);
        return;
      }
      if (deliveryStatusToday.isAfterClose) {
        setValidationError(`Home delivery has ended for tonight (closed at ${deliveryStatusToday.endTimeLabel}). Please choose Collection.`);
        return;
      }
      if (!preferredTime) {
        setValidationError('Please select a preferred delivery time.');
        return;
      }
    } else {
      if (storeStatus.isAfterClose) {
        setValidationError('The kitchen is currently closed for takeaway collection today.');
        return;
      }
      if (!preferredTime) {
        setValidationError('Please select a preferred collection time.');
        return;
      }
    }

    const finalPreferredTime = preferredTime;

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
        preferredTime: finalPreferredTime,
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
              <span className="text-xs tracking-widest text-brand-accent uppercase font-bold px-2.5 py-1 bg-brand-accent/10 rounded-full inline-block">
                PAKISTANI KITCHEN ORDER CONFIRMED
              </span>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-brand-dark">
                Thank You For Your Order!
              </h2>
              <p className="text-xs sm:text-sm text-brand-muted font-medium uppercase">
                Ref ID: <span className="text-brand-dark font-bold">{placedOrder.id}</span>
              </p>
            </div>

            <div className="border-t border-b border-brand-dark/10 py-5 text-left space-y-2.5 text-xs sm:text-sm text-brand-muted">
              <div className="flex justify-between font-bold text-brand-dark">
                <span>Fulfillment Type</span>
                <span className="uppercase">{placedOrder.serviceType}</span>
              </div>
              <div className="flex justify-between">
                <span>Customer Name</span>
                <span className="text-brand-dark font-medium">{placedOrder.customerInfo.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Fulfillment Time</span>
                <span className="text-brand-dark font-medium">{placedOrder.customerInfo.preferredTime}</span>
              </div>
              
              {placedOrder.customerInfo.address && (
                <div className="border-t border-dashed border-brand-dark/5 pt-2">
                  <span className="font-semibold text-brand-dark block mb-0.5">Deliver To:</span>
                  <span className="text-brand-muted">{placedOrder.customerInfo.address}</span>
                </div>
              )}
            </div>

          <div className="space-y-2.5 text-left">
            <h4 className="text-sm font-bold text-brand-dark">Order Items Summarized:</h4>
            <div className="text-xs sm:text-sm bg-brand-dark/[0.02] p-4 rounded-2xl space-y-2">
              {placedOrder.items.map((it, idx) => (
                <div key={idx} className="flex justify-between text-brand-muted">
                  <span>
                    {it.quantity}x {it.name} {it.size ? `(${it.size})` : ''}
                    {it.notes && (
                      <span className="block text-xs text-brand-accent italic">
                        &ldquo;{it.notes}&rdquo;
                      </span>
                    )}
                  </span>
                  <span className="text-brand-dark font-bold">&euro;{(it.price * it.quantity).toFixed(2)}</span>
                </div>
              ))}
              <div className="border-t border-dashed border-brand-dark/10 pt-2 font-bold flex justify-between text-brand-dark text-sm sm:text-base">
                <span>TOTAL PAID</span>
                <span>&euro;{placedOrder.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-brand-muted leading-relaxed font-normal">
            We are now preparing your authentic dishes using traditional charcoal fires. Standard turnaround time is 35 mins. If you have immediate inquiries, phone our line at <span className="font-bold text-brand-dark">{businessInfo.phone}</span>.
          </p>

          <button
            type="button"
            id="order-again-btn"
            onClick={handleOrderAgain}
            className="w-full bg-brand-dark hover:bg-brand-accent text-white py-3.5 text-xs sm:text-sm uppercase tracking-wider font-bold rounded-full shadow-md transition-all active:scale-[0.98]"
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
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-28 lg:pb-20 animate-fade-in" id="order-takeaway-view">
      
      {/* Short Mobile-Responsive Header */}
      {!isCheckoutMode && takeawayEnabled && (
        <div className="text-center max-w-xl mx-auto pt-2 sm:pt-4 mb-3 sm:mb-5">
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-brand-dark">
            Order Online
          </h1>
        </div>
      )}

      {!takeawayEnabled && (
        <div className="mb-6 rounded-2xl bg-amber-500/10 p-4 sm:p-5 text-left animate-fade-in shadow-xs" id="takeaway-disabled-banner">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-xs text-brand-accent font-extrabold uppercase tracking-widest block">★ ONLINE ORDERING PAUSED</span>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-brand-dark">
                We are actively taking orders over the phone!
              </h2>
              <p className="text-xs sm:text-sm text-brand-muted leading-normal font-medium">
                {takeawayNotice}
              </p>
            </div>
            <div className="shrink-0 pt-1 md:pt-0">
              <a
                href={`tel:${noticePhone.replace(/\s+/g, '')}`}
                className="w-max max-w-full inline-flex items-center justify-center bg-brand-accent hover:bg-brand-dark text-white font-bold text-xs uppercase tracking-wider px-4 py-2.5 rounded-full shadow-sm active:scale-95 transition-all"
              >
                <Phone className="w-3.5 h-3.5 mr-1.5" />
                Call to Order Now: {noticePhone}
              </a>
            </div>
          </div>
        </div>
      )}     {isCheckoutMode ? (
        
        /* CHECKOUT EXPERIENCE STEP */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start max-w-5xl mx-auto pt-2 sm:pt-6" id="checkout-container">
          
          {/* Back button */}
          <div className="lg:col-span-12">
            <button
              type="button"
              id="back-to-shop-btn"
              onClick={() => setIsCheckoutMode(false)}
              className="inline-flex items-center text-xs sm:text-sm font-bold tracking-wider text-brand-dark hover:text-brand-accent uppercase space-x-2 py-1.5 px-3.5 bg-white shadow-xs rounded-full hover:shadow-sm active:scale-95 transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back To Menu</span>
            </button>
          </div>

          {/* Mobile Order Summary Accordion (Top on Mobile) */}
          <div className="lg:hidden col-span-1 bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <button
              type="button"
              onClick={() => setShowMobileOrderSummary(prev => !prev)}
              className="w-full flex items-center justify-between text-base font-bold text-brand-dark cursor-pointer text-left"
              aria-expanded={showMobileOrderSummary}
            >
              <span className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-brand-accent/10 text-brand-accent flex items-center justify-center">
                  <CookingPot className="w-3.5 h-3.5" />
                </div>
                <span>Order Summary ({cart.reduce((acc, curr) => acc + curr.quantity, 0)} items)</span>
              </span>
              <span className="flex items-center gap-1.5 text-sm text-brand-dark font-extrabold">
                <span>&euro;{total.toFixed(2)}</span>
                {showMobileOrderSummary ? <ChevronUp className="w-4 h-4 text-brand-accent" /> : <ChevronDown className="w-4 h-4 text-brand-accent" />}
              </span>
            </button>

            {showMobileOrderSummary && (
              <div className="pt-3 border-t border-brand-dark/5 space-y-3 animate-fade-in">
                <div className="divide-y divide-brand-dark/5 max-h-56 overflow-y-auto space-y-2.5 pr-1">
                  {cart.map((item) => {
                    const itemPrice = item.selectedSize ? item.selectedSize.price : item.menuItem.price;
                    return (
                      <div key={item.id} className="pt-2 flex justify-between items-start gap-3 text-xs sm:text-sm">
                        <div>
                          <span className="font-bold text-brand-dark block">
                            {item.quantity}x {item.menuItem.name}
                          </span>
                          {item.selectedSize && (
                            <span className="block text-xs text-brand-muted">
                              Size: {item.selectedSize.name}
                            </span>
                          )}
                          {item.notes && (
                            <span className="block text-xs text-brand-accent italic truncate max-w-[200px]">
                              &ldquo;{item.notes}&rdquo;
                            </span>
                          )}
                        </div>
                        <span className="text-brand-dark font-bold shrink-0">&euro;{(itemPrice * item.quantity).toFixed(2)}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-brand-dark/5 pt-2.5 space-y-1.5 text-xs sm:text-sm text-brand-muted">
                  <div className="flex justify-between">
                    <span>Menu Subtotal</span>
                    <span className="text-brand-dark font-semibold">&euro;{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Statutory Packaging Fee</span>
                    <span className="text-brand-dark font-semibold">&euro;{packagingFee.toFixed(2)}</span>
                  </div>
                  {serviceType === 'delivery' && (
                    <div className="flex justify-between">
                      <span>Delivery Charge</span>
                      <span className="text-brand-dark font-semibold">&euro;{deliveryCharges.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-dashed border-brand-dark/10 pt-2 font-bold text-sm sm:text-base flex justify-between text-brand-dark">
                    <span>TOTAL</span>
                    <span>&euro;{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Form Side - Balanced authentic typography card */}
          <form onSubmit={handlePlaceOrderSubmit} className="lg:col-span-7 bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-5 sm:p-8 space-y-5">
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-brand-dark pb-1">
              Fulfillment &amp; Customer Details
            </h2>

            {validationError && (
              <div className="p-3.5 sm:p-4 bg-red-50 text-red-800 text-xs sm:text-sm font-semibold rounded-2xl" id="checkout-error-banner">
                {validationError}
              </div>
            )}

            {/* Service Selection */}
            <div className="space-y-2">
              <span className="block text-xs font-bold text-brand-accent uppercase tracking-wider">
                FULFILLMENT METHOD
              </span>
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                <button
                  type="button"
                  id="checkout-option-takeaway"
                  onClick={() => setServiceType('takeaway')}
                  className={`py-3.5 px-4 rounded-full text-xs sm:text-sm font-bold uppercase transition-all flex flex-col items-center justify-center space-y-1 min-h-[54px] active:scale-[0.98] ${
                    serviceType === 'takeaway'
                      ? 'bg-brand-dark text-white shadow-md'
                      : 'bg-brand-dark/[0.04] text-brand-dark hover:bg-brand-dark/[0.08]'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Collection</span>
                </button>
                <button
                  type="button"
                  id="checkout-option-delivery"
                  onClick={() => setServiceType('delivery')}
                  className={`py-3.5 px-4 rounded-full text-xs sm:text-sm font-bold uppercase transition-all flex flex-col items-center justify-center space-y-1 min-h-[54px] active:scale-[0.98] ${
                    serviceType === 'delivery'
                      ? 'bg-brand-dark text-white shadow-md'
                      : 'bg-brand-dark/[0.04] text-brand-dark hover:bg-brand-dark/[0.08]'
                  }`}
                >
                  <MapPin className="w-4 h-4" />
                  <span>Delivery</span>
                  {!deliveryStatusToday.isDeliveryDay && (
                    <span className={`text-xs lowercase font-normal tracking-tight ${serviceType === 'delivery' ? 'text-white/80' : 'text-brand-muted'}`}>
                      ({deliveryStatusToday.activeDaysLabel})
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Text Inputs with text-base to prevent iOS mobile auto-zoom */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label htmlFor="chk-custname" className="block text-xs font-bold text-brand-accent uppercase tracking-wider">
                  NAME
                </label>
                <input
                  id="chk-custname"
                  type="text"
                  required
                  placeholder="e.g. Liam O'Brien"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-brand-dark/[0.03] focus:bg-white focus:ring-2 focus:ring-brand-accent/20 p-3 sm:p-3.5 text-sm sm:text-base outline-none rounded-xl transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="chk-custphone" className="block text-xs font-bold text-brand-accent uppercase tracking-wider">
                  TELEPHONE NUMBER
                </label>
                <input
                  id="chk-custphone"
                  type="tel"
                  required
                  placeholder="e.g. 087 123 4567"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full bg-brand-dark/[0.03] focus:bg-white focus:ring-2 focus:ring-brand-accent/20 p-3 sm:p-3.5 text-sm sm:text-base outline-none rounded-xl transition-all"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="chk-custemail" className="block text-xs font-bold text-brand-accent uppercase tracking-wider">
                EMAIL ADDRESS
              </label>
              <input
                id="chk-custemail"
                type="email"
                required
                placeholder="e.g. liam@example.ie"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full bg-brand-dark/[0.03] focus:bg-white focus:ring-2 focus:ring-brand-accent/20 p-3 sm:p-3.5 text-sm sm:text-base outline-none rounded-xl transition-all"
              />
            </div>

            {serviceType === 'delivery' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 animate-fade-in" id="delivery-address-area">
                <div className="space-y-1.5">
                  <label htmlFor="chk-custaddress" className="block text-xs font-bold text-brand-accent uppercase tracking-wider">
                    STREET ADDRESS (LIMERICK CITY ONLY)
                  </label>
                  <textarea
                    id="chk-custaddress"
                    rows={2}
                    required
                    placeholder="Street Address, Apartment or Suite number"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full bg-brand-dark/[0.03] focus:bg-white focus:ring-2 focus:ring-brand-accent/20 p-3 sm:p-3.5 text-sm sm:text-base outline-none rounded-xl resize-none transition-all"
                  ></textarea>
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="chk-custeircode" className="block text-xs font-bold text-brand-accent uppercase tracking-wider">
                    EIR CODE
                  </label>
                  <input
                    id="chk-custeircode"
                    type="text"
                    required
                    placeholder="e.g. V14 AW71"
                    value={eirCode}
                    onChange={(e) => setEirCode(e.target.value)}
                    className="w-full bg-brand-dark/[0.03] focus:bg-white focus:ring-2 focus:ring-brand-accent/20 p-3 sm:p-3.5 text-sm sm:text-base outline-none uppercase rounded-xl transition-all"
                  />
                </div>
              </div>
            )}

            {serviceType === 'delivery' ? (
              !deliveryStatusToday.isDeliveryDay ? (
                <div className="p-4 bg-amber-500/10 rounded-2xl text-xs sm:text-sm text-amber-900 space-y-1">
                  <div className="font-bold uppercase tracking-wider flex items-center gap-1.5 text-amber-900">
                    <Clock className="w-3.5 h-3.5 text-amber-700" />
                    <span>Home Delivery Unavailable Today</span>
                  </div>
                  <p className="text-xs sm:text-sm text-amber-800 leading-relaxed font-medium">
                    Home delivery runs on <strong>{deliveryStatusToday.activeDaysLabel}</strong> ({deliveryStatusToday.startTimeLabel || '4:30 PM'} – {deliveryStatusToday.endTimeLabel || '9:00 PM'}). Please switch to <strong>Collection</strong> for your order today!
                  </p>
                </div>
              ) : deliveryStatusToday.isAfterClose ? (
                <div className="p-3.5 bg-rose-50 rounded-2xl text-xs sm:text-sm font-semibold text-rose-800 text-center">
                  Delivery has ended for tonight (closed at {deliveryStatusToday.endTimeLabel}). Please select Collection or order on our next delivery day.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label htmlFor="chk-custtime" className="block text-xs font-bold text-brand-accent uppercase tracking-wider">
                      PREFERRED DELIVERY TIME
                    </label>
                    <span className="text-xs text-brand-muted">
                      Delivery hours: {deliveryStatusToday.startTimeLabel} – {deliveryStatusToday.endTimeLabel}
                    </span>
                  </div>

                  {deliveryStatusToday.isBeforeOpen && (
                    <div className="p-3 bg-amber-500/10 rounded-xl text-xs sm:text-sm text-amber-900 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span>Delivery starts at <strong>{deliveryStatusToday.startTimeLabel}</strong> today. Select your delivery time below:</span>
                    </div>
                  )}

                  <select
                    id="chk-custtime"
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    className="w-full bg-brand-dark/[0.03] focus:bg-white focus:ring-2 focus:ring-brand-accent/20 p-3 sm:p-3.5 text-sm sm:text-base outline-none rounded-xl min-h-[48px] transition-all"
                  >
                    {deliveryTimeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value} disabled={!opt.isAvailable}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )
            ) : (
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label htmlFor="chk-custtime" className="block text-xs font-bold text-brand-accent uppercase tracking-wider">
                    PREFERRED COLLECTION TIME
                  </label>
                  <span className="text-xs text-brand-muted">
                    Kitchen hours: {storeStatus.todayTiming}
                  </span>
                </div>

                {storeStatus.isBeforeOpen && (
                  <div className="p-3 bg-amber-500/10 rounded-xl text-xs sm:text-sm text-amber-900 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>Kitchen opens at <strong>{storeStatus.opensAtLabel}</strong> today. Select your collection time below:</span>
                  </div>
                )}

                {storeStatus.isAfterClose ? (
                  <div className="p-3.5 bg-rose-50 rounded-2xl text-xs sm:text-sm font-semibold text-rose-800 text-center">
                    Kitchen is closed for collection today (closed at {storeStatus.closesAtLabel}).
                  </div>
                ) : (
                  <select
                    id="chk-custtime"
                    value={preferredTime}
                    onChange={(e) => setPreferredTime(e.target.value)}
                    className="w-full bg-brand-dark/[0.03] focus:bg-white focus:ring-2 focus:ring-brand-accent/20 p-3 sm:p-3.5 text-sm sm:text-base outline-none rounded-xl min-h-[48px] transition-all"
                  >
                    {takeawayTimeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value} disabled={!opt.isAvailable}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="chk-custnotes" className="block text-xs font-bold text-brand-accent uppercase tracking-wider">
                SPECIAL INSTRUCTIONS (E.G. ALLERGIES, CHILI LEVEL)
              </label>
              <textarea
                id="chk-custnotes"
                rows={2}
                placeholder="Spiciness requests, gate codes, etc."
                value={checkoutNotes}
                onChange={(e) => setCheckoutNotes(e.target.value)}
                className="w-full bg-brand-dark/[0.03] focus:bg-white focus:ring-2 focus:ring-brand-accent/20 p-3 sm:p-3.5 text-sm sm:text-base outline-none rounded-xl resize-none transition-all"
              ></textarea>
            </div>

            <button
              type="submit"
              id="confirm-checkout-btn"
              className="w-full bg-brand-accent text-white hover:bg-brand-dark py-4 text-xs sm:text-sm uppercase tracking-widest font-bold transition-all rounded-full min-h-[50px] shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center space-x-2"
            >
              <span>CONFIRM ORDER &amp; COMMENCE PREPARATION</span>
            </button>
          </form>

          {/* Cart Summary Side (Desktop) */}
          <div className="hidden lg:block lg:col-span-5 bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-6 sm:p-8 space-y-6">
            <h3 className="text-base sm:text-lg font-bold text-brand-dark">Order Breakdown</h3>
            
            <div className="divide-y divide-brand-dark/5 space-y-3">
              {cart.map((item) => {
                const itemPrice = item.selectedSize ? item.selectedSize.price : item.menuItem.price;
                return (
                  <div key={item.id} className="pt-3 flex justify-between gap-4 text-sm">
                    <div>
                      <span className="font-bold text-brand-dark">
                        {item.quantity}x {item.menuItem.name}
                      </span>
                      {item.selectedSize && (
                        <span className="block text-xs text-brand-muted italic mt-0.5">
                          Size: {item.selectedSize.name}
                        </span>
                      )}
                      {item.notes && (
                        <span className="block text-xs text-brand-accent italic truncate max-w-[200px] mt-0.5">
                          &ldquo;{item.notes}&rdquo;
                        </span>
                      )}
                    </div>
                    <span className="text-brand-dark font-bold">&euro;{(itemPrice * item.quantity).toFixed(2)}</span>
                  </div>
                );
              })}
            </div>

            {/* Calculations block */}
            <div className="border-t border-brand-dark/5 pt-4 space-y-2 text-xs sm:text-sm text-brand-muted">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-brand-dark font-semibold">&euro;{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="flex items-center">
                  Packaging Fee <span className="ml-1 text-[11px] bg-brand-dark/5 px-1.5 py-0.5 rounded-md font-sans">Statutory</span>
                </span>
                <span className="text-brand-dark font-semibold">&euro;{packagingFee.toFixed(2)}</span>
              </div>
              {serviceType === 'delivery' && (
                <div className="flex justify-between">
                  <span>Local Delivery Charge</span>
                  <span className="text-brand-dark font-semibold">&euro;{deliveryCharges.toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-dashed border-brand-dark/10 pt-3 font-bold text-base flex justify-between text-brand-dark">
                <span>GRAND TOTAL</span>
                <span>&euro;{total.toFixed(2)}</span>
              </div>
            </div>
          </div>

        </div>

      ) : (

        /* MENU SELECTION & ACTIVE CART SPLIT SCREEN */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* Categories Sidebar navigation - Desktop & Mobile with horizontal scroll arrows */}
          <div className="lg:col-span-3 space-y-2">
            <span className="block font-sans text-xs text-brand-accent tracking-wider font-extrabold uppercase mb-2 sm:mb-4 pl-1 lg:pl-0">
              Menu Sections
            </span>
            <div className="relative flex items-center lg:block">
              {/* Left Gradient Fade Mask - Mobile only */}
              {showLeftArrow && (
                <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-10 bg-gradient-to-r from-brand-beige to-transparent z-10 lg:hidden animate-fade-in" />
              )}
              
              {/* Left Arrow Button */}
              {showLeftArrow && (
                <button
                  type="button"
                  onClick={() => scrollCategories('left')}
                  className="absolute left-0 z-20 bg-brand-dark/90 text-white hover:bg-brand-dark w-8 h-8 rounded-full flex items-center justify-center lg:hidden shadow-md active:scale-90 transition-all"
                  aria-label="Scroll categories left"
                >
                  <ChevronLeft className="w-4 h-4 stroke-[2.5]" />
                </button>
              )}

              {/* Scrollable Container */}
              <div 
                ref={categoriesRef}
                onScroll={updateArrows}
                className="flex lg:flex-col overflow-x-auto lg:overflow-visible gap-2 pb-2 lg:pb-0 scrollbar-none w-full scroll-smooth px-1 lg:px-0 py-1"
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
                      className={`text-left px-4 py-2.5 lg:px-5 lg:py-3 text-xs font-sans tracking-wider uppercase transition-all duration-200 lg:w-full whitespace-nowrap lg:whitespace-normal font-bold group relative flex items-center justify-between shrink-0 rounded-full active:scale-95 ${
                        isActive
                          ? 'bg-brand-dark text-white shadow-md'
                          : 'bg-white text-brand-muted hover:text-brand-dark hover:bg-brand-dark/5 shadow-xs'
                      }`}
                    >
                      <span>{cat}</span>
                      {isActive && (
                        <span className="w-2 h-2 rounded-full bg-brand-accent shrink-0 ml-2 hidden lg:inline-block animate-pulse"></span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Right Gradient Fade Mask - Mobile only */}
              {showRightArrow && (
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-brand-beige to-transparent z-10 lg:hidden animate-fade-in" />
              )}

              {/* Right Arrow Button */}
              {showRightArrow && (
                <button
                  type="button"
                  onClick={() => scrollCategories('right')}
                  className="absolute right-0 z-20 bg-brand-dark/90 text-white hover:bg-brand-dark w-8 h-8 rounded-full flex items-center justify-center lg:hidden shadow-md active:scale-90 transition-all"
                  aria-label="Scroll categories right"
                >
                  <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              )}
            </div>
          </div>

          {/* Menu Items Grid Column */}
          <div className="lg:col-span-5 space-y-4 sm:space-y-5">
            <div className="pb-1.5 flex justify-between items-baseline">
              <h2 className="text-lg sm:text-xl font-bold tracking-tight text-brand-dark">
                {selectedCategory}
              </h2>
              <span className="text-xs text-brand-muted font-medium">
                {filteredItems.length} items
              </span>
            </div>

            <div className="space-y-3.5 sm:space-y-4 animate-slide-up" key={selectedCategory} id="order-items-scrollable">
              {filteredItems.map((item) => {
                const activeSize = selectedSizes[item.id];
                const activePrice = activeSize ? activeSize.price : item.price;
                const notes = customNotes[item.id] || '';

                return (
                  <div 
                    key={item.id} 
                    className="p-4 sm:p-6 bg-white hover:bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] transition-all duration-200 flex flex-col justify-between space-y-3.5 sm:space-y-4"
                  >
                    <div className="space-y-1.5 sm:space-y-2">
                      <div className="flex justify-between items-start gap-3">
                        <h3 className="text-base sm:text-lg font-bold text-brand-dark flex items-center gap-1.5 leading-snug">
                          {item.name}
                          {item.isVeg && (
                            <span className="w-2 h-2 bg-emerald-500 inline-block rounded-full ring-2 ring-emerald-100" title="Veg Available"></span>
                          )}
                        </h3>
                        <span className="text-sm sm:text-base font-extrabold text-brand-dark shrink-0">
                          &euro;{activePrice.toFixed(2)}
                        </span>
                      </div>

                      {item.description && (
                        <p className="text-xs sm:text-sm text-brand-muted leading-relaxed font-normal">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Options area: size selector if any */}
                    {item.sizeOptions && item.sizeOptions.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="block text-xs text-brand-accent tracking-wider font-bold uppercase">
                          CHOOSE SIZE:
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {item.sizeOptions.map((opt) => (
                            <button
                              type="button"
                              id={`size-opt-${item.id}-${opt.name.replace(/\s+/g, '-').toLowerCase()}`}
                              key={opt.name}
                              onClick={() => handleSizeChange(item.id, opt.name)}
                              className={`py-2 px-3 text-xs sm:text-sm font-semibold transition-all truncate text-center min-h-[40px] rounded-full active:scale-95 ${
                                activeSize?.name === opt.name
                                  ? 'bg-brand-dark text-white shadow-xs'
                                  : 'bg-brand-dark/[0.04] text-brand-dark hover:bg-brand-dark/[0.08]'
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
                      <label htmlFor={`custom-notes-${item.id}`} className="block text-xs text-brand-accent tracking-wider font-bold uppercase">
                        ADD SPECIAL NOTES FOR CHEF (OPTIONAL)
                      </label>
                      <input
                        id={`custom-notes-${item.id}`}
                        type="text"
                        placeholder="e.g., extra hot, garlic sauce on top..."
                        value={notes}
                        onChange={(e) => setCustomNotes((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        className="w-full text-sm sm:text-base px-3.5 py-2.5 bg-brand-dark/[0.03] focus:bg-white focus:ring-2 focus:ring-brand-accent/20 outline-none placeholder:text-brand-muted/50 rounded-xl transition-all"
                      />
                    </div>

                    {/* Core action button */}
                    <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span 
                        id={`added-notif-${item.id}`}
                        className="text-xs font-bold text-emerald-600 opacity-0 transition-opacity duration-300 flex items-center"
                      >
                        ✓ ADDED TO BASKET
                      </span>

                      <button
                        type="button"
                        id={`add-to-cart-btn-${item.id}`}
                        onClick={() => handleAddWithDetails(item)}
                        className="w-full sm:w-auto bg-brand-dark text-white hover:bg-brand-accent px-6 py-3 sm:py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider transition-all rounded-full shadow-sm hover:shadow-md active:scale-[0.98] flex items-center justify-center space-x-2 min-h-[44px]"
                      >
                        <span>ADD TO CART</span>
                        <span>&bull;</span>
                        <span>&euro;{activePrice.toFixed(2)}</span>
                      </button>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Checkout Basket Column (Desktop) */}
          <div className="lg:col-span-4 bg-white rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] p-6 space-y-5 lg:sticky lg:top-24">
            <div className="flex items-center justify-between border-b border-brand-dark/5 pb-3.5">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-accent/10 text-brand-accent flex items-center justify-center">
                  <CookingPot className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-brand-dark">
                  Shopping Basket
                </h3>
              </div>
              
              <div className="flex items-center space-x-2">
                <span className="text-xs bg-brand-dark text-white px-2.5 py-1 rounded-full font-bold">
                  {cart.reduce((acc, curr) => acc + curr.quantity, 0)}
                </span>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    className="text-xs text-brand-muted hover:text-red-600 font-medium px-2.5 py-1 rounded-full hover:bg-red-50 transition-colors"
                    title="Clear entire basket"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-12 px-4 space-y-3" id="empty-basket-message">
                <div className="w-14 h-14 rounded-2xl bg-brand-dark/[0.03] text-brand-muted flex items-center justify-center mx-auto">
                  <CookingPot className="w-7 h-7 stroke-[1.5]" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-brand-dark">Your basket is empty</p>
                  <p className="text-xs text-brand-muted leading-relaxed max-w-[200px] mx-auto">
                    Select dishes on the left to start building your feast.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                
                {/* Active items scroll box with modern cardlets */}
                <div className="max-h-[340px] overflow-y-auto space-y-2.5 pr-1 scrollbar-thin" id="cart-items-scroller">
                  {cart.map((cartItem) => {
                    const price = cartItem.selectedSize ? cartItem.selectedSize.price : cartItem.menuItem.price;
                    return (
                      <div 
                        key={cartItem.id} 
                        className="bg-brand-dark/[0.02] hover:bg-brand-dark/[0.04] p-3.5 rounded-2xl space-y-2.5 transition-all"
                      >
                        <div className="flex justify-between items-start gap-3">
                          <div className="space-y-1 flex-1 min-w-0">
                            <span className="text-sm font-bold text-brand-dark block truncate">
                              {cartItem.menuItem.name}
                            </span>
                            
                            <div className="flex flex-wrap gap-1 items-center">
                              {cartItem.selectedSize && (
                                <span className="text-[11px] font-semibold bg-brand-dark/5 text-brand-dark px-2 py-0.5 rounded-md">
                                  {cartItem.selectedSize.name}
                                </span>
                              )}
                              {cartItem.notes && (
                                <span className="text-xs text-brand-accent italic truncate max-w-[160px] block">
                                  &ldquo;{cartItem.notes}&rdquo;
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <span className="text-sm font-extrabold text-brand-dark shrink-0">
                            &euro;{(price * cartItem.quantity).toFixed(2)}
                          </span>
                        </div>

                        {/* Adjust qty panel with capsule stepper */}
                        <div className="flex items-center justify-between pt-1 border-t border-brand-dark/5">
                          <button
                            type="button"
                            id={`remove-cart-item-btn-${cartItem.id}`}
                            onClick={() => removeFromCart(cartItem.id)}
                            className="text-xs text-brand-muted hover:text-red-600 font-medium flex items-center space-x-1 px-2 py-1 rounded-full hover:bg-red-50 transition-all"
                            aria-label={`Remove ${cartItem.menuItem.name} from cart`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>

                          <div className="flex items-center space-x-1.5 bg-brand-dark/[0.06] p-1 rounded-full">
                            <button
                              type="button"
                              id={`decrease-qty-btn-${cartItem.id}`}
                              onClick={() => updateQuantity(cartItem.id, -1)}
                              className="w-6 h-6 rounded-full flex items-center justify-center text-brand-dark hover:bg-white active:scale-90 transition-all"
                              disabled={cartItem.quantity <= 1}
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-xs font-bold text-brand-dark px-1.5 min-w-[20px] text-center">
                              {cartItem.quantity}
                            </span>
                            <button
                              type="button"
                              id={`increase-qty-btn-${cartItem.id}`}
                              onClick={() => updateQuantity(cartItem.id, 1)}
                              className="w-6 h-6 rounded-full flex items-center justify-center text-brand-dark hover:bg-white active:scale-90 transition-all"
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
                <div className="bg-brand-dark/[0.02] p-4 rounded-2xl space-y-2 text-xs text-brand-muted">
                  <div className="flex justify-between">
                    <span className="font-medium">Menu Subtotal</span>
                    <span className="text-brand-dark font-bold">&euro;{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="flex items-center font-medium">
                      Packaging Fee <span className="ml-1 text-[10px] bg-brand-dark/5 px-1.5 py-0.2 rounded font-sans">Statutory</span>
                    </span>
                    <span className="text-brand-dark font-bold">&euro;{packagingFee.toFixed(2)}</span>
                  </div>
                  <div className="border-t border-brand-dark/5 pt-2.5 flex justify-between items-baseline text-brand-dark">
                    <span className="font-bold text-sm">Total</span>
                    <span className="font-extrabold text-base">&euro;{total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Apple Pay / Samsung style checkout pill button */}
                <button
                  type="button"
                  id="start-checkout-btn"
                  onClick={() => {
                    if (!takeawayEnabled) {
                      setShowTakeawayWarningModal(true);
                    } else {
                      setIsCheckoutMode(true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className={`w-full py-4 px-6 font-bold text-xs sm:text-sm uppercase tracking-wider text-center transition-all rounded-full flex items-center justify-between shadow-md hover:shadow-lg active:scale-[0.98] ${
                    !takeawayEnabled
                      ? 'bg-red-700 hover:bg-red-800 text-white'
                      : 'bg-brand-accent text-white hover:bg-brand-dark'
                  }`}
                >
                  <span>{!takeawayEnabled ? 'ONLINE ORDER CLOSED' : 'PROCEED TO DETAILS'}</span>
                  <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-extrabold flex items-center gap-1.5">
                    <span>&euro;{total.toFixed(2)}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </button>

              </div>
            )}

          </div>

        </div>
      )}

      {/* Custom Warning Modal Dialog */}
      {showWarningModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
          <div className="relative my-auto w-full max-w-md bg-white rounded-3xl p-6 sm:p-8 space-y-4 shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto">
            
            {/* Close Button X */}
            <button
              type="button"
              onClick={() => setShowWarningModal(false)}
              className="absolute top-4 right-4 p-2 text-brand-muted hover:text-brand-dark rounded-full hover:bg-brand-dark/5 transition-all"
              aria-label="Close warning"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Warning Content */}
            <div className="text-center space-y-2.5 pt-1">
              <div className="w-12 h-12 bg-brand-accent/10 text-brand-accent flex items-center justify-center rounded-2xl mx-auto">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-brand-dark">
                Online Ordering Notice
              </h3>
              <p className="text-xs sm:text-sm text-brand-muted leading-relaxed font-normal text-center">
                {noticeText}
              </p>
              <p className="text-xl sm:text-2xl font-extrabold text-brand-dark tracking-tight">
                {noticePhone}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <a
                href={`tel:${noticePhone.replace(/\s+/g, '')}`}
                className="flex-1 bg-brand-accent hover:bg-brand-dark text-white py-3 text-xs sm:text-sm font-bold uppercase tracking-wider text-center rounded-full shadow-sm active:scale-95 transition-all flex items-center justify-center space-x-2"
              >
                <Phone className="w-4 h-4" />
                <span>Call Now</span>
              </a>
              <button
                type="button"
                onClick={() => setShowWarningModal(false)}
                className="flex-1 bg-brand-dark/5 hover:bg-brand-dark/10 text-brand-dark py-3 text-xs sm:text-sm font-bold uppercase tracking-wider text-center rounded-full transition-all"
              >
                Dismiss
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Custom Takeaway Closed Warning Modal Dialog */}
      {showTakeawayWarningModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto" id="takeaway-disabled-modal">
          <div className="relative my-auto w-full max-w-sm sm:max-w-md bg-white rounded-3xl p-5 sm:p-6 space-y-4 shadow-2xl animate-scale-up max-h-[90vh] overflow-y-auto">
            
            {/* Close Button X */}
            <button
              type="button"
              onClick={() => setShowTakeawayWarningModal(false)}
              className="absolute top-3 right-3 p-2 text-brand-muted hover:text-brand-dark rounded-full hover:bg-brand-dark/5 transition-all"
              aria-label="Close warning"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Warning Content */}
            <div className="text-center space-y-2.5 pt-1">
              <div className="w-10 h-10 bg-red-100 text-red-700 flex items-center justify-center rounded-2xl mx-auto">
                <ShoppingBag className="w-5 h-5 animate-pulse" />
              </div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight text-brand-dark">
                Online Ordering Paused
              </h3>
              <p className="text-xs sm:text-sm text-brand-muted leading-relaxed font-normal text-center">
                {takeawayNotice}
              </p>
              <p className="text-xs text-brand-accent font-bold uppercase tracking-wider">
                We are actively taking orders by phone! Please dial:
              </p>
              <p className="text-xl sm:text-2xl font-extrabold text-brand-dark tracking-tight">
                {noticePhone}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <a
                href={`tel:${noticePhone.replace(/\s+/g, '')}`}
                className="flex-1 bg-brand-accent hover:bg-brand-dark text-white py-3 text-xs sm:text-sm font-bold uppercase tracking-wider text-center rounded-full shadow-sm active:scale-95 transition-all flex items-center justify-center space-x-2"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Us Now</span>
              </a>
              <button
                type="button"
                onClick={() => setShowTakeawayWarningModal(false)}
                className="flex-1 bg-brand-dark/5 hover:bg-brand-dark/10 text-brand-dark py-3 text-xs sm:text-sm font-bold uppercase tracking-wider text-center rounded-full transition-all"
              >
                Browse Menu
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

      {/* Pakistani Cuisine Included Side Selection Popup */}
      {pakistaniSideModalItem && createPortal(
        <div 
          className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in overflow-y-auto"
          onClick={() => setPakistaniSideModalItem(null)}
        >
          <div 
            className="relative my-auto bg-white max-w-md w-full p-5 sm:p-6 shadow-2xl rounded-3xl text-left space-y-4 animate-scale-up max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-brand-dark/5 pb-3">
              <div>
                <span className="text-xs text-brand-accent uppercase font-bold tracking-wider block">
                  ★ INCLUDED SIDE SELECTION
                </span>
                <h3 className="text-base sm:text-lg font-bold text-brand-dark mt-0.5">
                  {pakistaniSideModalItem.name}
                </h3>
                <p className="text-xs text-brand-muted mt-0.5 font-medium">
                  &euro;{pakistaniSideModalItem.price.toFixed(2)} &bull; Served with your choice of side
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPakistaniSideModalItem(null)}
                className="text-brand-muted hover:text-brand-dark p-2 rounded-full hover:bg-brand-dark/5 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs text-brand-dark tracking-wider font-bold uppercase">
                Choose 1 Included Side <span className="text-red-500">*</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Naan Bread Option */}
                <button
                  type="button"
                  onClick={() => setSelectedSideChoice('Naan Bread')}
                  className={`flex flex-col text-left p-3.5 rounded-2xl transition-all cursor-pointer active:scale-95 ${
                    selectedSideChoice === 'Naan Bread'
                      ? 'bg-brand-dark text-white shadow-md'
                      : 'bg-brand-dark/[0.04] text-brand-dark hover:bg-brand-dark/[0.08]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-bold text-sm">Naan Bread</span>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                      selectedSideChoice === 'Naan Bread' ? 'bg-white text-brand-dark font-bold' : 'bg-brand-dark/10 text-transparent'
                    }`}>
                      ✓
                    </span>
                  </div>
                  <span className={`text-xs ${selectedSideChoice === 'Naan Bread' ? 'text-white/80' : 'text-brand-muted'}`}>
                    Fresh clay oven baked naan
                  </span>
                </button>

                {/* White Rice Option */}
                <button
                  type="button"
                  onClick={() => setSelectedSideChoice('White Rice')}
                  className={`flex flex-col text-left p-3.5 rounded-2xl transition-all cursor-pointer active:scale-95 ${
                    selectedSideChoice === 'White Rice'
                      ? 'bg-brand-dark text-white shadow-md'
                      : 'bg-brand-dark/[0.04] text-brand-dark hover:bg-brand-dark/[0.08]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="font-bold text-sm">White Rice</span>
                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                      selectedSideChoice === 'White Rice' ? 'bg-white text-brand-dark font-bold' : 'bg-brand-dark/10 text-transparent'
                    }`}>
                      ✓
                    </span>
                  </div>
                  <span className={`text-xs ${selectedSideChoice === 'White Rice' ? 'text-white/80' : 'text-brand-muted'}`}>
                    Fragrant steamed basmati rice
                  </span>
                </button>
              </div>
            </div>

            {/* Special Instructions for Chef */}
            <div className="space-y-1.5 pt-1">
              <label htmlFor="pakistani-modal-notes" className="block text-xs text-brand-accent tracking-wider font-bold uppercase">
                Special Instructions for Chef (Optional)
              </label>
              <input
                id="pakistani-modal-notes"
                type="text"
                placeholder="e.g., extra spicy, mild, sauce on side..."
                value={modalChefNotes}
                onChange={(e) => setModalChefNotes(e.target.value)}
                className="w-full text-sm sm:text-base px-3.5 py-2.5 bg-brand-dark/[0.03] focus:bg-white focus:ring-2 focus:ring-brand-accent/20 outline-none rounded-xl placeholder:text-brand-muted/50 transition-all"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setPakistaniSideModalItem(null)}
                className="flex-1 py-3 px-4 text-xs sm:text-sm font-bold uppercase tracking-wider bg-brand-dark/5 hover:bg-brand-dark/10 text-brand-dark rounded-full transition-colors min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmPakistaniSide}
                className="flex-2 py-3 px-4 text-xs sm:text-sm font-bold uppercase tracking-wider bg-brand-dark text-white hover:bg-brand-accent rounded-full shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <span>Add to Cart</span>
                <span>&bull;</span>
                <span>&euro;{pakistaniSideModalItem.price.toFixed(2)}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Free Cold Drink Selection Modal Dialog for Burgers, Wraps & Sandwiches */}
      {drinkModalItem && createPortal(
        <div 
          className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in overflow-y-auto"
          onClick={() => setDrinkModalItem(null)}
        >
          <div 
            className="relative my-auto bg-white max-w-lg w-full p-5 sm:p-6 shadow-2xl rounded-3xl text-left space-y-4 animate-scale-up max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-brand-dark/5 pb-3">
              <div>
                <span className="text-xs text-emerald-700 uppercase font-bold tracking-wider block">
                  ★ INCLUDED FREE COLD DRINK
                </span>
                <h3 className="text-base sm:text-lg font-bold text-brand-dark mt-0.5">
                  {drinkModalItem.name}
                </h3>
                <p className="text-xs text-brand-muted mt-0.5 font-medium">
                  &euro;{drinkModalItem.price.toFixed(2)} &bull; Includes 1 complimentary cold beverage
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrinkModalItem(null)}
                className="text-brand-muted hover:text-brand-dark p-2 rounded-full hover:bg-brand-dark/5 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs text-brand-dark tracking-wider font-bold uppercase">
                Select Your Free Cold Drink <span className="text-red-500">*</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  { name: 'Cola', desc: 'Classic cold soft drink' },
                  { name: 'Lemon & Lime', desc: 'Crisp citrus soft drink' },
                  { name: 'Orange Soft Drink', desc: 'Refreshing orange soft drink' }
                ].map((drink) => {
                  const isSelected = selectedDrinkChoice === drink.name;
                  return (
                    <button
                      key={drink.name}
                      type="button"
                      onClick={() => setSelectedDrinkChoice(drink.name)}
                      className={`flex flex-col text-left p-3.5 rounded-2xl transition-all cursor-pointer active:scale-95 ${
                        isSelected
                          ? 'bg-brand-dark text-white shadow-md'
                          : 'bg-brand-dark/[0.04] text-brand-dark hover:bg-brand-dark/[0.08]'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1">
                        <span className="font-bold text-xs sm:text-sm">{drink.name}</span>
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                          isSelected ? 'bg-white text-brand-dark font-bold' : 'bg-brand-dark/10 text-transparent'
                        }`}>
                          ✓
                        </span>
                      </div>
                      <span className={`text-xs leading-tight ${isSelected ? 'text-white/80' : 'text-brand-muted'}`}>
                        {drink.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Special Instructions for Chef */}
            <div className="space-y-1.5 pt-1">
              <label htmlFor="drink-modal-notes" className="block text-xs text-brand-accent tracking-wider font-bold uppercase">
                Special Instructions for Chef (Optional)
              </label>
              <input
                id="drink-modal-notes"
                type="text"
                placeholder="e.g., extra sauce, no onions, no ice..."
                value={drinkModalNotes}
                onChange={(e) => setDrinkModalNotes(e.target.value)}
                className="w-full text-sm sm:text-base px-3.5 py-2.5 bg-brand-dark/[0.03] focus:bg-white focus:ring-2 focus:ring-brand-accent/20 outline-none rounded-xl placeholder:text-brand-muted/50 transition-all"
              />
            </div>

            {/* Modal Actions */}
            <div className="pt-2 flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setDrinkModalItem(null)}
                className="flex-1 py-3 px-4 text-xs sm:text-sm font-bold uppercase tracking-wider bg-brand-dark/5 hover:bg-brand-dark/10 text-brand-dark rounded-full transition-colors min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDrinkChoice}
                className="flex-2 py-3 px-4 text-xs sm:text-sm font-bold uppercase tracking-wider bg-brand-dark text-white hover:bg-brand-accent rounded-full shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <span>Add to Cart</span>
                <span>&bull;</span>
                <span>&euro;{drinkModalItem.price.toFixed(2)}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Floating Apple/Samsung Mobile Dock Cart */}
      {cart.length > 0 && !isCheckoutMode && (
        <div className="lg:hidden fixed bottom-4 left-3.5 right-3.5 z-40 bg-brand-dark/95 backdrop-blur-md text-white px-4 py-3 rounded-full shadow-[0_10px_35px_rgba(0,0,0,0.3)] animate-slide-up flex items-center justify-between gap-3">
          <div className="flex items-center space-x-3 pl-1">
            <div className="relative">
              <div className="w-10 h-10 bg-brand-accent text-white flex items-center justify-center rounded-full font-bold shadow-xs">
                <CookingPot className="w-5 h-5" />
              </div>
              <span className="absolute -top-1.5 -right-1.5 bg-white text-brand-dark text-[10px] font-extrabold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                {cart.reduce((acc, curr) => acc + curr.quantity, 0)}
              </span>
            </div>
            <div>
              <span className="text-[10px] text-brand-beige/70 uppercase block tracking-wider font-semibold">Estimated Total</span>
              <span className="text-base font-extrabold text-white tracking-tight">&euro;{total.toFixed(2)}</span>
            </div>
          </div>

          <button
            type="button"
            id="mobile-sticky-checkout-btn"
            onClick={() => {
              if (!takeawayEnabled) {
                setShowTakeawayWarningModal(true);
              } else {
                setIsCheckoutMode(true);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
            className="bg-brand-accent hover:bg-white hover:text-brand-dark text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded-full shadow-sm active:scale-95 transition-all flex items-center space-x-1.5 shrink-0 min-h-[44px]"
          >
            <span>Checkout</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

    </div>
  );
};
