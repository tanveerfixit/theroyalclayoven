# 👑 The Royal Clay Oven — Admin Control Manual & Operations Guide

Welcome to the **Admin Control Center** for **The Royal Clay Oven**. This comprehensive manual explains step-by-step how to manage the dynamic food catalog, modifier groups, dips, drinks, combo deals, stock availability, store timings, and orders directly from your web browser.

---

## 📑 Table of Contents
1. [Logging In to the Admin Console](#1-logging-in-to-the-admin-console)
2. [Managing Dishes & Products](#2-managing-dishes--products)
3. [Managing Categories & Menu Ordering](#3-managing-categories--menu-ordering)
4. [Setting Up Modifier Groups, Dips & Add-ons](#4-setting-up-modifier-groups-dips--add-ons)
5. [Creating Deals & Combo Packages](#5-creating-deals--combo-packages)
6. [Live Orders & Kitchen Management](#6-live-orders--kitchen-management)
7. [Table Layout & Booking Reservations](#7-table-layout--booking-reservations)
8. [Store Timings, Takeaway & Delivery Settings](#8-store-timings-takeaway--delivery-settings)
9. [Authorized Admin Access & Notification Emails](#9-authorized-admin-access--notification-emails)

---

## 1. Logging In to the Admin Console

### URL / Route:
Navigate to `/admin` in your web browser (e.g., `http://localhost:3000/admin` or `https://www.clayoven.ie/admin`).

### Step-by-Step Login:
1. Enter an authorized administrator email address:
   - `tanveerfixit@gmail.com`
   - `accounts@clayoven.ie`
2. Click **"Request Access Code"**.
3. Check your email inbox for the subject: `Admin Console Access Code — The Royal Clay Oven`.
4. Enter the **6-digit verification code** into the screen and click **"Authenticate & Enter Console"**.
5. Your session stays active for **24 hours**.

---

## 2. Managing Dishes & Products

Navigate to **"Menu & Modifiers Studio"** > Sub-tab **"Dishes & Products"**.

### Adding a New Dish:
1. Click the **"+ Add New Dish"** button at the top right.
2. Fill in the dish details:
   - **Dish Name**: e.g., *Chicken Tikka Masala*
   - **Category**: Select which menu category it belongs to (e.g., *Pakistani Cuisine*).
   - **Base Price (€)**: e.g., `13.50`
   - **Description**: Authentic recipe summary (e.g., *Tender chargrilled chicken pieces simmered in a creamy spiced tomato sauce.*)
   - **Vegetarian Switch**: Toggle ON if the dish is vegetarian.
   - **Allergen Tags (EU 14 Standard)**: Check any applicable allergens (e.g., *Dairy / Milk*, *Nuts*, *Gluten*).
3. **Portion Sizes / Variations** *(Optional)*:
   - If the dish comes in multiple sizes (e.g., *Regular*, *Large*, *Half*, *Full*):
   - Click **"+ Add Size Option"**, enter the size label and specific price.
4. **Attach Modifier Groups** *(Optional)*:
   - Check any customizer groups customer should select (e.g., *Included Free Side*, *Extra Dips & Sauces*, *Spice Level*).
5. **Dish Photo Upload**:
   - Upload a high-resolution JPG/PNG image to showcase the dish on the booklet and online store.
6. Click **"Save Dish to Catalog"**. The dish goes live immediately!

### 1-Click Stock & Visibility Controls:
- **In-Stock / Sold Out Toggle**: Click the green **"In Stock"** button on any dish card to instantly mark it **"Sold Out"**. The storefront will grey out the item and prevent customers from ordering it until restocked.
- **Active / Hidden Toggle**: Click the **"Active"** toggle to completely hide a seasonal dish from the menu without deleting it.
- **Editing a Dish**: Click the **"Edit"** button on any dish row to adjust prices, recipes, or allergens.

---

## 3. Managing Categories & Menu Ordering

Navigate to **"Menu & Modifiers Studio"** > Sub-tab **"Categories"**.

### Creating a New Category:
1. Click **"+ Create New Category"**.
2. Enter the **Category Name** (e.g., *Clay Oven Specialties*, *Traditional Biryani*, *Desserts*).
3. Enter a short description.
4. **Default Modifier Groups**: Attach modifier groups that should automatically apply to **all** dishes in this category (e.g., attaching *Extra Dips & Sauces*).
5. Click **"Save Category"**.

### Reordering Categories on the Storefront:
- Click the **▲ Up** or **▼ Down** arrow buttons on any category row to instantly change its position in the top navigation bar.

---

## 4. Setting Up Modifier Groups, Dips & Add-ons

Navigate to **"Menu & Modifiers Studio"** > Sub-tab **"Modifiers & Dips"**.

This tool powers the **Deliveroo / Uber Eats style upsell popup** on the ordering page.

### Creating a Modifier Group:
1. Click **"+ Create Modifier Group"**.
2. Configure Group Settings:
   - **Group Title**: e.g., *Extra Gourmet Dips*, *Spice Level*, *Free Cold Drink*, *Choice of Rice/Naan*.
   - **Selection Rules**:
     - **Mandatory (Required)**: Set `Min Selection = 1`. Customers **must** pick an option before adding to basket.
     - **Single Choice (Radio)**: Set `Min = 1, Max = 1` (e.g., *Select 1 Free Drink*).
     - **Multi-Select (Checkboxes)**: Set `Min = 0, Max = 5` (e.g., *Pick up to 5 Extra Dips*).
3. **Add Choices / Options**:
   - For each choice, click **"+ Add Choice Option"**:
     - **Option Name**: e.g., *Garlic Mayo*, *Mint Raita*, *Chilli Dip*, *Cola*, *Lemon & Lime*.
     - **Price Modifier (€)**: Enter `0.00` for free options, or an extra charge like `1.50` or `2.00`.
     - **Default Toggle**: Check if this choice should be pre-selected by default.
4. Click **"Save Modifier Group"**.

---

## 5. Creating Deals & Combo Packages

Navigate to **"Menu & Modifiers Studio"** > Sub-tab **"Deals & Combos"**.

This feature lets you bundle multiple dishes into a set package at a promotional price (e.g., *Family Feast for 2*, *Lunch Special*).

### Setting Up a Combo Deal:
1. Click **"+ Create New Combo Deal"**.
2. Fill in the Deal Overview:
   - **Deal Title**: e.g., *Royal Feast for Two*
   - **Badge Text**: e.g., `SAVE €6.00` or `POPULAR` or `CHEF SPECIAL`
   - **Bundle Price (€)**: e.g., `28.50`
   - **Description**: e.g., *Includes 2 Main Curries, 2 Fresh Tandoori Naans, and 2 Soft Drinks.*
3. **Configure Step-by-Step Selection Rules**:
   - **Step 1**: Step Name: `Choose 2 Main Curries`, Category: `Pakistani Cuisine`, Quantity: `2`
   - **Step 2**: Step Name: `Choose 2 Naan Breads`, Category: `Naan Bread`, Quantity: `2`
   - **Step 3**: Step Name: `Choose 2 Cold Drinks`, Category: `Drinks`, Quantity: `2`
4. Click **"Save Deal Package"**.
5. The deal immediately appears at the top of the customer menu under **"🎁 Deals & Combos"**.

---

## 6. Live Orders & Kitchen Management

Navigate to the **"Live Kitchen Orders"** tab.

### Order Processing Workflow:
- **Audio & Visual Alerts**: The dashboard plays an alert chime upon receiving incoming orders.
- **Status Progression**:
  - `Received` ➔ Click **"Start Preparing"** (`Preparing`)
  - `Preparing` ➔ Click **"Ready for Collection/Delivery"** (`Ready`)
  - `Ready` ➔ Click **"Complete Order"** (`Completed`)
- **Customer Email Updates**: Changing status automatically sends branded status update emails to the customer.
- **Print Kitchen Docket**: Click **"Print Kitchen Receipt"** to print thermal docket tickets.

---

## 7. Table Layout & Booking Reservations

Navigate to the **"Table Bookings"** tab.
- View upcoming dine-in reservations sorted by date, time, and party size.
- 1-click **Confirm**, **Seat**, or **Decline** reservations.
- Direct customer phone & WhatsApp contact shortcuts.

---

## 8. Store Timings, Takeaway & Delivery Settings

Navigate to the **"Settings & Timings"** tab.

### Operating Hours:
- Set independent opening and closing hours for every day of the week (Monday through Sunday).

### Online Ordering Emergency Toggle:
- **Takeaway Online Ordering**: Toggle ON/OFF. If kitchen is busy, toggle OFF to display a friendly message directing customers to phone directly.
- **Delivery Scheduler**: Enable or disable local home delivery per day of the week and set delivery operational windows.

### Fees & Statutory Charges:
- Adjust **Takeaway Packaging Fee (€)** (e.g. `0.95`).
- Adjust **Home Delivery Fee (€)** (e.g. `3.00`).

---

## 9. Authorized Admin Access & Notification Emails

Navigate to **"Settings & Timings"** > **"Security & Notifications"**.

### Adding New Admin Users:
1. Under **"Authorized Admin Emails"**, enter the new manager's email address.
2. Click **"Authorize Admin"**.
3. They can now receive login access codes at their email.

### Kitchen Notification Emails:
- Add secondary kitchen / manager email addresses under **"Order Alert Recipients"** (e.g., `sales@clayoven.ie`, `manager@clayoven.ie`) so all orders are instantly emailed to your staff.

---

*Document prepared for The Royal Clay Oven — All rights reserved.*
