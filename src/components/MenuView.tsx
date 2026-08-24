/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Search, Info, HelpCircle } from 'lucide-react';
import { MENU_ITEMS, CATEGORIES, ALLERGENS } from '../data/menu';

interface MenuViewProps {
  storeSettings: Record<string, string>;
}

export const MenuView: React.FC<MenuViewProps> = ({ storeSettings }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string>('All');
  const [vegetarianFilter, setVegetarianFilter] = React.useState(false);
  const [showAllergensKey, setShowAllergensKey] = React.useState(false);
  const [dishImages, setDishImages] = React.useState<any>({});

  React.useEffect(() => {
    const fetchDishImages = async () => {
      try {
        // Build list of expected dish image keys from MENU_ITEMS
        const imagePromises = MENU_ITEMS.map(async (item) => {
          const key = `clay_oven_dish_image_${item.id}`;
          try {
            const res = await fetch(`/api/settings/images/${key}`);
            if (res.ok) {
              const data = await res.json();
              return { key, value: data.value };
            }
          } catch {}
          return null;
        });
        const results = await Promise.all(imagePromises);
        const images: Record<string, string> = {};
        results.forEach(r => { if (r) images[r.key] = r.value; });
        setDishImages(images);
      } catch (err) {
        console.error(err);
      }
    };
    fetchDishImages();
  }, []);

  // Filter items
  const filteredItems = MENU_ITEMS.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesVeg = !vegetarianFilter || item.isVeg;
    return matchesSearch && matchesCategory && matchesVeg;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 space-y-12 animate-fade-in" id="menu-view">
      
      {/* Title & Introduction */}
      <div className="text-center max-w-2xl mx-auto pt-6 sm:pt-8 space-y-3">
        <span className="text-xs tracking-widest text-brand-accent uppercase font-bold px-2.5 py-1 bg-brand-dark/5 rounded-full inline-block">
          THE BOOKLET
        </span>
        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-brand-dark">Our Traditional Menu</h1>
        <p className="text-xs sm:text-sm text-brand-muted leading-relaxed font-normal">
          Everything prepared freshly in-house. Standard main dishes are served with authentic basmati rice or fresh naans baked immediately in our high-fire clay oven.
        </p>
      </div>

      {/* Filter and Search Bar Assembly */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4">
        
        {/* Search */}
        <div className="lg:col-span-4 relative">
          <label htmlFor="menu-search-input" className="sr-only">Search dishes...</label>
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
          <input
            id="menu-search-input"
            type="text"
            placeholder="Search dishes (e.g. Biryani)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm bg-brand-dark/[0.03] focus:bg-white focus:ring-2 focus:ring-brand-accent/20 outline-none placeholder:text-brand-muted/70 rounded-xl transition-all"
          />
        </div>

        {/* Veg Flag Toggle */}
        <div className="lg:col-span-3 flex items-center justify-start lg:justify-center">
          <label className="flex items-center space-x-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={vegetarianFilter}
              onChange={(e) => setVegetarianFilter(e.target.checked)}
              className="w-4 h-4 text-brand-accent focus:ring-0 rounded-md accent-brand-accent"
            />
            <span className="text-xs sm:text-sm text-brand-dark tracking-wider font-semibold">VEGETARIAN ONLY</span>
          </label>
        </div>

        {/* Allergen Toggle */}
        <div className="lg:col-span-5 flex items-center justify-end">
          <button
            type="button"
            id="toggle-allergens-key-btn"
            onClick={() => setShowAllergensKey(!showAllergensKey)}
            className="w-full lg:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-brand-dark/5 hover:bg-brand-dark text-brand-dark hover:text-white transition-all text-xs sm:text-sm tracking-wider font-semibold rounded-xl active:scale-95"
          >
            <Info className="w-3.5 h-3.5" />
            <span>{showAllergensKey ? 'HIDE ALLERGEN LEGEND' : 'SHOW ALLERGEN LEGEND'}</span>
          </button>
        </div>
      </div>

      {/* Allergens Information Drawer (In-line layout) */}
      {showAllergensKey && (
        <div id="allergens-legend-drawer" className="bg-white rounded-2xl p-5 sm:p-6 space-y-4 animate-fade-in shadow-sm">
          <h3 className="text-xs font-bold text-brand-accent tracking-widest uppercase">
            REGULATORY ALLERGEN CHART KEYS
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-xs text-brand-muted">
            {ALLERGENS.map((all) => (
              <div key={all.index} className="flex items-center space-x-2 p-2 bg-brand-dark/[0.03] rounded-xl">
                <span className="bg-brand-dark text-white w-4 h-4 text-[10px] flex items-center justify-center font-bold rounded-md">
                  {all.index}
                </span>
                <span className="font-medium text-brand-dark truncate">{all.name}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-brand-muted italic leading-relaxed font-normal">
            * Please inform our floor service or kitchen team during table layout booking or order checkout if you have extreme allergy requirements.
          </p>
        </div>
      )}

      {/* Category Scroll Segment tabs */}
      <div className="flex overflow-x-auto pb-1 scrollbar-none gap-2 px-1">
        <button
          type="button"
          id="category-tab-all"
          onClick={() => setSelectedCategory('All')}
          className={`px-5 py-2.5 text-xs tracking-wider whitespace-nowrap uppercase transition-all rounded-full font-bold active:scale-95 ${
            selectedCategory === 'All'
              ? 'bg-brand-dark text-white shadow-sm'
              : 'bg-white text-brand-muted hover:text-brand-dark hover:bg-brand-dark/5 shadow-xs'
          }`}
        >
          ALL CATEGORIES
        </button>
        {CATEGORIES.map((cat) => (
          <button
            type="button"
            id={`category-tab-${cat.replace(/\s+/g, '-').toLowerCase()}`}
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-5 py-2.5 text-xs tracking-wider whitespace-nowrap uppercase transition-all rounded-full font-bold active:scale-95 ${
              selectedCategory === cat
                ? 'bg-brand-dark text-white shadow-sm'
                : 'bg-white text-brand-muted hover:text-brand-dark hover:bg-brand-dark/5 shadow-xs'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Menu items display row */}
      {filteredItems.length === 0 ? (
        <div id="no-menu-items-alert" className="text-center py-16 bg-white rounded-2xl shadow-sm">
          <HelpCircle className="w-8 h-8 text-brand-muted mx-auto mb-3" />
          <p className="text-xs sm:text-sm font-semibold text-brand-muted">NO ITEMS MATCHED YOUR SEARCH OR CHOSEN FILTER.</p>
        </div>
      ) : (
        <div id="filtered-items-grid" className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {filteredItems.map((item) => (
            <div 
              key={item.id} 
              className="bg-white p-5 sm:p-7 rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] flex flex-col justify-between transition-all space-y-3"
            >
              {dishImages[`clay_oven_dish_image_${item.id}`] && (
                <div className="w-full h-48 mb-2 rounded-xl bg-brand-beige/5 overflow-hidden">
                  <img
                    src={dishImages[`clay_oven_dish_image_${item.id}`]}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="space-y-2">
                
                {/* Header item */}
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-base sm:text-lg font-bold text-brand-dark flex items-center gap-1.5 leading-snug">
                    {item.name}
                    {item.isVeg && (
                      <span className="w-2 h-2 bg-emerald-500 inline-block rounded-full ring-2 ring-emerald-100" title="Vegetarian Available"></span>
                    )}
                  </h3>
                  <span className="text-sm sm:text-base font-extrabold text-brand-dark text-right tracking-wider shrink-0">
                    &euro;{item.price.toFixed(2)}
                  </span>
                </div>

                {/* Sizes option representation */}
                {item.sizeOptions && (
                  <div className="flex items-center space-x-2 py-0.5 flex-wrap gap-y-1">
                    <span className="text-xs text-brand-accent uppercase tracking-wider font-bold">SIZES:</span>
                    {item.sizeOptions.map((opt) => (
                      <span key={opt.name} className="text-xs bg-brand-dark/5 px-2 py-0.5 rounded-md font-semibold text-brand-dark">
                        {opt.name} (&euro;{opt.price.toFixed(2)})
                      </span>
                    ))}
                  </div>
                )}

                {/* Description info */}
                {item.description && (
                  <p className="text-xs sm:text-sm text-brand-muted leading-relaxed font-normal">
                    {item.description}
                  </p>
                )}

              </div>

              {/* Footer item: Allergens list */}
              {item.allergens && item.allergens.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-brand-dark/5 flex items-center space-x-2">
                  <span className="text-xs text-brand-muted uppercase tracking-wider font-semibold">ALLERGENS:</span>
                  <div className="flex space-x-1">
                    {item.allergens.map((algIndex) => {
                      const allergenName = ALLERGENS.find((a) => a.index === algIndex)?.name || '';
                      return (
                        <span 
                          key={algIndex} 
                          title={allergenName}
                          className="bg-brand-dark text-white w-4 h-4 text-[10px] font-bold flex items-center justify-center cursor-help rounded-md"
                        >
                          {algIndex}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

            </div>
          ))}
        </div>
      )}

      {/* Back to Order Takeaway Banner Callout */}
      <div className="bg-brand-dark text-brand-beige p-8 lg:p-12 border border-brand-dark/15 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="font-serif text-xl sm:text-2xl font-bold tracking-tight">Craving some fresh clay-oven grills?</h3>
          <p className="text-sm text-brand-beige/70 font-normal">
            Skip the delay, place your takeaway or local delivery order instantly via our stateful online portal.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            // Smoothly route to takeaway order tab
            const orderTab = document.getElementById('nav-item-desktop-takeaway');
            if (orderTab) orderTab.click();
          }}
          className="bg-brand-accent text-white hover:bg-brand-beige hover:text-brand-dark border border-transparent font-mono text-sm font-bold tracking-widest px-8 py-4 transition-all duration-200 uppercase rounded-none"
        >
          START AN ORDER
        </button>
      </div>

    </div>
  );
};
