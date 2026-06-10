/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { ChefHat, ShoppingBag, Calendar, Phone, Clock, MapPin, ArrowRight, ShieldCheck, Heart, Sparkles, X } from 'lucide-react';
import { MENU_ITEMS } from '../data/menu';

interface HomeViewProps {
  setCurrentTab: (tab: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ setCurrentTab }) => {
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
  const [noticeEnabled, setNoticeEnabled] = React.useState(localStorage.getItem('clay_oven_notice_enabled') !== 'false');

  const [showWarningModal, setShowWarningModal] = React.useState(false);

  // Dynamic Festive Offer State
  const [festiveEnabled, setFestiveEnabled] = React.useState(localStorage.getItem('clay_oven_festive_enabled') !== 'false');
  const [festiveHeader, setFestiveHeader] = React.useState(localStorage.getItem('clay_oven_festive_header') || 'BANK HOLIDAY WEEKEND');
  const [festiveSubheader, setFestiveSubheader] = React.useState(localStorage.getItem('clay_oven_festive_subheader') || 'Running: Thursday — Friday — Monday');
  const [festiveDescription, setFestiveDescription] = React.useState(localStorage.getItem('clay_oven_festive_description') || 'Celebrate the festive weekend with our custom curated clay oven specialty platter. Crafted with premium Pakistani heritage recipes and fresh local ingredients.');
  const [festivePrice, setFestivePrice] = React.useState(localStorage.getItem('clay_oven_festive_price') || '35.00');
  const [festiveItemsRaw, setFestiveItemsRaw] = React.useState(localStorage.getItem('clay_oven_festive_items') || `Beef Nihari | Slow-cooked, rich beef shank stew cooked to melt-in-mouth perfection, served with 1 fresh hot tandoori naan.
Clay Oven BBQ Platter | A flame-roasted collection of 1 Beef Chapli Kebab, 1 tender Lamb Chop, and 1 Royal Kebab Skewer.
Zeera Rice | Fragrant cumin-tempered basmati rice with aromatic herbs.
Complimentary Accompaniments | Includes fresh garden salad, traditional yogurt Raita, and tangy herb chutney.
Falooda (1 Serving) | A delicious, cold traditional dessert drink featuring rose syrup, basil seeds, vermicelli, and sweet milk.`);

  // Self-hosted Gallery Image States
  const [imageHeroBg, setImageHeroBg] = React.useState(localStorage.getItem('clay_oven_image_hero_bg') || 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1600&q=80');
  const [imageHeritageLeft, setImageHeritageLeft] = React.useState(localStorage.getItem('clay_oven_image_heritage_left') || 'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?auto=format&fit=crop&w=600&q=80');
  const [imageHeritageRight, setImageHeritageRight] = React.useState(localStorage.getItem('clay_oven_image_heritage_right') || 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?auto=format&fit=crop&w=600&q=80');

  // Effect to synchronize settings with server database
  React.useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings');
        if (response.ok) {
          const data = await response.json();
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

          if (data.clay_oven_notice_text) setNoticeText(data.clay_oven_notice_text);
          if (data.clay_oven_notice_phone) setNoticePhone(data.clay_oven_notice_phone);
          if (data.clay_oven_notice_enabled !== undefined) {
            const enabled = data.clay_oven_notice_enabled !== 'false';
            setNoticeEnabled(enabled);
            setShowWarningModal(enabled);
          } else {
            setShowWarningModal(noticeEnabled);
          }

          if (data.clay_oven_festive_enabled !== undefined) setFestiveEnabled(data.clay_oven_festive_enabled !== 'false');
          if (data.clay_oven_festive_header) setFestiveHeader(data.clay_oven_festive_header);
          if (data.clay_oven_festive_subheader) setFestiveSubheader(data.clay_oven_festive_subheader);
          if (data.clay_oven_festive_description) setFestiveDescription(data.clay_oven_festive_description);
          if (data.clay_oven_festive_price) setFestivePrice(data.clay_oven_festive_price);
          if (data.clay_oven_festive_items) setFestiveItemsRaw(data.clay_oven_festive_items);

          if (data.clay_oven_image_hero_bg) setImageHeroBg(data.clay_oven_image_hero_bg);
          if (data.clay_oven_image_heritage_left) setImageHeritageLeft(data.clay_oven_image_heritage_left);
          if (data.clay_oven_image_heritage_right) setImageHeritageRight(data.clay_oven_image_heritage_right);
        } else {
          // Keep showing warning modal using local notice status if fetch failed
          setShowWarningModal(noticeEnabled);
        }
      } catch (err) {
        console.error('Failed to retrieve storefront settings:', err);
        setShowWarningModal(noticeEnabled);
      }
    };
    loadSettings();
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

  // Highlight some premium items
  const featuredIds = ['pk-butter-chicken', 'pk-bbq-platter', 'co-lamb-chops', 'bg-smash'];
  const featuredItems = MENU_ITEMS.filter((item) => featuredIds.includes(item.id));

  return (
    <div className="pb-20 animate-fade-in" id="home-view">
      
      {/* Editorial Hero Section */}
      <section className="relative bg-brand-dark text-brand-beige border-b border-brand-dark px-4 py-16 sm:px-6 lg:px-8 lg:py-28 rounded-none">
        <div className="absolute inset-0 opacity-20 pointer-events-none mix-blend-overlay">
          <img 
            src={imageHeroBg} 
            alt="Smoky background" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            fetchPriority="high"
          />
        </div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10 space-y-8">
          <div className="inline-flex items-center space-x-2 border border-brand-accent/40 px-3 py-1 bg-brand-accent/10">
            <span className="font-mono text-sm sm:text-sm tracking-widest text-brand-accent uppercase font-bold">
              ESTABLISHED IN IRELAND &bull; PAKISTANI HERITAGE
            </span>
          </div>
          
          <h1 className="font-serif text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-none text-brand-beige">
            FLAME, CLAY AND <br />
            <span className="text-brand-accent italic font-normal">Authentic Heritage</span>
          </h1>
          
          <p className="max-w-xl mx-auto font-sans text-sm sm:text-base text-brand-beige/80 leading-relaxed font-normal">
            Welcome to <strong className="text-brand-beige font-semibold">The Royal Clay Oven</strong>. We fire up our traditional brick-lined tandoor daily, delivering premium Pakistani curries, dry-aged flame-grilled chops, spiced kebabs, and handcrafted pizzas.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              type="button"
              id="hero-order-btn"
              onClick={() => setCurrentTab('takeaway')}
              className="w-full sm:w-auto bg-brand-accent text-white px-8 py-4 text-sm font-mono tracking-wider uppercase font-bold border border-transparent hover:bg-brand-beige hover:text-brand-dark hover:border-brand-dark transition-all duration-200 rounded-none flex items-center justify-center group"
            >
              Order Takeaway Now
              <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
            </button>
            <button
              type="button"
              id="hero-book-btn"
              onClick={() => setCurrentTab('booking')}
              className="w-full sm:w-auto bg-transparent text-white px-8 py-4 text-sm font-mono tracking-wider uppercase font-bold border border-brand-beige/35 hover:border-white hover:bg-white/5 transition-all duration-200 rounded-none"
            >
              Reserve a Table
            </button>
          </div>
        </div>
      </section>

      {/* Dynamic Festive Offer Section */}
      {festiveEnabled && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 sm:mt-16">
          <div className="border-2 border-brand-accent bg-brand-beige p-8 sm:p-12 relative overflow-hidden rounded-none">
            {/* Decorative limited-time tag */}
            <div className="absolute top-0 right-0 animate-shimmer text-white font-mono text-[10px] sm:text-xs uppercase tracking-widest px-4 py-2 font-bold flex items-center gap-1.5 shadow-[0_4px_12px_rgba(200,90,50,0.2)]">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>Limited Time Festive Offer</span>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* Column 1: Promo Detail Banner */}
              <div className="lg:col-span-5 space-y-4">
                <span className="font-mono text-sm tracking-widest text-brand-accent uppercase font-bold block">
                  SPECIAL EVENT
                </span>
                <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-extrabold text-brand-dark tracking-tight leading-none uppercase whitespace-pre-line">
                  {festiveHeader}
                </h2>
                <div className="inline-block bg-brand-accent/10 border border-brand-accent/20 px-3 py-1">
                  <p className="font-mono text-[11px] text-brand-accent tracking-widest uppercase font-bold">
                    {festiveSubheader}
                  </p>
                </div>
                <p className="text-sm text-brand-muted leading-relaxed font-normal whitespace-pre-line">
                  {festiveDescription}
                </p>
                
                <div className="pt-4 flex items-baseline space-x-2">
                  <span className="text-xs font-mono text-brand-muted uppercase">PRICE FOR 1:</span>
                  <span className="text-4xl font-serif font-black text-brand-dark">&euro;{parseFloat(festivePrice).toFixed(2)}</span>
                </div>
                <p className="text-[10px] font-mono text-brand-muted uppercase tracking-wider">
                  * Service charge will apply
                </p>
              </div>

              {/* Column 2: Platter Menu Card */}
              <div className="lg:col-span-7 bg-white border border-brand-dark/10 p-6 sm:p-8 space-y-6 shadow-sm">
                <h3 className="font-serif text-xl font-bold tracking-tight text-brand-dark uppercase border-b border-brand-dark/10 pb-3 flex items-center justify-between">
                  <span>SPECIAL MENU PLATTER</span>
                  <Sparkles className="w-5 h-5 text-brand-accent" />
                </h3>

                <ul className="space-y-4 text-sm font-sans text-brand-dark">
                  {parsedFestiveItems.map((item, idx) => (
                    <li key={idx} className="flex items-start">
                      <span className="w-2 h-2 bg-brand-accent mt-2 mr-3 shrink-0"></span>
                      <div>
                        <strong className="font-bold block text-sm">{item.name}</strong>
                        {item.description && <p className="text-xs text-brand-muted">{item.description}</p>}
                      </div>
                    </li>
                  ))}
                </ul>

                {/* Dynamic CTA buttons */}
                <div className="pt-4 border-t border-brand-dark/10 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setCurrentTab('takeaway')}
                    className="flex-1 bg-brand-accent hover:bg-brand-dark text-white py-3.5 px-6 text-xs font-mono tracking-widest font-bold uppercase transition-all duration-200 text-center rounded-none"
                  >
                    Order Platter Online
                  </button>
                  <button
                    type="button"
                    onClick={() => setCurrentTab('booking')}
                    className="flex-1 border border-brand-dark/20 hover:border-brand-dark text-brand-dark py-3.5 px-6 text-xs font-mono tracking-widest font-bold uppercase transition-all duration-200 text-center rounded-none"
                  >
                    Reserve a Table
                  </button>
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
                src={imageHeritageLeft} 
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
                src={imageHeritageRight} 
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
                  href="https://maps.google.com/?q=The+Royal+Clay+Oven+Ballycasey+Craft+And+Design+Center+Shannon+County+Clare+V14+AW71"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start group hover:text-brand-accent transition-colors"
                >
                  <MapPin className="w-4 h-4 text-brand-accent mr-3 mt-1 shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="text-sm text-brand-muted leading-relaxed font-normal group-hover:text-brand-dark transition-colors">
                    <strong className="text-brand-dark block font-semibold group-hover:text-brand-accent transition-colors">The Royal Clay Oven</strong>
                    Ballycasey Craft And Design Center,<br />
                    Shannon, County Clare V14 AW71
                  </span>
                </a>

                <div className="flex items-start">
                  <Phone className="w-4 h-4 text-brand-accent mr-3 mt-1 shrink-0" />
                  <div className="flex flex-col text-sm text-brand-muted font-mono space-y-1.5">
                    <span>Phone: <a href="tel:0860203720" className="hover:text-brand-accent transition-colors">086 020 3720</a></span>
                    <span>Mobile: <a href="tel:0894899950" className="hover:text-brand-accent transition-colors">089 489 9950</a></span>
                    <span>Whatsapp: <a href="https://wa.me/353894899950" target="_blank" rel="noopener noreferrer" className="hover:text-brand-accent transition-colors font-bold underline decoration-brand-accent/30 decoration-2 underline-offset-4">089 489 9950 (Click to Chat)</a></span>
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
                <div className="flex justify-between pb-1 border-b border-brand-dark/5 font-mono text-brand-muted">
                  <span>SATURDAY</span>
                  <span className="text-brand-dark">{weeklyTimings.saturday}</span>
                </div>
                <div className="flex justify-between pb-1 border-b border-brand-dark/5 font-mono text-brand-muted">
                  <span>SUNDAY</span>
                  <span className="text-brand-dark">{weeklyTimings.sunday}</span>
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

    </div>
  );
};
