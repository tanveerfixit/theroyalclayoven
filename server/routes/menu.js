import express from 'express';
import pool from '../db/pool.js';
import { menuCatalogCache, menuCatalogCacheTime, MENU_CATALOG_CACHE_TTL, setMenuCatalogCache } from '../cache/index.js';

const router = express.Router();

router.get('/api/menu/full', async (req, res) => {
  const now = Date.now();
  if (menuCatalogCache && (now - menuCatalogCacheTime) < MENU_CATALOG_CACHE_TTL) {
    return res.json(menuCatalogCache);
  }

  try {
    const [categories] = await pool.query(`
      SELECT id, name, slug, description, display_order, is_active, image_url
      FROM menu_categories
      ORDER BY display_order ASC, id ASC
    `);

    const [catOptLinks] = await pool.query(`
      SELECT category_id, group_id, display_order
      FROM category_option_groups
      ORDER BY display_order ASC
    `);

    const catOptMap = {};
    catOptLinks.forEach(link => {
      if (!catOptMap[link.category_id]) catOptMap[link.category_id] = [];
      catOptMap[link.category_id].push(link.group_id);
    });

    const enrichedCategories = categories.map(c => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description || '',
      displayOrder: c.display_order,
      isActive: Boolean(c.is_active),
      imageUrl: c.image_url || '',
      optionGroupIds: catOptMap[c.id] || []
    }));

    const [products] = await pool.query(`
      SELECT p.id, p.category_id, p.name, p.description, p.base_price, p.is_veg, 
             p.is_active, p.is_sold_out, p.allergens, p.size_options, p.image_url, p.display_order,
             c.name as category_name
      FROM menu_products p
      JOIN menu_categories c ON p.category_id = c.id
      ORDER BY p.display_order ASC, p.id ASC
    `);

    const [prodOptLinks] = await pool.query(`
      SELECT product_id, group_id, display_order
      FROM product_option_groups
      ORDER BY display_order ASC
    `);

    const prodOptMap = {};
    prodOptLinks.forEach(link => {
      if (!prodOptMap[link.product_id]) prodOptMap[link.product_id] = [];
      prodOptMap[link.product_id].push(link.group_id);
    });

    const enrichedProducts = products.map(p => {
      let allergens = [];
      try {
        allergens = typeof p.allergens === 'string' ? JSON.parse(p.allergens) : (p.allergens || []);
      } catch (e) {}

      let sizeOptions = undefined;
      try {
        if (p.size_options) {
          sizeOptions = typeof p.size_options === 'string' ? JSON.parse(p.size_options) : p.size_options;
        }
      } catch (e) {}

      return {
        id: p.id,
        categoryId: p.category_id,
        category: p.category_name,
        name: p.name,
        description: p.description || '',
        price: parseFloat(p.base_price),
        isVeg: Boolean(p.is_veg),
        isActive: Boolean(p.is_active),
        isSoldOut: Boolean(p.is_sold_out),
        allergens: allergens,
        sizeOptions: sizeOptions && sizeOptions.length > 0 ? sizeOptions : undefined,
        imageUrl: p.image_url || '',
        displayOrder: p.display_order,
        optionGroupIds: prodOptMap[p.id] || []
      };
    });

    const [groups] = await pool.query(`
      SELECT id, title, min_selection, max_selection, is_active
      FROM option_groups
      ORDER BY id ASC
    `);

    const [items] = await pool.query(`
      SELECT id, group_id, name, price_modifier, is_default, display_order
      FROM option_items
      ORDER BY display_order ASC, id ASC
    `);

    const groupItemsMap = {};
    items.forEach(it => {
      if (!groupItemsMap[it.group_id]) groupItemsMap[it.group_id] = [];
      groupItemsMap[it.group_id].push({
        id: it.id,
        groupId: it.group_id,
        name: it.name,
        priceModifier: parseFloat(it.price_modifier),
        isDefault: Boolean(it.is_default),
        displayOrder: it.display_order
      });
    });

    const enrichedGroups = groups.map(g => ({
      id: g.id,
      title: g.title,
      minSelection: g.min_selection,
      maxSelection: g.max_selection,
      isActive: Boolean(g.is_active),
      options: groupItemsMap[g.id] || []
    }));

    const [deals] = await pool.query(`
      SELECT id, title, description, bundle_price, badge_text, is_active, image_url, steps
      FROM menu_deals
      ORDER BY id ASC
    `);

    const enrichedDeals = deals.map(d => {
      let steps = [];
      try {
        steps = typeof d.steps === 'string' ? JSON.parse(d.steps) : (d.steps || []);
      } catch (e) {}
      return {
        id: d.id,
        title: d.title,
        description: d.description || '',
        bundlePrice: parseFloat(d.bundle_price),
        badgeText: d.badge_text || '',
        isActive: Boolean(d.is_active),
        imageUrl: d.image_url || '',
        steps: steps
      };
    });

    const result = {
      categories: enrichedCategories,
      products: enrichedProducts,
      optionGroups: enrichedGroups,
      deals: enrichedDeals
    };

    setMenuCatalogCache(result, now);
    res.json(result);
  } catch (error) {
    console.error('Failed to fetch full menu catalog:', error);
    res.status(500).json({ error: 'Database query failed' });
  }
});

export default router;
