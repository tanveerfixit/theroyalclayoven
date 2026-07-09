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
      <div className="text-center max-w-2xl mx-auto pt-8 space-y-4">
        <span className="font-mono text-sm tracking-widest text-brand-accent uppercase font-bold px-2 py-1 bg-brand-dark/5 inline-block">
          THE BOOKLET
        </span>
        <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-brand-dark">Our Traditional Menu</h1>
        <p className="text-sm sm:text-base text-brand-muted leading-relaxed font-normal">
          Everything prepared freshly in-house. Standard main dishes are served with authentic basmati rice or fresh naans baked immediately in our high-fire clay oven.
        </p>
      </div>

      {/* Filter and Search Bar Assembly */}
      <div className="border border-brand-dark/10 bg-white p-6 grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* Search */}
        <div className="lg:col-span-4 relative">
          <label htmlFor="menu-search-input" className="sr-only">Search dishes...</label>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
          <input
            id="menu-search-input"
            type="text"
            placeholder="Search dishes (e.g. Biryani)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm font-mono border border-brand-dark/10 focus:border-brand-dark focus:ring-0 outline-none placeholder:text-brand-muted/70 rounded-none bg-brand-beige/20"
          />
        </div>

        {/* Veg Flag Toggle */}
        <div className="lg:col-span-3 flex items-center justify-start lg:justify-center">
          <label className="flex items-center space-x-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={vegetarianFilter}
              onChange={(e) => setVegetarianFilter(e.target.checked)}
              className="w-4 h-4 text-brand-accent focus:ring-0 rounded-none accent-brand-accent border-brand-dark/10"
            />
            <span className="font-mono text-sm text-brand-dark tracking-wider font-medium">VEGETARIAN ONLY</span>
          </label>
        </div>

        {/* Allergen Toggle */}
        <div className="lg:col-span-5 flex items-center justify-end">
          <button
            type="button"
            id="toggle-allergens-key-btn"
            onClick={() => setShowAllergensKey(!showAllergensKey)}
            className="w-full lg:w-auto inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-brand-dark/5 hover:bg-brand-dark text-brand-dark hover:text-white transition-all font-mono text-sm tracking-wider font-medium border border-brand-dark/10 rounded-none"
          >
            <Info className="w-3.5 h-3.5" />
            <span>{showAllergensKey ? 'HIDE ALLERGEN LEGEND' : 'SHOW ALLERGEN LEGEND'}</span>
          </button>
        </div>
      </div>

      {/* Allergens Information Drawer (In-line layout) */}
      {showAllergensKey && (
        <div id="allergens-legend-drawer" className="bg-white border border-brand-accent/30 p-6 space-y-4 animate-fade-in">
          <h3 className="font-mono text-sm font-bold text-brand-accent tracking-widest uppercase">
            REGULATORY ALLERGEN CHART KEYS
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-sm font-mono text-brand-muted">
            {ALLERGENS.map((all) => (
              <div key={all.index} className="flex items-center space-x-2 border border-brand-dark/5 p-2 bg-brand-beige">
                <span className="bg-brand-dark text-white w-4 h-4 text-xs flex items-center justify-center font-bold">
                  {all.index}
                </span>
                <span className="font-medium text-brand-dark truncate">{all.name}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-brand-muted italic leading-relaxed font-normal">
            * Please inform our floor service or kitchen team during table layout booking or order checkout if you have extreme allergy requirements.
          </p>
        </div>
      )}

      {/* Category Scroll Segment tabs */}
      <div className="border-b border-brand-dark/10 flex overflow-x-auto pb-px scrollbar-none">
        <button
          type="button"
          id="category-tab-all"
          onClick={() => setSelectedCategory('All')}
          className={`px-6 py-4 text-sm font-mono tracking-wider space-x-2 whitespace-nowrap border-b-2 uppercase transition-all duration-150 ${
            selectedCategory === 'All'
              ? 'border-brand-dark font-bold text-brand-dark'
              : 'border-transparent text-brand-muted hover:text-brand-dark'
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
            className={`px-6 py-4 text-sm font-mono tracking-wider whitespace-nowrap border-b-2 uppercase transition-all duration-150 ${
              selectedCategory === cat
                ? 'border-brand-dark font-bold text-brand-dark'
                : 'border-transparent text-brand-muted hover:text-brand-dark'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Menu items display row */}
      {filteredItems.length === 0 ? (
        <div id="no-menu-items-alert" className="text-center py-20 border border-dashed border-brand-dark/15">
          <HelpCircle className="w-8 h-8 text-brand-muted mx-auto mb-3" />
          <p className="font-mono text-sm text-brand-muted">NO ITEMS MATCHED YOUR SEARCH OR CHOSEN FILTER.</p>
        </div>
      ) : (
        <div id="filtered-items-grid" className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {filteredItems.map((item) => (
            <div 
              key={item.id} 
              className="bg-white p-6 sm:p-8 border border-brand-dark/15 flex flex-col justify-between hover:border-brand-dark/40 transition-colors bg-gradient-to-br from-white to-brand-beige/10"
            >
              {dishImages[`clay_oven_dish_image_${item.id}`] && (
                <div className="w-full h-48 mb-4 border border-brand-dark/10 bg-brand-beige/5 overflow-hidden">
                  <img
                    src={dishImages[`clay_oven_dish_image_${item.id}`]}
                    alt={item.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
              <div className="space-y-3">
                
                {/* Header item */}
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-serif text-lg font-bold text-brand-dark flex items-center gap-2">
                    {item.name}
                    {item.isVeg && (
                      <span className="w-2 h-2 bg-emerald-600 inline-block rounded-none ring-2 ring-emerald-100" title="Vegetarian Available"></span>
                    )}
                  </h3>
                  <div className="h-px bg-dotted flex-grow border-b border-brand-dark/10 max-w-xs hidden sm:block"></div>
                  <span className="font-mono text-sm font-bold text-brand-dark text-right tracking-wider">
                    &euro;{item.price.toFixed(2)}
                  </span>
                </div>

                {/* Sizes option representation */}
                {item.sizeOptions && (
                  <div className="flex items-center space-x-2 py-0.5">
                    <span className="font-mono text-xs text-brand-muted uppercase tracking-wider">SIZES:</span>
                    {item.sizeOptions.map((opt) => (
                      <span key={opt.name} className="font-mono text-xs bg-brand-dark/5 px-1.5 py-0.5 border border-brand-dark/5 text-brand-dark">
                        {opt.name} (&euro;{opt.price.toFixed(2)})
                      </span>
                    ))}
                  </div>
                )}

                {/* Description info */}
                {item.description && (
                  <p className="text-sm text-brand-muted leading-relaxed font-normal">
                    {item.description}
                  </p>
                )}

              </div>

              {/* Footer item: Allergens list */}
              {item.allergens && item.allergens.length > 0 && (
                <div className="mt-4 pt-3 border-t border-brand-dark/5 flex items-center space-x-2">
                  <span className="font-mono text-xs text-brand-muted uppercase tracking-wider">ALLERGENS:</span>
                  <div className="flex space-x-1">
                    {item.allergens.map((algIndex) => {
                      const allergenName = ALLERGENS.find((a) => a.index === algIndex)?.name || '';
                      return (
                        <span 
                          key={algIndex} 
                          title={allergenName}
                          className="bg-brand-dark text-brand-beige w-4 h-4 text-[8px] font-mono font-bold flex items-center justify-center cursor-help rounded-none"
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
