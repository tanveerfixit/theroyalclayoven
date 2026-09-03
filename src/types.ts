/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface OptionItem {
  id: number | string;
  groupId: number | string;
  name: string;
  priceModifier: number; // 0.00 for free, 1.50 for extra
  isDefault?: boolean;
  displayOrder?: number;
}

export interface OptionGroup {
  id: number | string;
  title: string; // e.g. "Select Included Free Drink", "Choice of Side", "Add Extra Dips"
  minSelection: number; // 1 = mandatory, 0 = optional
  maxSelection: number; // 1 = single choice, >1 = multiple choices
  isActive?: boolean;
  options: OptionItem[];
}

export interface MenuCategory {
  id: number | string;
  name: string;
  slug: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
  imageUrl?: string;
  optionGroupIds?: (number | string)[];
}

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  allergens?: number[]; // indices in allergen information
  sizeOptions?: { name: string; price: number }[];
  isVeg?: boolean;
  category: string;
  categoryId?: number | string;
  isActive?: boolean;
  isSoldOut?: boolean;
  imageUrl?: string;
  displayOrder?: number;
  optionGroupIds?: (number | string)[]; // directly assigned modifier groups
}

export interface DealStep {
  stepName: string; // e.g. "Choose Your Main Karahi"
  categoryName?: string;
  categoryId?: number | string;
  count: number; // e.g. 1
  allowedProductIds?: string[]; // optional specific items filter
}

export interface MenuDeal {
  id: string;
  title: string;
  description?: string;
  bundlePrice: number;
  badgeText?: string; // e.g. "SAVE €8.50"
  isActive?: boolean;
  imageUrl?: string;
  steps: DealStep[];
}

export interface SelectedModifier {
  groupId: number | string;
  groupTitle: string;
  optionId: number | string;
  optionName: string;
  price: number;
}

export interface UserProfile {
  name: string;
  email: string;
  picture: string;
  phone?: string;
  eircode?: string;
  address?: string;
  dietaryPreferences?: string;
}

export interface Allergen {
  index: number;
  name: string;
}

export interface CartItem {
  id: string; // unique for this combination of item + options + notes
  menuItem: MenuItem;
  selectedSize?: { name: string; price: number };
  selectedModifiers?: SelectedModifier[];
  quantity: number;
  notes?: string;
}

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  size?: string;
  modifiers?: SelectedModifier[];
  notes?: string;
  cancelled?: boolean;
  cancelReason?: string;
}

export interface Order {
  id: string;
  items: OrderItem[];
  packagingFee: number;
  subtotal: number;
  total: number;
  serviceType: 'takeaway' | 'delivery';
  customerInfo: {
    name: string;
    email: string;
    phone: string;
    address?: string;
    preferredTime: string;
    notes?: string;
  };
  status: 'Received' | 'Preparing' | 'Ready for Collection' | 'Out for Delivery' | 'Completed' | 'Cancelled';
  cancellationReason?: string;
  adminNotes?: string;
  isArchived?: boolean;
  createdAt: string;
}

export interface Reservation {
  id: string;
  name: string;
  email: string;
  phone: string;
  partySize: number;
  date: string;
  time: string;
  diningArea: 'Indoor' | 'Outdoor Garden' | 'Private Hall (Up to 50)';
  specialRequests?: string;
  status: 'Pending' | 'Confirmed' | 'Cancelled';
  createdAt: string;
}
