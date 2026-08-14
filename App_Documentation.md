# The Royal Clay Oven — Application Architecture & Pages Documentation

This document provides a highly detailed, component-by-component, and page-by-page specification of **The Royal Clay Oven** web application codebase.

---

## Restaurant Profile & Contact Information

- **Name**: THE ROYAL CLAY OVEN
- **Cuisine**: Authentic Pakistani & Indian Cuisine, Tandoori Clay Oven specialties, Charcoal Flame-grill Kebabs, and Pizzas.
- **Physical Address**: Ballycasey Craft And Design Center, Shannon, County Clare, V14 AW71
- **Landline Contact**: `061 703 513`
- **Mobile Contact**: `086 020 3720`
- **WhatsApp Contact**: `086 020 3720` or `089 489 9950`
- **Email Contact**: `sales@clayoven.ie`
- **Official Google Maps Link**: [The Royal Clay Oven on Google Maps](https://maps.google.com/?q=The+Royal+Clay+Oven+Ballycasey+Craft+And+Design+Center+Shannon+County+Clare+V14+AW71)

### Standard Operational Hours
- **Monday - Friday**: 4:00 PM - 9:00 PM
- **Saturday**: 12:00 PM - 9:00 PM
- **Sunday**: 10:00 AM - 6:00 PM
- *Note: Kitchen orders close 15 minutes prior to closing time.*

---

## 1. System Architecture & Tech Stack

### Frontend Core
- **Framework**: React 18+ with TypeScript (configured via Vite).
- **Styling**: Tailwind CSS for responsive utility styling, paired with custom theme extensions defined in `src/index.css`.
- **Icons**: Lucide React (`lucide-react`) for consistent, vector-based glyphs.
- **Animations**: Motion / React (`motion/react`) for transition physics and interactive micro-animations.
- **Dynamic Imports**: Lazy-loaded route panels (`React.lazy`) to minimize first-contentful paint bundles and improve load speeds.

### Backend Server (`server.js`)
- **Runtime**: Node.js with Express framework.
- **Database Layer**: MySQL (via `mysql2/promise` pool) with automatic schema initialization on startup.
- **Authentication**: JWT-based session tokens combined with `bcryptjs` password hashing and Google One Tap (OAuth2) identity integration.
- **Mailing Engine**: Nodemailer with dynamic SMTP parameters read directly from the database or falling back to environment variables.
- **Security & Compression**:
  - `helmet`: Enhances HTTP response headers for security against injection attacks.
  - `compression`: Gzip/Brotli compression for payload size optimization.
  - `express-rate-limit`: Rate limiting for authentication, OTP requests, and checkout actions.

---

## 2. Global Shell & Shared Systems (`src/App.tsx`)

### Tab-Based Routing (PopState Sync)
Rather than introducing heavy routing libraries, the application utilizes a lightweight path-synchronized tab system:
- **Tabs**: `home`, `menu`, `takeaway`, `booking`, `history`, `profile`, `admin`.
- **Sync Method**: Synchronizes browser URL changes using `window.history.pushState` and updates view states upon `popstate` events.
- **Dynamic SEO Handling**: Page meta-titles and descriptions are dynamically updated whenever the tab changes to optimize search index indexing.

### Global Shopping Cart
A global state-machine handles orders:
- **Data Model**: Structured as `CartItem` arrays, storing unique configurations derived from a hash of the menu item ID, size choice, and custom instructions notes.
- **Persistence**: Synchronized in real-time with `localStorage` (key: `clay_oven_active_cart`).
- **Sidebar Drawer**: Toggleable slide-out shopping cart listing selected items, item notes, quantities, subtotal calculations, packaging fees, and checkout prompts.

### Shared Layout Elements
- **Navbar (`components/Navbar.tsx`)**: Responsive, fixed header incorporating navigation anchors, visual indicator badge for the cart, dynamic auth avatar, and a mobile hamburger menu.
- **AuthModal (`components/AuthModal.tsx`)**: Responsive modal dialog containing email/password registration, login forms, password reset request mechanisms, and verification triggers.
- **CookieConsent (`components/CookieConsent.tsx`)**: Overlay banner prompting users to accept privacy policies, storing choices locally.
- **Floating Contact Panel**: Permanent buttons positioned in the bottom corner for immediate access to:
  - Phone Dialing (`tel:`)
  - WhatsApp Direct Chatting (`https://wa.me/`)
  - Location/Google Maps directions routing.

---

## 3. Detailed Page-by-Page Breakdown

### A. Home View (`src/components/HomeView.tsx`)
The public portal detailing restaurant heritage, location, operating hours, and current dynamic promotions.

- **Key UI Sections**:
  - **Hero Slider Banner**: Renders premium high-resolution background graphics loaded from server image uploads or local configurations.
  - **Dynamic Festive Offer Board**: Configurable panel showcasing special menus (e.g., Father's Day or Pakistan Day platters), displaying item details, customized headers, and action buttons to book/call.
  - **Interactive Timings Grid**: Real-time operating hours showcasing daily schedules, indicating whether the kitchen is open or closed based on system clocks.
  - **About/Heritage Showcase**: Two-column layout presenting authentic clay oven culinary stories.
- **State Properties**:
  - `weeklyTimings`, `noticeText`, `noticePhone`, `noticeEnabled`.
  - `festiveEnabled`, `festiveHeader`, `festiveSubheader`, `festiveDescription`, `festivePrice`, `festivePriceLabel`, `festiveItemsRaw`.
- **API Dependencies**:
  - `GET /api/business-info` - Fetch public restaurant address and phone contacts.
  - `GET /api/settings` - Fetch active notice text, festive promotions, and timings.

---

### B. Menu View (`src/components/MenuView.tsx`)
A digital booklet replicating the traditional restaurant menu card.

- **Key UI Sections**:
  - **Filter Ribbons**: Horizontal button list dividing items by categories (e.g., Starters, Clay Oven Tandoori, Curries, Biryanis, Pizzas, Desserts).
  - **Allergen Indicators**: Legend showcasing numeric indicators for common allergens (1: Gluten, 2: Milk, 3: Nuts, etc.) matching item tags.
  - **Visual Menu Cards**: Render item titles, prices, descriptions, and dietary badges (Vegetarian/Halal) with clean layout designs.
- **State Properties**:
  - `activeCategory` (defaults to 'All').
- **API Dependencies**:
  - Consumes static data structures from `src/data/menu.ts` combined with dynamic categories.

---

### C. Takeaway / Order View (`src/components/OrderView.tsx`)
The online ordering interface designed for selecting items and initiating collections or deliveries.

- **Key UI Sections**:
  - **Menu Browsing Grid**: Product grid featuring search bars and filter categories.
  - **Customization Modal**: Triggered when selecting items containing variable sizes (e.g., Pizzas) or requiring customized preparation notes.
  - **Checkout Form Panel**: User fields including Service Type (Takeaway Collection / Delivery), Customer Name, Email, Phone, Delivery Address, Preferred Time picker, and order comments.
- **Behavioral Flows**:
  1. Add item to cart -> Choose size option -> Enter optional preparation note.
  2. Open sidebar cart drawer to review subtotals, packaging charges, and delivery fees.
  3. Proceed to checkout -> Fill customer details -> Submit order.
  4. Redirect/display success tracking confirmation screen.
- **API Dependencies**:
  - `POST /api/orders` - Dispatches completed order structures to the backend. Returns a unique tracking ID.
  - `GET /api/users/:email` - Auto-populates contact details if logged in.

---

### D. Booking View (`src/components/BookingView.tsx`)
Table reservation engine with real-time area options and dynamic guidelines.

- **Key UI Sections**:
  - **Reservation Details Form**: Fields for Guest Name, Email, Phone Number, Date Picker, Party Size, and Special Requests.
  - **Dining Area Selector**: Custom cards selecting visual options:
    - *Indoor dining*
    - *Outdoor Garden*
    - *Private Hall (Up to 50)*
  - **Capacity / Guidelines Notice Banner**: Shows active booking rules or holiday closure notices configured by admins.
- **Behavioral Flows**:
  1. Form validations check date restrictions (e.g., bookings must be in the future).
  2. On submission, coordinates are uploaded, creating a `Pending` booking.
  3. A confirmation page displays details with status indicators.
- **API Dependencies**:
  - `POST /api/bookings` - Submit reservation request.
  - Sends email notifications to customers and administrators.

---

### E. Order History View (`src/components/HistoryView.tsx`)
Customer portal listing previous transactions and current order tracking status.

- **Key UI Sections**:
  - **Active Orders Timeline**: Interactive tracker showing statuses (Received -> Preparing -> Ready / Out for Delivery -> Completed).
  - **Order List**: History block with expandable item descriptions, transaction dates, and final totals.
- **API Dependencies**:
  - `GET /api/orders` - Fetches orders matching authenticated user email addresses.
  - `DELETE /api/orders/:id` - Allows customers to cancel pending orders prior to prep starting.

---

### F. Profile View (`src/components/ProfileView.tsx`)
Manage user accounts and details.

- **Key UI Sections**:
  - **User Info Form**: Modifiable inputs for Phone, Eircode, Delivery Address, and Dietary Preferences.
  - **Authentication Integration**: Google profile info integration alongside profile picture synchronization.
- **API Dependencies**:
  - `GET /api/users/:email` - Fetch profile metadata.
  - `POST /api/users` - Saves profile modifications to database records.

---

### G. Admin Dashboard (`src/components/AdminDashboard.tsx`)
The control panel containing configuration modules restricted to authorized managers.

- **Key UI Sections**:
  - **Dashboard Metrics**: Summary cards displaying total sales, completed orders count, pending bookings, and active takeaway toggles.
  - **Order Manager**: Live feed highlighting incoming orders. Provides actions to change status (e.g., mark as "Preparing" or "Completed") or archive old items.
  - **Reservation Coordinator**: Grid of incoming bookings with single-click "Confirm" or "Cancel" status updates.
  - **Settings Console**: Tabbed configurations for editing:
    - *Business Contacts*: Phone, address, emails, Google Maps URLs.
    - *Store Statuses*: Takeaway/Reservations active flags, notice text banner toggles, and timing parameters.
    - *SMTP parameters*: Custom mail server configs (Host, Port, User, Password).
    - *Notification List*: Manage administrative emails receiving carbon copies of orders and bookings.
    - *Graphic Settings*: Image upload forms for modifying the main home page hero background and story imagery.
- **Authentication**: Secured by administrative tokens stored locally (`clay_oven_admin_token`) and validated on each request.
- **API Dependencies**:
  - `GET /api/admin/orders` / `PUT /api/admin/orders/:id/status`
  - `GET /api/admin/bookings` / `PUT /api/bookings/:id/status`
  - `POST /api/settings` / `POST /api/business-info`
  - `POST /api/admin/smtp` / `GET /api/admin/smtp`
  - `POST /api/admin/upload-image` - File upload multi-part parser.

---

## 4. Backend Database Schema Details

The MySQL instance holds the following schemas:

### `users`
- `email` (VARCHAR 255, Primary Key)
- `name` (VARCHAR 255)
- `picture` (VARCHAR 500)
- `phone` (VARCHAR 50)
- `eircode` (VARCHAR 50)
- `address` (TEXT)
- `dietaryPreferences` (VARCHAR 500)
- `password` (VARCHAR 255)

### `bookings`
- `id` (VARCHAR 100, Primary Key)
- `name` (VARCHAR 255)
- `email` (VARCHAR 255)
- `phone` (VARCHAR 50)
- `partySize` (INT)
- `date` (VARCHAR 100)
- `time` (VARCHAR 100)
- `diningArea` (VARCHAR 100)
- `specialRequests` (TEXT)
- `status` (VARCHAR 50)
- `createdAt` (VARCHAR 100)

### `orders`
- `id` (VARCHAR 100, Primary Key)
- `items` (TEXT) - JSON-stringified catalog items ordered.
- `packagingFee` (DECIMAL 10,2)
- `subtotal` (DECIMAL 10,2)
- `total` (DECIMAL 10,2)
- `serviceType` (VARCHAR 50) - 'takeaway' or 'delivery'.
- `customer_name` / `customer_email` / `customer_phone`
- `customer_address` (TEXT)
- `preferredTime` (VARCHAR 100)
- `notes` (TEXT)
- `status` (VARCHAR 50)
- `is_archived` (INT)
- `createdAt` (VARCHAR 100)

### `store_settings`
- `setting_key` (VARCHAR 255, Primary Key)
- `setting_value` (LONGTEXT)

### `business_info`
- `id` (INT, Primary Key Auto-Increment)
- `business_name` / `address` / `maps_url` / `phone` / `mobile` / `whatsapp` / `email`
