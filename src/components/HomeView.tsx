/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ChefHat, ShoppingBag, Calendar, Phone, Clock, MapPin, ArrowRight, ShieldCheck, Heart, Sparkles, X, Check, CheckCircle, Utensils, User, Mail } from 'lucide-react';
import { MENU_ITEMS } from '../data/menu';

interface HomeViewProps {
  setCurrentTab: (tab: string) => void;
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

// Helper function to optimize Unsplash image query parameters for improved mobile page speed
const optimizeUnsplashUrl = (url: string, width: number, quality: number = 70): string => {
  if (!url || !url.includes('images.unsplash.com')) return url;
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.set('w', width.toString());
    urlObj.searchParams.set('q', quality.toString());
    urlObj.searchParams.set('fm', 'webp');
    urlObj.searchParams.set('auto', 'format');
    urlObj.searchParams.set('fit', 'crop');
    return urlObj.toString();
  } catch (e) {
    return url;
  }
};


export const HomeView: React.FC<HomeViewProps> = ({ setCurrentTab, businessInfo: parentBusinessInfo, storeSettings }) => {
  // Operational timings states
  const [weeklyTimings, setWeeklyTimings] = React.useState({
    monday: localStorage.getItem('clay_oven_timing_monday') || '4:00 PM - 9:00 PM',
    tuesday: localStorage.getItem('clay_oven_timing_tuesday') || '4:00 PM - 9:00 PM',
    wednesday: localStorage.getItem('clay_oven_timing_wednesday') || '4:00 PM - 9:00 PM',
    thursday: localStorage.getItem('clay_oven_timing_thursday') || '4:00 PM - 9:00 PM',
    friday: localStorage.getItem('clay_oven_timing_friday') || '4:00 PM - 9:00 PM',
    saturday: localStorage.getItem('clay_oven_timing_saturday') || '12:00 PM - 9:00 PM',
    sunday: localStorage.getItem('clay_oven_timing_sunday') || '10:00 AM - 6:00 PM',
    offset: localStorage.getItem('clay_oven_timing_offset') || 'KITCHEN CLOSES 15 MINS PRIOR'
  });

  const [noticeText, setNoticeText] = React.useState(localStorage.getItem('clay_oven_notice_text') || 'We are Still Working on Website, for online order please contact.');
  const [noticePhone, setNoticePhone] = React.useState(localStorage.getItem('clay_oven_notice_phone') || '089 489 9950');
  const [noticeEnabled, setNoticeEnabled] = React.useState(localStorage.getItem('clay_oven_notice_enabled') === 'true');

  const [businessInfo, setBusinessInfo] = React.useState(parentBusinessInfo);

  React.useEffect(() => {
    setBusinessInfo(parentBusinessInfo);
  }, [parentBusinessInfo]);

  const [showWarningModal, setShowWarningModal] = React.useState(false);

  // Dynamic Festive / Special Offer State
  const getValidImageUrl = (raw: string | null, fallback: string = ''): string => {
    if (!raw) return fallback;
    if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/')) return raw;
    if (raw.startsWith('data:image/') && raw.includes(';base64,') && raw.length > 100) return raw;
    return fallback;
  };

  const [festiveEnabled, setFestiveEnabled] = React.useState(localStorage.getItem('clay_oven_festive_enabled') !== 'false');
  const [festiveDisplayMode, setFestiveDisplayMode] = React.useState<'banner' | 'text' | 'card_with_image'>(() => (localStorage.getItem('clay_oven_festive_display_mode') as any) || 'card_with_image');
  const [imageFestiveBanner, setImageFestiveBanner] = React.useState(() => getValidImageUrl(localStorage.getItem('clay_oven_image_festive_banner'), '/christmas-platter.webp'));
  const [festiveTargetDishId, setFestiveTargetDishId] = React.useState(localStorage.getItem('clay_oven_festive_target_dish_id') || 'pk-christmas-platter');
  const [festiveBannerCtaEnabled, setFestiveBannerCtaEnabled] = React.useState(localStorage.getItem('clay_oven_festive_banner_cta_enabled') !== 'false');
  const [festiveBannerCtaText, setFestiveBannerCtaText] = React.useState(localStorage.getItem('clay_oven_festive_banner_cta_text') || 'Order Christmas Platter');
  const [festiveBannerAlt, setFestiveBannerAlt] = React.useState(localStorage.getItem('clay_oven_festive_banner_alt') || 'Christmas Platter for Two');
  const [festiveHeader, setFestiveHeader] = React.useState(localStorage.getItem('clay_oven_festive_header') || "CHRISTMAS PLATTER FOR TWO");
  const [festiveSubheader, setFestiveSubheader] = React.useState(localStorage.getItem('clay_oven_festive_subheader') || 'AVAILABLE FRIDAY 25 – SUNDAY 27');
  const [festiveDescription, setFestiveDescription] = React.useState(localStorage.getItem('clay_oven_festive_description') || `A festive feast made for sharing!

Friday & Saturday: 12pm – 9pm
Sunday: 1pm – 5pm`);
  const [festivePrice, setFestivePrice] = React.useState(localStorage.getItem('clay_oven_festive_price') || '60.00');
  const [festivePriceLabel, setFestivePriceLabel] = React.useState(localStorage.getItem('clay_oven_festive_price_label') || 'FOR TWO:');
  const [festiveItemsRaw, setFestiveItemsRaw] = React.useState(localStorage.getItem('clay_oven_festive_items') || `The Royal Kebab | Four different chicken marinades, grilled together on a skewer.
Chapli Kebab | Traditional spiced minced beef kebab, pan-fried to perfection.
Lamb Rogan Josh | Rich, aromatic lamb curry.
BBQ Lamb Chops | Tender lamb chops, marinated and grilled with smoky barbecue flavour.
Fragrant Pilau Rice | Basmati rice cooked with whole aromatic spices.
2 Fresh Naan | Hot baked in traditional clay oven.
Mango Chutney | Sweet & tangy mango relish.
Green Chutney | Fresh mint & coriander dip.
Mint Yoghurt | Cooling spiced raita dip.
Gajar Ka Halwa | Traditional sweet carrot dessert.`);

  // Self-hosted Gallery Image States
  const [imageHeroBg, setImageHeroBg] = React.useState(() => getValidImageUrl(localStorage.getItem('clay_oven_image_hero_bg'), '/hero-bg.webp'));
  const [imageHeritageLeft, setImageHeritageLeft] = React.useState(() => getValidImageUrl(localStorage.getItem('clay_oven_image_heritage_left'), 'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?auto=format&fit=crop&w=500&q=70&fm=webp'));
  const [imageHeritageRight, setImageHeritageRight] = React.useState(() => getValidImageUrl(localStorage.getItem('clay_oven_image_heritage_right'), 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?auto=format&fit=crop&w=500&q=70&fm=webp'));

  // Load settings from props
  React.useEffect(() => {
    if (!storeSettings || Object.keys(storeSettings).length === 0) return;
    const data = storeSettings;
    setWeeklyTimings({
      monday: data.clay_oven_timing_monday || weeklyTimings.monday,
      tuesday: data.clay_oven_timing_tuesday || weeklyTimings.tuesday,
      wednesday: data.clay_oven_timing_wednesday || weeklyTimings.wednesday,
      thursday: data.clay_oven_timing_thursday || weeklyTimings.thursday,
      friday: data.clay_oven_timing_friday || weeklyTimings.friday,
      saturday: data.clay_oven_timing_saturday || weeklyTimings.saturday,
      sunday: data.clay_oven_timing_sunday || weeklyTimings.sunday,
      offset: data.clay_oven_timing_offset || weeklyTimings.offset
    });

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
      setShowWarningModal(enabled);
      localStorage.setItem('clay_oven_notice_enabled', String(enabled));
    } else {
      setShowWarningModal(noticeEnabled);
    }

    if (data.clay_oven_festive_enabled !== undefined) setFestiveEnabled(data.clay_oven_festive_enabled !== 'false');
    if (data.clay_oven_festive_display_mode) {
      setFestiveDisplayMode(data.clay_oven_festive_display_mode as 'banner' | 'text');
      localStorage.setItem('clay_oven_festive_display_mode', data.clay_oven_festive_display_mode);
    }
    if (data.clay_oven_festive_target_dish_id !== undefined) {
      setFestiveTargetDishId(data.clay_oven_festive_target_dish_id);
      localStorage.setItem('clay_oven_festive_target_dish_id', data.clay_oven_festive_target_dish_id);
    }
    if (data.clay_oven_festive_banner_cta_enabled !== undefined) {
      const ctaEn = data.clay_oven_festive_banner_cta_enabled !== 'false';
      setFestiveBannerCtaEnabled(ctaEn);
      localStorage.setItem('clay_oven_festive_banner_cta_enabled', String(ctaEn));
    }
    if (data.clay_oven_festive_banner_cta_text) {
      setFestiveBannerCtaText(data.clay_oven_festive_banner_cta_text);
      localStorage.setItem('clay_oven_festive_banner_cta_text', data.clay_oven_festive_banner_cta_text);
    }
    if (data.clay_oven_festive_banner_alt) {
      setFestiveBannerAlt(data.clay_oven_festive_banner_alt);
      localStorage.setItem('clay_oven_festive_banner_alt', data.clay_oven_festive_banner_alt);
    }
    if (data.clay_oven_festive_header) setFestiveHeader(data.clay_oven_festive_header);
    if (data.clay_oven_festive_subheader) setFestiveSubheader(data.clay_oven_festive_subheader);
    if (data.clay_oven_festive_description) setFestiveDescription(data.clay_oven_festive_description);
    if (data.clay_oven_festive_price) setFestivePrice(data.clay_oven_festive_price);
    if (data.clay_oven_festive_price_label) setFestivePriceLabel(data.clay_oven_festive_price_label);
    if (data.clay_oven_festive_items) setFestiveItemsRaw(data.clay_oven_festive_items);
  }, [storeSettings]);

  // Load images individually
  React.useEffect(() => {
    const fetchImage = async (key: string, setter: (val: string) => void) => {
      try {
        const res = await fetch(`/api/settings/images/${key}`);
        if (res.ok) {
          const data = await res.json();
          const valid = getValidImageUrl(data?.value);
          if (valid) {
            setter(valid);
            try {
              localStorage.setItem(key, valid);
            } catch {
              // Ignore quota errors when storing large base64 images
            }
          }
        }
      } catch (err) {
        // Silently use fallback
      }
    };

    fetchImage('clay_oven_image_hero_bg', setImageHeroBg);
    fetchImage('clay_oven_image_heritage_left', setImageHeritageLeft);
    fetchImage('clay_oven_image_heritage_right', setImageHeritageRight);
    fetchImage('clay_oven_image_festive_banner', setImageFestiveBanner);
  }, []);

  // Listen to business info updates
  React.useEffect(() => {
    const handler = async () => {
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
        console.error('Failed to reload business info:', err);
      }
    };
    window.addEventListener('business_info_updated', handler);
    return () => window.removeEventListener('business_info_updated', handler);
  }, []);

  const parsedFestiveItems = festiveItemsRaw
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => {
      const parts = line.split('|');
      const name = parts[0]?.trim() || '';
      const description = parts[1]?.trim() || '';
      return { name, description };
    });

  const parsedPrice = parseFloat(festivePrice);
  const hasPrice = festivePrice && !isNaN(parsedPrice) && parsedPrice > 0;

  // Interactive Day & Time selection for event platter (Dine-in booking)
  const [eventDay, setEventDay] = React.useState<'Friday 25th' | 'Saturday 26th' | 'Sunday 27th'>('Friday 25th');
  const [eventTimeSlot, setEventTimeSlot] = React.useState<string>('18:00');
  const [bookingName, setBookingName] = React.useState('');
  const [bookingEmail, setBookingEmail] = React.useState('');
  const [bookingPhone, setBookingPhone] = React.useState('');
  const [bookingGuests, setBookingGuests] = React.useState(2);
  const [isSubmittingBooking, setIsSubmittingBooking] = React.useState(false);
  const [bookingSuccess, setBookingSuccess] = React.useState<{ id: string; day: string; time: string; guests: number; name: string; email: string } | null>(null);
  const [bookingError, setBookingError] = React.useState<string | null>(null);

  // Pre-fill user profile if logged in
  React.useEffect(() => {
    const storedUser = localStorage.getItem('clay_oven_google_user');
    if (storedUser) {
      try {
        const u = JSON.parse(storedUser);
        if (u.name) setBookingName(u.name);
        if (u.email) setBookingEmail(u.email);
        if (u.phone) setBookingPhone(u.phone);
      } catch (e) {
        // ignore
      }
    }
  }, []);

  const availableTimeSlots = React.useMemo(() => {
    if (eventDay === 'Sunday 27th') {
      return [
        { label: '1:00 PM', value: '13:00' },
        { label: '1:30 PM', value: '13:30' },
        { label: '2:00 PM', value: '14:00' },
        { label: '2:30 PM', value: '14:30' },
        { label: '3:00 PM', value: '15:00' },
        { label: '3:30 PM', value: '15:30' },
        { label: '4:00 PM', value: '16:00' },
        { label: '4:30 PM', value: '16:30' },
        { label: '5:00 PM', value: '17:00' },
      ];
    }
    return [
      { label: '12:00 PM', value: '12:00' },
      { label: '1:00 PM', value: '13:00' },
      { label: '2:00 PM', value: '14:00' },
      { label: '3:00 PM', value: '15:00' },
      { label: '4:00 PM', value: '16:00' },
      { label: '5:00 PM', value: '17:00' },
      { label: '6:00 PM', value: '18:00' },
      { label: '7:00 PM', value: '19:00' },
      { label: '8:00 PM', value: '20:00' },
      { label: '8:30 PM', value: '20:30' },
    ];
  }, [eventDay]);

  React.useEffect(() => {
    const isValid = availableTimeSlots.some(s => s.value === eventTimeSlot);
    if (!isValid && availableTimeSlots.length > 0) {
      setEventTimeSlot(availableTimeSlots[0].value);
    }
  }, [availableTimeSlots, eventTimeSlot]);

  // Direct Dine-in Table Booking submission
  const handleDirectDineInBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError(null);

    if (!bookingName.trim()) {
      setBookingError('Please enter your full name.');
      return;
    }
    if (!bookingEmail.trim() || !bookingEmail.includes('@')) {
      setBookingError('Please enter a valid email address.');
      return;
    }
    if (!bookingPhone.trim() || bookingPhone.replace(/\D/g, '').length < 7) {
      setBookingError('Please enter a valid mobile number.');
      return;
    }

    setIsSubmittingBooking(true);
    try {
      const slotLabel = availableTimeSlots.find(s => s.value === eventTimeSlot)?.label || eventTimeSlot;
      const year = new Date().getFullYear();
      const dateStr = eventDay.includes('25') ? `${year}-12-25` : eventDay.includes('26') ? `${year}-12-26` : `${year}-12-27`;
      const bookingId = `BK-${Date.now().toString().slice(-6)}`;

      const newBooking = {
        id: bookingId,
        name: bookingName.trim(),
        email: bookingEmail.trim(),
        phone: bookingPhone.trim(),
        partySize: bookingGuests,
        date: dateStr,
        time: eventTimeSlot,
        diningArea: 'Indoor',
        specialRequests: `Christmas Platter for Two (Dine-in Feast - ${eventDay} at ${slotLabel})`,
        status: 'Pending',
        createdAt: new Date().toISOString()
      };

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBooking)
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to submit booking');
      }

      // Save locally
      const existing = JSON.parse(localStorage.getItem('clay_oven_bookings') || '[]');
      existing.unshift(newBooking);
      localStorage.setItem('clay_oven_bookings', JSON.stringify(existing));
      window.dispatchEvent(new Event('booking_created'));

      setBookingSuccess({
        id: bookingId,
        day: eventDay,
        time: slotLabel,
        guests: bookingGuests,
        name: bookingName.trim(),
        email: bookingEmail.trim()
      });
    } catch (err: any) {
      setBookingError(err.message || 'Something went wrong. Please call us directly at 061 703 513.');
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  const handleFestiveOfferClick = () => {
    const el = document.getElementById('festive-booking-form');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      setCurrentTab('booking');
    }
  };

  // Highlight some premium items
  const featuredIds = ['pk-butter-chicken', 'pk-bbq-platter', 'co-lamb-chops', 'bg-smash'];
  const featuredItems = MENU_ITEMS.filter((item) => featuredIds.includes(item.id));

  return (
    <div className="pb-20 animate-fade-in" id="home-view">
      
      {/* Editorial Hero Section */}
      <section className="relative bg-brand-dark text-brand-beige border-b border-brand-dark px-4 py-16 sm:px-6 lg:px-8 lg:py-24 rounded-none overflow-hidden">
        <div className="absolute inset-0 opacity-25 pointer-events-none mix-blend-overlay">
          <img 
            src={optimizeUnsplashUrl(imageHeroBg, 1200)} 
            alt="The Royal Clay Oven Charcoal Tandoor" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            fetchPriority="high"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/95 via-brand-dark/70 to-brand-dark/50" />
        
        {/* Hero Narrative */}
        <div className="relative z-10 max-w-4xl mx-auto text-center space-y-5 sm:space-y-6">
          <div className="inline-flex items-center space-x-2 bg-brand-dark/80 backdrop-blur-sm border border-brand-accent/30 px-3.5 py-1.5 shadow-md">
            <span className="w-2 h-2 rounded-full bg-brand-accent animate-ping" />
            <span className="font-mono text-[10px] sm:text-xs tracking-widest text-brand-beige uppercase font-bold">
              Shannon, Co. Clare &bull; Charcoal Tandoor &amp; Takeaway
            </span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white tracking-tight leading-none uppercase drop-shadow-md">
            Flame, Smoke &amp; Tradition
          </h1>

          <p className="font-sans text-sm sm:text-base md:text-lg text-brand-beige/90 max-w-2xl mx-auto font-light leading-relaxed">
            Experience Ireland&#39;s premier authentic charcoal clay oven cuisine. Freshly marinated meats, handmade artisan naan breads, and signature recipes cooked over live coal.
          </p>

          <div className="flex items-center justify-center pt-3">
            <button
              type="button"
              id="hero-order-btn"
              onClick={() => setCurrentTab('takeaway')}
              className="w-max max-w-full bg-brand-accent text-white px-9 py-4 text-sm font-bold tracking-wider uppercase hover:bg-brand-dark transition-all duration-200 rounded-full shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center group cursor-pointer"
            >
              <span>Order Now</span>
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </section>

      {/* Dynamic Festive / Special Offer Section (Dine-In Exclusive) */}
      {festiveEnabled && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 sm:mt-14 animate-fade-in" id="festive-event-section">
          <div className="relative border-2 border-amber-500/40 bg-gradient-to-br from-stone-950 via-emerald-950 to-stone-950 shadow-2xl overflow-hidden rounded-none">
            
            {/* Top Festive Badge */}
            <div className="absolute top-0 right-0 z-20 bg-gradient-to-r from-amber-600 to-amber-500 text-white font-mono text-[10px] sm:text-xs uppercase tracking-widest px-4 py-1.5 font-bold flex items-center gap-1.5 shadow-md">
              <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-200" />
              <span>DINE-IN EXCLUSIVE EVENT</span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 p-6 sm:p-8 lg:p-10 items-stretch">
              
              {/* Left Column: Dish Image Showcase */}
              <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
                <div className="relative group overflow-hidden border border-amber-500/30 bg-black shadow-xl aspect-4/3 sm:aspect-auto sm:h-full min-h-[300px]">
                  <img
                    src={imageFestiveBanner || '/christmas-platter.webp'}
                    alt={festiveHeader || 'Christmas Platter for Two'}
                    className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />
                  
                  {/* Photo Overlays */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                    <span className="bg-amber-500/90 text-stone-950 font-mono text-[10px] sm:text-xs font-bold uppercase px-2.5 py-1 tracking-wider backdrop-blur-sm">
                      DINE-IN ONLY &bull; {festiveSubheader || 'FRI 25 – SUN 27'}
                    </span>
                    {hasPrice && (
                      <span className="bg-black/80 border border-amber-500/50 text-amber-400 font-serif font-black text-sm sm:text-base px-3 py-1">
                        &euro;{parsedPrice.toFixed(2)} (FOR 2)
                      </span>
                    )}
                  </div>
                </div>

                {/* Operating Hours Callout */}
                <div className="bg-black/40 border border-emerald-500/20 p-3 font-mono text-xs text-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span><strong>Fri &amp; Sat:</strong> 12:00 PM – 9:00 PM</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span><strong>Sunday:</strong> 1:00 PM – 5:00 PM</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Menu Details & Direct Table Booking */}
              <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
                
                {/* Header Information */}
                <div className="space-y-1.5">
                  <span className="font-mono text-xs tracking-widest text-amber-400 uppercase font-bold flex items-center gap-1.5">
                    <Utensils className="w-3.5 h-3.5" />
                    <span>DINE-IN CELEBRATION &bull; TABLE RESERVATION REQUIRED</span>
                  </span>
                  <h2 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight uppercase">
                    {festiveHeader || 'CHRISTMAS PLATTER FOR TWO'}
                  </h2>
                  <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed font-light">
                    A festive feast made for sharing! Join us in our dining hall to enjoy our signature flame-grilled tandoor selection, aromatics curries, and warm dessert served fresh to your table.
                  </p>
                </div>

                {/* Platter Item List (Single clean div with compact padding & margins) */}
                <div className="bg-black/35 border border-emerald-800/40 p-3 sm:p-3.5 rounded-none text-xs text-stone-200">
                  <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-emerald-800/40">
                    <span className="font-serif text-xs sm:text-sm font-bold text-amber-300 uppercase tracking-wide">
                      WHAT&#39;S INCLUDED IN THE PLATTER
                    </span>
                    <span className="font-mono text-[10px] sm:text-xs text-emerald-300">
                      Serves 2 Guests &bull; Dine-In Feast
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 leading-snug">
                    {parsedFestiveItems.map((item, idx) => (
                      <div key={idx} className="flex items-baseline gap-1.5">
                        <span className="text-amber-400 font-bold shrink-0">&bull;</span>
                        <div className="text-[11px] sm:text-xs">
                          <strong className="text-white font-semibold">{item.name}</strong>
                          {item.description && (
                            <span className="text-emerald-200/80 font-normal"> &ndash; {item.description}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Direct Dine-In Table Booking Form */}
                <div className="bg-stone-900/95 border border-amber-500/35 p-3.5 sm:p-4 space-y-3" id="festive-booking-form">
                  
                  {bookingSuccess ? (
                    <div className="p-4 bg-emerald-950/80 border border-emerald-500/50 space-y-3 text-center animate-fade-in">
                      <div className="w-10 h-10 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/40">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                      <h4 className="font-serif text-lg sm:text-xl font-bold text-white">
                        Table Reservation Request Received!
                      </h4>
                      <p className="font-mono text-xs text-amber-400 font-bold">
                        Booking Reference: {bookingSuccess.id}
                      </p>
                      <p className="text-xs text-emerald-100 max-w-md mx-auto leading-relaxed">
                        Thank you, <strong>{bookingSuccess.name}</strong>! Your table for the <strong>Christmas Platter for Two</strong> is booked for <strong>{bookingSuccess.day} at {bookingSuccess.time}</strong> ({bookingSuccess.guests} Guests).
                      </p>
                      <p className="text-[11px] text-emerald-300 font-mono">
                        A confirmation receipt has been sent to <strong>{bookingSuccess.email}</strong>.
                      </p>
                      <button
                        type="button"
                        onClick={() => setBookingSuccess(null)}
                        className="mt-2 text-xs font-mono uppercase tracking-wider text-amber-400 hover:text-white underline underline-offset-4 cursor-pointer"
                      >
                        Book Another Table
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleDirectDineInBooking} className="space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-white/10 pb-2">
                        <span className="font-mono text-xs text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>BOOK YOUR DINE-IN TABLE FOR THE PLATTER</span>
                        </span>
                        <span className="font-mono text-[11px] text-stone-300">
                          Price: <strong className="text-amber-400 text-xs sm:text-sm">&euro;{parsedPrice.toFixed(2)}</strong> (for 2)
                        </span>
                      </div>

                      {/* Step 1: Day Picker */}
                      <div className="space-y-1">
                        <label className="block font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-stone-300 font-medium">
                          1. Select Feast Day:
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                          {(['Friday 25th', 'Saturday 26th', 'Sunday 27th'] as const).map((day) => {
                            const isSelected = eventDay === day;
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => setEventDay(day)}
                                className={`py-1.5 px-2 text-center font-mono text-xs font-bold uppercase transition-all border cursor-pointer ${
                                  isSelected
                                    ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md scale-[1.02]'
                                    : 'bg-stone-950 text-stone-300 border-white/10 hover:border-amber-500/50 hover:bg-stone-800'
                                }`}
                              >
                                <span>{day}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Step 2: Time Slot & Party Size */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                          <label className="block font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-stone-300 font-medium">
                            2. Preferred Time Slot:
                          </label>
                          <select
                            value={eventTimeSlot}
                            onChange={(e) => setEventTimeSlot(e.target.value)}
                            className="w-full bg-stone-950 border border-amber-500/40 text-white font-mono text-xs py-2 px-2.5 focus:outline-none focus:border-amber-400 cursor-pointer"
                          >
                            {availableTimeSlots.map((slot) => (
                              <option key={slot.value} value={slot.value} className="bg-stone-900 text-white">
                                {slot.label} ({eventDay})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="block font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-stone-300 font-medium">
                            3. Party Size (Guests):
                          </label>
                          <select
                            value={bookingGuests}
                            onChange={(e) => setBookingGuests(parseInt(e.target.value) || 2)}
                            className="w-full bg-stone-950 border border-amber-500/40 text-white font-mono text-xs py-2 px-2.5 focus:outline-none focus:border-amber-400 cursor-pointer"
                          >
                            <option value={2}>2 Guests (1 Platter)</option>
                            <option value={3}>3 Guests</option>
                            <option value={4}>4 Guests (2 Platters)</option>
                            <option value={5}>5 Guests</option>
                            <option value={6}>6 Guests (3 Platters)</option>
                            <option value={8}>8+ Guests (Group)</option>
                          </select>
                        </div>
                      </div>

                      {/* Step 3: Contact Details (Name, Email, Mobile) */}
                      <div className="space-y-1 pt-1 border-t border-white/10">
                        <label className="block font-mono text-[10px] sm:text-[11px] uppercase tracking-wider text-stone-300 font-medium">
                          4. Your Contact Details (for confirmation):
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          <div className="relative">
                            <User className="w-3.5 h-3.5 text-amber-400 absolute left-2.5 top-2.5 pointer-events-none" />
                            <input
                              type="text"
                              required
                              value={bookingName}
                              onChange={(e) => setBookingName(e.target.value)}
                              placeholder="Full Name"
                              className="w-full bg-stone-950 border border-amber-500/30 text-white font-sans text-xs py-2 pl-8 pr-2.5 placeholder:text-stone-500 focus:outline-none focus:border-amber-400"
                            />
                          </div>

                          <div className="relative">
                            <Mail className="w-3.5 h-3.5 text-amber-400 absolute left-2.5 top-2.5 pointer-events-none" />
                            <input
                              type="email"
                              required
                              value={bookingEmail}
                              onChange={(e) => setBookingEmail(e.target.value)}
                              placeholder="Email Address"
                              className="w-full bg-stone-950 border border-amber-500/30 text-white font-sans text-xs py-2 pl-8 pr-2.5 placeholder:text-stone-500 focus:outline-none focus:border-amber-400"
                            />
                          </div>

                          <div className="relative">
                            <Phone className="w-3.5 h-3.5 text-amber-400 absolute left-2.5 top-2.5 pointer-events-none" />
                            <input
                              type="tel"
                              required
                              value={bookingPhone}
                              onChange={(e) => setBookingPhone(e.target.value)}
                              placeholder="Mobile Number"
                              className="w-full bg-stone-950 border border-amber-500/30 text-white font-sans text-xs py-2 pl-8 pr-2.5 placeholder:text-stone-500 focus:outline-none focus:border-amber-400"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Error Banner */}
                      {bookingError && (
                        <div className="p-2 bg-red-950/80 border border-red-500/40 text-red-200 text-xs font-mono">
                          {bookingError}
                        </div>
                      )}

                      {/* Action Button */}
                      <div className="pt-1">
                        <button
                          type="submit"
                          disabled={isSubmittingBooking}
                          className="w-full bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-stone-950 py-3 px-5 font-mono text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-200 shadow-lg hover:shadow-amber-500/20 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                        >
                          {isSubmittingBooking ? (
                            <span>Submitting Reservation...</span>
                          ) : (
                            <>
                              <Calendar className="w-4 h-4" />
                              <span>Book Table for Dine-In Platter</span>
                            </>
                          )}
                        </button>
                        <p className="text-[10px] font-mono text-stone-400 text-center mt-1.5">
                          Instant email confirmation dispatched. No deposit or advance card payment required.
                        </p>
                      </div>

                    </form>
                  )}

                </div>

              </div>

            </div>

          </div>
        </section>
      )}

      {/* Triple Advantage Row */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 sm:mt-8">
        <div className="grid grid-cols-1 md:grid-cols-3 border border-brand-dark/10 divide-y md:divide-y-0 md:divide-x divide-brand-dark/10 bg-white">
          <div className="p-8 space-y-3">
            <div className="p-3 bg-brand-beige inline-block border border-brand-dark/5">
              <ChefHat className="w-5 h-5 text-brand-accent stroke-[1.5]" />
            </div>
            <h3 className="font-serif text-lg font-bold tracking-tight">The 400°C Clay Oven</h3>
            <p className="text-sm text-brand-muted leading-relaxed font-normal">
              Our traditional clay tandoor locking in deep smoky oak flavours, producing perfectly charred skewers and fluffy, blistered naan breads.
            </p>
          </div>
          
          <div className="p-8 space-y-3">
            <div className="p-3 bg-brand-beige inline-block border border-brand-dark/5">
              <Heart className="w-5 h-5 text-brand-accent stroke-[1.5]" />
            </div>
            <h3 className="font-serif text-lg font-bold tracking-tight">Caring Recipe Craft</h3>
            <p className="text-sm text-brand-muted leading-relaxed font-normal">
              Family-owned recipes passed down through generations. Prepared from scratch using locally sourced Irish ingredients and premium Pakistani spices.
            </p>
          </div>

          <div className="p-8 space-y-3">
            <div className="p-3 bg-brand-beige inline-block border border-brand-dark/5">
              <ShieldCheck className="w-5 h-5 text-brand-accent stroke-[1.5]" />
            </div>
            <h3 className="font-serif text-lg font-bold tracking-tight">Allergens Declared</h3>
            <p className="text-sm text-brand-muted leading-relaxed font-normal">
              We are deeply transparent about our food. Each dish includes specific regulatory allergen lists to keep your dining safe and comfortable.
            </p>
          </div>
        </div>
      </section>

      {/* Two-Column Heritage Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mt-16 sm:mt-20">
        <div className="lg:col-span-5 space-y-6">
          <span className="font-mono text-sm tracking-widest text-brand-accent uppercase font-bold block">
            OUR STORY
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-brand-dark leading-tight">
            Family Roots, Flame-Grilled Passions.
          </h2>
          <div className="h-0.5 w-16 bg-brand-accent"></div>
          <p className="text-sm sm:text-base text-brand-muted leading-relaxed font-normal">
            The Royal Clay Oven is a proudly family-run restaurant serving high-grade, freshly prepared Pakistani cuisine in Ireland. Every single kebab, chicken thigh, and flatbread is cooked with extreme care and rich, authentic flavor profiles. 
          </p>
          <blockquote className="border-l-2 border-brand-accent pl-4 py-1 italic text-brand-dark font-serif text-base">
            "Authenticity in every grain of rice, smoky char in every bite of meat."
          </blockquote>
          <p className="text-sm text-brand-muted font-normal leading-relaxed">
            Furthermore, we cater for all parties, including special in-house celebrations (accommodating up to 50 guests) and corporate or outdoor events with tailored buffet services.
          </p>
          <div className="pt-2">
            <button
              type="button"
              id="story-catering-btn"
              onClick={() => setCurrentTab('booking')}
              className="inline-flex items-center text-sm font-mono text-brand-dark hover:text-brand-accent tracking-widest font-bold uppercase transition-colors"
            >
              Inquire About Catering <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </button>
          </div>
        </div>

        <div className="lg:col-span-7 grid grid-cols-2 gap-4">
          <div className="space-y-3 sm:space-y-4">
            <div className="h-48 sm:h-64 border border-brand-dark/10 bg-white">
              <img 
                src={optimizeUnsplashUrl(imageHeritageLeft, 500)} 
                alt="Karahi cooking" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
            </div>
            <div className="p-3 sm:p-6 border border-brand-dark/10 bg-white shadow-none space-y-1 sm:space-y-2">
              <span className="font-serif text-lg sm:text-2xl font-bold block text-brand-dark">100%</span>
              <span className="font-mono text-[10px] sm:text-sm text-brand-muted tracking-wider uppercase block">Hand-Prepared Spices</span>
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4 pt-4 sm:pt-8">
            <div className="p-3 sm:p-6 border border-brand-dark/10 bg-white shadow-none space-y-1 sm:space-y-2">
              <span className="font-serif text-lg sm:text-2xl font-bold block text-brand-dark">50+</span>
              <span className="font-mono text-[10px] sm:text-sm text-brand-muted tracking-wider uppercase block">Guest Capacity Hall</span>
            </div>
            <div className="h-48 sm:h-64 border border-brand-dark/10 bg-white">
              <img 
                src={optimizeUnsplashUrl(imageHeritageRight, 500)} 
                alt="Skewers roasting" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Featured Specialties (Minimalist Bento Row) */}
      <section className="bg-white border-y border-brand-dark/10 py-16 mt-16 sm:mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-baseline justify-between mb-12">
            <div>
              <span className="font-mono text-sm tracking-widest text-brand-accent uppercase font-bold block mb-2">
                CLAY OVEN HIGHLIGHTS
              </span>
              <h2 className="font-serif text-3xl font-bold tracking-tight">
                Our Signature Selection
              </h2>
            </div>
            <button
              type="button"
              id="view-all-menu-btn"
              onClick={() => setCurrentTab('menu')}
              className="text-sm font-mono text-brand-dark hover:text-brand-accent tracking-widest font-bold uppercase border-b border-brand-dark transition-all duration-200 pb-1 mt-4 sm:mt-0"
            >
              VIEW THE ENTIRE MENU
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredItems.map((item) => (
              <div 
                key={item.id} 
                className="border border-brand-dark/10 bg-brand-beige p-6 space-y-4 flex flex-col justify-between hover:border-brand-dark hover:-translate-y-1 transition-all duration-300 rounded-none relative"
              >
                {item.isVeg && (
                  <span className="absolute top-4 right-4 bg-emerald-50 text-emerald-800 font-mono text-xs tracking-wider font-bold border border-emerald-300/30 px-2 py-0.5 rounded-none uppercase">
                    Vegan/Veg Option
                  </span>
                )}
                
                <div className="space-y-2">
                  <span className="font-mono text-sm tracking-widest text-brand-accent uppercase block font-semibold">
                    {item.category}
                  </span>
                  <h3 className="font-serif text-lg font-bold text-brand-dark">
                    {item.name}
                  </h3>
                  <p className="text-sm text-brand-muted font-normal leading-relaxed line-clamp-3">
                    {item.description}
                  </p>
                </div>

                <div className="pt-4 flex items-center justify-between border-t border-brand-dark/5">
                  <span className="font-mono text-base font-semibold text-brand-dark">
                    &euro;{item.price.toFixed(2)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      // Navigate to takeaway
                      setCurrentTab('takeaway');
                    }}
                    className="text-sm font-mono font-bold uppercase tracking-widest text-brand-accent hover:text-brand-dark flex items-center space-x-1"
                  >
                    <span>Order Now</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Info, Hours, Map Column */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 sm:mt-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 border border-brand-dark/10 bg-white divide-y lg:divide-y-0 lg:divide-x divide-brand-dark/10">
          
          {/* Box 1: Address and Contact */}
          <div className="p-8 sm:p-12 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="font-mono text-sm text-brand-accent uppercase font-bold tracking-widest block">
                FIND US
              </span>
              <h3 className="font-serif text-2xl font-bold tracking-tight">Location & Contact</h3>
              
              <div className="space-y-4 pt-2">
                <a
                  href={businessInfo.maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start group hover:text-brand-accent transition-colors"
                >
                  <MapPin className="w-4 h-4 text-brand-accent mr-3 mt-1 shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="text-sm text-brand-muted leading-relaxed font-normal group-hover:text-brand-dark transition-colors whitespace-pre-line">
                    <strong className="text-brand-dark block font-semibold group-hover:text-brand-accent transition-colors">{businessInfo.business_name}</strong>
                    {businessInfo.address}
                  </span>
                </a>

                <div className="flex items-start">
                  <Phone className="w-4 h-4 text-brand-accent mr-3 mt-1 shrink-0" />
                  <div className="flex flex-col text-sm text-brand-muted font-mono space-y-1.5">
                    <span>Phone: <a href={`tel:${businessInfo.phone.replace(/\s+/g, '')}`} className="hover:text-brand-accent transition-colors">{businessInfo.phone}</a></span>
                    <span>Mobile: <a href={`tel:${businessInfo.mobile.replace(/\s+/g, '')}`} className="hover:text-brand-accent transition-colors">{businessInfo.mobile}</a></span>
                    <span>Whatsapp: <a href={businessInfo.whatsapp.replace(/\s+/g, '').startsWith('0') ? `https://wa.me/353${businessInfo.whatsapp.replace(/\s+/g, '').substring(1)}` : `https://wa.me/${businessInfo.whatsapp.replace(/\s+/g, '')}`} target="_blank" rel="noopener noreferrer" className="hover:text-brand-accent transition-colors font-bold underline decoration-brand-accent/30 decoration-2 underline-offset-4">{businessInfo.whatsapp.trim().startsWith('353') ? '0' + businessInfo.whatsapp.trim().substring(3).trim() : businessInfo.whatsapp.trim().startsWith('+353') ? '0' + businessInfo.whatsapp.trim().substring(4).trim() : businessInfo.whatsapp}</a></span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-brand-dark/5 text-sm text-brand-muted font-normal">
              Press buttons to book custom functions or home deliveries directly.
            </div>
          </div>

          {/* Box 2: Working Hours */}
          <div className="p-8 sm:p-12 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <span className="font-mono text-sm text-brand-accent uppercase font-bold tracking-widest block">
                TIMINGS
              </span>
              <h3 className="font-serif text-2xl font-bold tracking-tight">Opening Hours</h3>
              
              <div className="space-y-3 pt-2 text-sm">
                <div className="flex justify-between pb-1 border-b border-brand-dark/5 font-mono text-brand-muted">
                  <span>MONDAY</span>
                  <span className="text-brand-dark">{weeklyTimings.monday}</span>
                </div>
                <div className="flex justify-between pb-1 border-b border-brand-dark/5 font-mono text-brand-muted">
                  <span>TUESDAY</span>
                  <span className="text-brand-dark">{weeklyTimings.tuesday}</span>
                </div>
                <div className="flex justify-between pb-1 border-b border-brand-dark/5 font-mono text-brand-muted">
                  <span>WEDNESDAY</span>
                  <span className="text-brand-dark">{weeklyTimings.wednesday}</span>
                </div>
                <div className="flex justify-between pb-1 border-b border-brand-dark/5 font-mono text-brand-muted">
                  <span>THURSDAY</span>
                  <span className="text-brand-dark">{weeklyTimings.thursday}</span>
                </div>
                <div className="flex justify-between pb-1 border-b border-brand-dark/5 font-mono text-brand-muted">
                  <span>FRIDAY</span>
                  <span className="text-brand-dark">{weeklyTimings.friday}</span>
                </div>
                <div className="flex justify-between items-center px-2 py-1.5 -mx-2 bg-brand-accent/10 border border-brand-accent/20 rounded-sm font-mono text-brand-dark">
                  <span className="font-semibold text-brand-accent">SATURDAY</span>
                  <span className="text-brand-dark font-bold">{weeklyTimings.saturday}</span>
                </div>
                <div className="flex justify-between items-center px-2 py-1.5 -mx-2 bg-brand-accent/10 border border-brand-accent/20 rounded-sm font-mono text-brand-dark">
                  <span className="font-semibold text-brand-accent">SUNDAY</span>
                  <span className="text-brand-dark font-bold">{weeklyTimings.sunday}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-sm text-brand-accent font-semibold font-mono">
              <Clock className="w-4 h-4" />
              <span>{weeklyTimings.offset}</span>
            </div>
          </div>

          {/* Box 3: Outdoor Events */}
          <div className="p-8 sm:p-12 space-y-6 flex flex-col justify-between bg-brand-dark text-brand-beige">
            <div className="space-y-4">
              <span className="font-mono text-sm text-brand-accent uppercase font-bold tracking-widest block">
                EVENTS
              </span>
              <h3 className="font-serif text-2xl font-bold tracking-tight">Outdoor Catering & Private Hall</h3>
              <p className="text-sm text-brand-beige/80 leading-relaxed font-normal">
                Host your family functions, birthdays, active corporate retreats or in-house celebrations of up to 50 guests. We formulate curated buffet plates, authentic grills and customizable dessert lists.
              </p>
            </div>

            <button
              type="button"
              id="direct-book-table-btn"
              onClick={() => setCurrentTab('booking')}
              className="w-full bg-brand-accent text-white py-3.5 text-sm font-mono tracking-wider font-bold uppercase transition-all duration-200 hover:bg-brand-beige hover:text-brand-dark"
            >
              Inquire Event Space
            </button>
          </div>

        </div>
      </section>

      {/* Custom Warning Modal Dialog */}
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-brand-dark/70 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm sm:max-w-md bg-white border border-brand-dark p-5 sm:p-6 space-y-4 sm:space-y-5 shadow-[0_20px_50px_rgba(0,0,0,0.3)] animate-slide-up">
            
            {/* Close Button X */}
            <button
              type="button"
              onClick={() => setShowWarningModal(false)}
              className="absolute top-3 right-3 p-1 text-brand-muted hover:text-brand-dark hover:bg-brand-dark/5 transition-colors border border-transparent hover:border-brand-dark/10"
              aria-label="Close warning"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Warning Content */}
            <div className="text-center space-y-3 pt-1">
              <div className="w-10 h-10 bg-brand-accent/10 text-brand-accent flex items-center justify-center mx-auto">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <h3 className="font-sans text-lg sm:text-xl font-bold tracking-tight text-brand-dark">
                Online Ordering Notice
              </h3>
              <p className="font-sans text-xs sm:text-sm text-brand-muted leading-relaxed font-medium text-center">
                {noticeText}
              </p>
              <p className="font-sans text-2xl sm:text-3xl font-extrabold text-brand-dark tracking-tight">
                {noticePhone}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 pt-1">
              <a
                href={`tel:${noticePhone.replace(/\s+/g, '')}`}
                className="flex-1 bg-brand-accent hover:bg-brand-dark text-white py-2.5 sm:py-3 text-xs sm:text-sm font-sans font-bold uppercase tracking-wider text-center transition-colors flex items-center justify-center space-x-2"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Now</span>
              </a>
              <button
                type="button"
                onClick={() => setShowWarningModal(false)}
                className="flex-1 border border-brand-dark/15 hover:border-brand-dark text-brand-dark py-2.5 sm:py-3 text-xs sm:text-sm font-sans font-bold uppercase tracking-wider text-center transition-colors"
              >
                Dismiss
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
