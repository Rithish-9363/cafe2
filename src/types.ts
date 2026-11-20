export type PageRoute =
  | '/'
  | '/menu'
  | '/story'
  | '/contact'
  | '/cart'
  | '/checkout'
  | '/login'
  | '/signup'
  | '/account'
  | '/admin';

export type CoffeeMood =
  | 'Fresh Start'
  | 'Strong Coffee'
  | 'Something Refreshing'
  | 'Sweet Craving';

export type OrderStatus =
  | 'Pending'
  | 'Confirmed'
  | 'Preparing'
  | 'Ready for Pickup'
  | 'Out for Delivery'
  | 'Completed'
  | 'Cancelled';

export type PaymentMethod = 'pay_at_pickup' | 'cash_on_delivery' | 'online_card';

export interface User {
  userId: string;
  name: string;
  email: string;
  phone: string;
  role: 'customer' | 'admin';
  createdAt?: string;
}

export interface Category {
  categoryId: string;
  categoryName: string;
  description: string;
  sortOrder: number;
}

export interface Product {
  productId: string;
  name: string;
  description: string;
  image: string;
  price: number;
  category: string;
  availability: number;
  moodTag: CoffeeMood;
  tastingNotes: string;
  featured: number;
  createdAt: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  lineTotal: number;
}

export interface Order {
  orderId: string;
  userId: string | null;
  customerName: string;
  customerEmail: string;
  phone: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  deliveryFee: number;
  total: number;
  orderType: 'pickup' | 'delivery';
  deliveryAddress: string;
  paymentMethod: PaymentMethod;
  paymentStatus: string;
  paymentReference: string;
  orderStatus: OrderStatus;
  notes: string;
  createdAt: string;
}

export interface MoodGroup {
  mood: CoffeeMood;
  subtitle: string;
  ritualNote: string;
  recommendations: Product[];
}

export interface ContactMessage {
  messageId: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
}

export interface NewsletterSubscriber {
  subscriberId: string;
  email: string;
  subscribedAt: string;
}

export interface CustomerSummary {
  userId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
}
