import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CATEGORIES as SEED_CATEGORIES, MENU_ITEMS as SEED_MENU_ITEMS } from '../../src/data/menuData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createIndexIfNotExists(connection, tableName, indexName, columnsSql) {
  try {
    const [existing] = await connection.query(`
      SELECT 1 FROM information_schema.statistics 
      WHERE table_schema = DATABASE() 
        AND table_name = ? 
        AND index_name = ? 
      LIMIT 1
    `, [tableName, indexName]);
    
    if (existing.length === 0) {
      await connection.query(`CREATE INDEX ${indexName} ON ${tableName} (${columnsSql})`);
      console.log(`Created index ${indexName} on ${tableName}`);
    }
  } catch (err) {
    console.warn(`Index verification for ${indexName} on ${tableName}:`, err.message);
  }
}

const TARGET_SCHEMA_VERSION = 4;

export async function runMigrations(pool) {
  try {
    const connection = await pool.getConnection();
    console.log('Database pool initialized successfully. Connected to Hostinger MariaDB/MySQL.');
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS _schema_migrations (
        version INT PRIMARY KEY,
        applied_at DATETIME NOT NULL
      )
    `);

    const [verRows] = await connection.query('SELECT version FROM _schema_migrations ORDER BY version DESC LIMIT 1');
    const currentVersion = verRows.length > 0 ? verRows[0].version : 0;

    if (currentVersion >= TARGET_SCHEMA_VERSION) {
      console.log(`Database schema verified (version ${currentVersion}). Bypassing redundant DDL metadata checks.`);
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      connection.release();
      return;
    }

    console.log(`Applying non-destructive database migrations (current: v${currentVersion} -> target: v${TARGET_SCHEMA_VERSION})...`);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        email VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        picture VARCHAR(500),
        phone VARCHAR(50),
        eircode VARCHAR(50),
        address TEXT,
        dietaryPreferences VARCHAR(500),
        password VARCHAR(255)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS password_reset_otps (
        email VARCHAR(255) PRIMARY KEY,
        otp VARCHAR(10) NOT NULL,
        expires_at DATETIME NOT NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        partySize INT NOT NULL,
        date VARCHAR(100) NOT NULL,
        time VARCHAR(100) NOT NULL,
        diningArea VARCHAR(100) NOT NULL,
        specialRequests TEXT,
        status VARCHAR(50) NOT NULL,
        createdAt VARCHAR(100) NOT NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR(100) PRIMARY KEY,
        items TEXT NOT NULL,
        packagingFee DECIMAL(10,2) NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        serviceType VARCHAR(50) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        customer_email VARCHAR(255) NOT NULL,
        customer_phone VARCHAR(50) NOT NULL,
        customer_address TEXT,
        preferredTime VARCHAR(100) NOT NULL,
        notes TEXT,
        status VARCHAR(50) NOT NULL,
        is_archived INT DEFAULT 0,
        createdAt VARCHAR(100) NOT NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS smtp_settings (
        id INT PRIMARY KEY AUTO_INCREMENT,
        host VARCHAR(255) NOT NULL,
        port INT NOT NULL,
        secure VARCHAR(10) NOT NULL,
        user VARCHAR(255) NOT NULL,
        password VARCHAR(255) NOT NULL
      )
    `);

    const [smtpRows] = await connection.query('SELECT * FROM smtp_settings LIMIT 1');
    if (smtpRows.length === 0) {
      await connection.query(`
        INSERT INTO smtp_settings (host, port, secure, user, password)
        VALUES (?, ?, ?, ?, ?)
      `, [
        process.env.SMTP_HOST || 'smtp.gmail.com',
        parseInt(process.env.SMTP_PORT || '465'),
        process.env.SMTP_SECURE || 'true',
        process.env.SMTP_USER || '',
        process.env.SMTP_PASS || ''
      ]);
    } else if (
      (process.env.SMTP_USER && smtpRows[0].user !== process.env.SMTP_USER) ||
      (process.env.SMTP_PASS && smtpRows[0].password !== process.env.SMTP_PASS) ||
      (process.env.SMTP_HOST && smtpRows[0].host !== process.env.SMTP_HOST)
    ) {
      await connection.query(`
        UPDATE smtp_settings 
        SET host = ?, port = ?, secure = ?, user = ?, password = ?
        WHERE id = ?
      `, [
        process.env.SMTP_HOST || 'smtp.gmail.com',
        parseInt(process.env.SMTP_PORT || '465'),
        process.env.SMTP_SECURE || 'true',
        process.env.SMTP_USER,
        process.env.SMTP_PASS || '',
        smtpRows[0].id
      ]);
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS store_settings (
        setting_key VARCHAR(255) PRIMARY KEY,
        setting_value LONGTEXT NOT NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS business_info (
        id INT PRIMARY KEY AUTO_INCREMENT,
        business_name VARCHAR(255) NOT NULL,
        address VARCHAR(500) NOT NULL,
        maps_url VARCHAR(500) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        mobile VARCHAR(50) NOT NULL,
        whatsapp VARCHAR(50) NOT NULL,
        email VARCHAR(255) NOT NULL
      )
    `);

    const [bizRows] = await connection.query('SELECT * FROM business_info LIMIT 1');
    if (bizRows.length === 0) {
      await connection.query(`
        INSERT INTO business_info (business_name, address, maps_url, phone, mobile, whatsapp, email)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        'THE ROYAL CLAY OVEN',
        'Ballycasey Craft And Design Center, Shannon, County Clare V14 AW71',
        'https://maps.google.com/?q=The+Royal+Clay+Oven+Ballycasey+Craft+And+Design+Center+Shannon+County+Clare+V14+AW71',
        '061 703 513',
        '086 020 3720',
        '086 020 3720',
        'sales@clayoven.ie'
      ]);
    } else {
      const current = bizRows[0];
      if (current.phone === '086 020 3720' && current.mobile === '089 489 9950') {
        await connection.query(`
          UPDATE business_info 
          SET phone = ?, mobile = ?, whatsapp = ?
          WHERE id = ?
        `, ['061 703 513', '086 020 3720', '086 020 3720', current.id]);
      }
    }

    try {
      await connection.query('ALTER TABLE store_settings MODIFY COLUMN setting_value LONGTEXT NOT NULL');
    } catch (alterErr) {}

    try {
      await connection.query('ALTER TABLE orders ADD COLUMN cancellation_reason TEXT');
    } catch (e) {}
    try {
      await connection.query('ALTER TABLE orders ADD COLUMN admin_notes TEXT');
    } catch (e) {}

    await createIndexIfNotExists(connection, 'orders', 'idx_orders_customer_email_created', 'customer_email, createdAt');
    await createIndexIfNotExists(connection, 'orders', 'idx_orders_created_at', 'createdAt');
    await createIndexIfNotExists(connection, 'orders', 'idx_orders_status', 'status');
    await createIndexIfNotExists(connection, 'orders', 'idx_orders_is_archived', 'is_archived');
    await createIndexIfNotExists(connection, 'bookings', 'idx_bookings_email_created', 'email, createdAt');
    await createIndexIfNotExists(connection, 'bookings', 'idx_bookings_date_time', 'date, time');
    await createIndexIfNotExists(connection, 'bookings', 'idx_bookings_status', 'status');
    await createIndexIfNotExists(connection, 'admin_otps', 'idx_admin_otps_expires', 'expires_at');
    await createIndexIfNotExists(connection, 'password_reset_otps', 'idx_password_reset_expires', 'expires_at');

    const defaultSettings = {
      'clay_oven_timing_monday': '4:00 PM - 9:00 PM',
      'clay_oven_timing_tuesday': '4:00 PM - 9:00 PM',
      'clay_oven_timing_wednesday': '4:00 PM - 9:00 PM',
      'clay_oven_timing_thursday': '4:00 PM - 9:00 PM',
      'clay_oven_timing_friday': '4:00 PM - 9:00 PM',
      'clay_oven_timing_saturday': '12:00 PM - 9:00 PM',
      'clay_oven_timing_sunday': '10:00 AM - 6:00 PM',
      'clay_oven_timing_offset': 'KITCHEN CLOSES 15 MINS PRIOR',
      'clay_oven_notice_text': 'We are Still Working on Website, for online order please contact.',
      'clay_oven_notice_phone': '089 489 9950',
      'clay_oven_notice_enabled': 'true',
      'clay_oven_booking_notice_text': `Assalamu Alaikum, dear friends and valued guests,

We are incredibly grateful for the wonderful love and support you show us every single day!

While we would love nothing more than to celebrate Eid with all of you, we want to share that our restaurant is now completely fully booked for Eid this Wednesday.

To ensure that everyone dining with us has a fantastic experience, we are unfortunately unable to accept any further bookings or walk-ins for that day.

While we truly wish we could host every one of you on Wednesday, we would be absolutely delighted to welcome you, your family, and your friends on Thursday instead! Please do book a table with us so we can celebrate together then.

To bring a little extra joy to your week, we have some exciting news!

Due to popular demand, we are extending our special Pakistani breakfast service. You can now come and enjoy it with us on both Saturday and Sunday, rather than just on Sundays!

Thank you from the bottom of our hearts for your understanding and continuous support. We cannot wait to see your smiling faces soon!

Warmest regards,

The Royal Clay Oven`,
      'clay_oven_booking_notice_enabled': 'true',
      'clay_oven_takeaway_enabled': 'true',
      'clay_oven_takeaway_notice': 'We are temporarily not taking online orders. Please phone us to order directly!',
      'clay_oven_reservations_enabled': 'true',
      'clay_oven_reservations_notice': 'Table reservations are temporarily closed. Please telephone us to book a table!',
      'clay_oven_festive_enabled': 'true',
      'clay_oven_festive_header': 'Pakistan Day',
      'clay_oven_festive_subheader': 'Pakistan day platter',
      'clay_oven_festive_description': 'The actual platter',
      'clay_oven_festive_price': '60.00',
      'clay_oven_festive_price_label': 'FOR 2 PEOPLE:',
      'clay_oven_festive_items': `green chicken Karhai | Pakistani Specialty
green tikka boti | Grilled Boneless Chicken
Coriander naan | Tandoor Baked Flatbread
lamb Biryani | Fragrant Basmati Rice Dish
Pista falooda | Traditional Dessert
Complimentary green tea | Beverage`,
      'clay_oven_image_hero_bg': 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1600&q=80',
      'clay_oven_image_heritage_left': 'https://images.unsplash.com/photo-1627308595229-7830a5c91f9f?auto=format&fit=crop&w=600&q=80',
      'clay_oven_image_heritage_right': 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?auto=format&fit=crop&w=600&q=80',
      'clay_oven_takeaway_charges': '0.95',
      'clay_oven_delivery_charges': '3.00',
      'clay_oven_delivery_schedule': JSON.stringify({
        slot_interval_minutes: 30,
        lead_time_minutes: 45,
        advance_days: 7,
        schedule: {
          monday:    { active: false, start: '17:00', end: '21:00' },
          tuesday:   { active: false, start: '17:00', end: '21:00' },
          wednesday: { active: false, start: '17:00', end: '21:00' },
          thursday:  { active: true,  start: '16:30', end: '21:00' },
          friday:    { active: true,  start: '16:30', end: '21:00' },
          saturday:  { active: true,  start: '12:00', end: '21:00' },
          sunday:    { active: true,  start: '13:00', end: '18:00' }
        }
      })
    };

    for (const [key, value] of Object.entries(defaultSettings)) {
      await connection.query(`
        INSERT INTO store_settings (setting_key, setting_value)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE setting_value = setting_value
      `, [key, value]);
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS admin_emails (
        email VARCHAR(255) PRIMARY KEY
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS admin_otps (
        email VARCHAR(255) PRIMARY KEY,
        otp VARCHAR(255) NOT NULL,
        expires_at DATETIME NOT NULL
      )
    `);

    try {
      await connection.query('ALTER TABLE admin_otps MODIFY COLUMN otp VARCHAR(255) NOT NULL');
    } catch (e) {}

    const adminSeedEmails = (process.env.ADMIN_SEED_EMAILS || '')
      .split(',').map(e => e.trim()).filter(Boolean);
    for (const adminEmail of adminSeedEmails) {
      await connection.query(
        'INSERT IGNORE INTO admin_emails (email) VALUES (?)',
        [adminEmail]
      );
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS order_notification_emails (
        email VARCHAR(255) PRIMARY KEY
      )
    `);

    const [existingNotifs] = await connection.query('SELECT COUNT(*) as count FROM order_notification_emails');
    if (existingNotifs[0].count === 0) {
      const notifSeedEmails = (process.env.NOTIFICATION_FALLBACK_EMAILS || '')
        .split(',').map(e => e.trim()).filter(Boolean);
      for (const notifEmail of notifSeedEmails) {
        await connection.query(
          'INSERT IGNORE INTO order_notification_emails (email) VALUES (?)',
          [notifEmail]
        );
      }
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS menu_categories (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        slug VARCHAR(100) UNIQUE NOT NULL,
        description TEXT,
        display_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT TRUE,
        image_url MEDIUMTEXT
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS menu_products (
        id VARCHAR(100) PRIMARY KEY,
        category_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        base_price DECIMAL(10,2) NOT NULL,
        is_veg BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        is_sold_out BOOLEAN DEFAULT FALSE,
        allergens JSON,
        size_options JSON,
        image_url MEDIUMTEXT,
        display_order INT DEFAULT 0,
        FOREIGN KEY (category_id) REFERENCES menu_categories(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS option_groups (
        id INT PRIMARY KEY AUTO_INCREMENT,
        title VARCHAR(255) NOT NULL,
        min_selection INT DEFAULT 0,
        max_selection INT DEFAULT 1,
        is_active BOOLEAN DEFAULT TRUE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS option_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        group_id INT NOT NULL,
        name VARCHAR(255) NOT NULL,
        price_modifier DECIMAL(10,2) DEFAULT 0.00,
        is_default BOOLEAN DEFAULT FALSE,
        display_order INT DEFAULT 0,
        FOREIGN KEY (group_id) REFERENCES option_groups(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS category_option_groups (
        category_id INT NOT NULL,
        group_id INT NOT NULL,
        display_order INT DEFAULT 0,
        PRIMARY KEY (category_id, group_id),
        FOREIGN KEY (category_id) REFERENCES menu_categories(id) ON DELETE CASCADE,
        FOREIGN KEY (group_id) REFERENCES option_groups(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS product_option_groups (
        product_id VARCHAR(100) NOT NULL,
        group_id INT NOT NULL,
        display_order INT DEFAULT 0,
        PRIMARY KEY (product_id, group_id),
        FOREIGN KEY (product_id) REFERENCES menu_products(id) ON DELETE CASCADE,
        FOREIGN KEY (group_id) REFERENCES option_groups(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS menu_deals (
        id VARCHAR(100) PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        bundle_price DECIMAL(10,2) NOT NULL,
        badge_text VARCHAR(50),
        is_active BOOLEAN DEFAULT TRUE,
        image_url MEDIUMTEXT,
        steps JSON
      )
    `);

    try {
      await connection.query('ALTER TABLE menu_products MODIFY COLUMN image_url MEDIUMTEXT');
      await connection.query('ALTER TABLE menu_categories MODIFY COLUMN image_url MEDIUMTEXT');
      await connection.query('ALTER TABLE menu_deals MODIFY COLUMN image_url MEDIUMTEXT');
    } catch (e) {}

    await createIndexIfNotExists(connection, 'menu_products', 'idx_menu_products_cat_active', 'category_id, is_active');
    await createIndexIfNotExists(connection, 'option_items', 'idx_option_items_group_order', 'group_id, display_order');

    const [existingCategories] = await connection.query('SELECT COUNT(*) as count FROM menu_categories');
    const categoryMap = {};

    if (existingCategories[0].count === 0) {
      for (let i = 0; i < SEED_CATEGORIES.length; i++) {
        const catName = SEED_CATEGORIES[i];
        const slug = catName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        const [res] = await connection.query(`
          INSERT INTO menu_categories (name, slug, display_order, is_active)
          VALUES (?, ?, ?, TRUE)
        `, [catName, slug, i + 1]);
        categoryMap[catName] = res.insertId;
      }
    } else {
      const [allCats] = await connection.query('SELECT id, name FROM menu_categories');
      allCats.forEach(c => { categoryMap[c.name] = c.id; });
    }

    const [existingProducts] = await connection.query('SELECT COUNT(*) as count FROM menu_products');
    if (existingProducts[0].count === 0) {
      for (let i = 0; i < SEED_MENU_ITEMS.length; i++) {
        const item = SEED_MENU_ITEMS[i];
        const catId = categoryMap[item.category];
        if (catId) {
          await connection.query(`
            INSERT INTO menu_products (id, category_id, name, description, base_price, is_veg, is_active, is_sold_out, allergens, size_options, display_order)
            VALUES (?, ?, ?, ?, ?, ?, TRUE, FALSE, ?, ?, ?)
          `, [
            item.id,
            catId,
            item.name,
            item.description || '',
            item.price,
            item.isVeg ? true : false,
            item.allergens ? JSON.stringify(item.allergens) : null,
            item.sizeOptions ? JSON.stringify(item.sizeOptions) : null,
            i + 1
          ]);
        }
      }
    }

    const [existingGroups] = await connection.query('SELECT COUNT(*) as count FROM option_groups');
    if (existingGroups[0].count === 0) {
      const [sideGrp] = await connection.query(`
        INSERT INTO option_groups (title, min_selection, max_selection, is_active)
        VALUES ('Included Free Side', 1, 1, TRUE)
      `);
      const sideGrpId = sideGrp.insertId;
      await connection.query(`
        INSERT INTO option_items (group_id, name, price_modifier, is_default, display_order)
        VALUES 
          (?, 'Naan Bread', 0.00, TRUE, 1),
          (?, 'White Rice', 0.00, FALSE, 2)
      `, [sideGrpId, sideGrpId]);

      const pakistaniCatId = categoryMap['Pakistani Cuisine'];
      if (pakistaniCatId) {
        await connection.query(`
          INSERT INTO category_option_groups (category_id, group_id, display_order)
          VALUES (?, ?, 1)
        `, [pakistaniCatId, sideGrpId]);
      }

      const [drinkGrp] = await connection.query(`
        INSERT INTO option_groups (title, min_selection, max_selection, is_active)
        VALUES ('Included Free Cold Drink', 1, 1, TRUE)
      `);
      const drinkGrpId = drinkGrp.insertId;
      await connection.query(`
        INSERT INTO option_items (group_id, name, price_modifier, is_default, display_order)
        VALUES 
          (?, 'Cola', 0.00, TRUE, 1),
          (?, 'Lemon & Lime', 0.00, FALSE, 2),
          (?, 'Orange Soft Drink', 0.00, FALSE, 3)
      `, [drinkGrpId, drinkGrpId, drinkGrpId]);

      const burgersCatId = categoryMap['Burgers'];
      const wrapsCatId = categoryMap['Wraps & Sandwiches'];
      if (burgersCatId) {
        await connection.query(`INSERT INTO category_option_groups (category_id, group_id, display_order) VALUES (?, ?, 1)`, [burgersCatId, drinkGrpId]);
      }
      if (wrapsCatId) {
        await connection.query(`INSERT INTO category_option_groups (category_id, group_id, display_order) VALUES (?, ?, 1)`, [wrapsCatId, drinkGrpId]);
      }

      const [dipsGrp] = await connection.query(`
        INSERT INTO option_groups (title, min_selection, max_selection, is_active)
        VALUES ('Extra Dips & Sauces', 0, 5, TRUE)
      `);
      const dipsGrpId = dipsGrp.insertId;
      await connection.query(`
        INSERT INTO option_items (group_id, name, price_modifier, is_default, display_order)
        VALUES 
          (?, 'Garlic Mayo', 1.50, FALSE, 1),
          (?, 'Mint Raita', 1.50, FALSE, 2),
          (?, 'Chilli Sauce', 1.50, FALSE, 3),
          (?, 'Sweet Chilli', 1.50, FALSE, 4),
          (?, 'BBQ Sauce', 1.50, FALSE, 5),
          (?, 'Peri-Peri Mayo', 1.50, FALSE, 6)
      `, [dipsGrpId, dipsGrpId, dipsGrpId, dipsGrpId, dipsGrpId, dipsGrpId]);
    }

    const uploadsDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    await connection.query(`
      INSERT INTO _schema_migrations (version, applied_at)
      VALUES (?, NOW())
      ON DUPLICATE KEY UPDATE applied_at = NOW()
    `, [TARGET_SCHEMA_VERSION]);

    connection.release();
  } catch (error) {
    console.error('Database connection or initialization failed:', error);
  }
}
