/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  allergens?: number[]; // indices in allergen information
  sizeOptions?: { name: string; price: number }[];
  isVeg?: boolean;
  category: string;
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
  quantity: number;
  notes?: string;
}

export interface Order {
  id: string;
  items: {
    name: string;
    quantity: number;
    price: number;
    size?: string;
    notes?: string;
  }[];
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
  status: 'Received' | 'Preparing' | 'Ready for Collection' | 'Out for Delivery' | 'Completed';
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
