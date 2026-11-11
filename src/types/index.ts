// ============================================================
// SMM Panel - Core TypeScript Types
// ============================================================

export type UserRole = 'admin' | 'customer' | 'reseller';
export type OrderStatus = 'pending' | 'processing' | 'completed' | 'cancelled' | 'failed' | 'refunded';
export type TransactionType = 'deposit' | 'deduction' | 'refund' | 'adjustment';
export type PaymentStatus = 'pending' | 'verified' | 'rejected' | 'refunded';
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type PlatformType = 'facebook' | 'instagram' | 'tiktok' | 'linkedin' | 'youtube' | 'twitter';
export type SupplierStatus = 'active' | 'inactive' | 'suspended';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  username: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: UserRole;
  is_active: boolean;
  is_email_verified: boolean;
  referral_code: string | null;
  referred_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  currency: string;
  total_deposited: number;
  total_spent: number;
  total_refunded: number;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  user_id: string;
  type: TransactionType;
  amount: number;
  balance_before: number;
  balance_after: number;
  reference_id: string | null;
  reference_type: string | null;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Platform {
  id: string;
  name: string;
  slug: PlatformType;
  icon_url: string | null;
  description: string | null;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface Service {
  id: string;
  platform_id: string;
  name: string;
  description: string | null;
  category: string | null;
  base_price: number;
  min_quantity: number;
  max_quantity: number;
  unit: string;
  average_speed: string | null;
  estimated_days: number | null;
  is_active: boolean;
  is_featured: boolean;
  requires_url: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined
  platform?: Platform;
}

export interface Supplier {
  id: string;
  name: string;
  api_endpoint: string | null;
  status: SupplierStatus;
  balance: number | null;
  currency: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface SupplierService {
  id: string;
  supplier_id: string;
  service_id: string;
  supplier_service_id: string | null;
  supplier_price: number | null;
  is_default: boolean;
  created_at: string;
}

export interface Order {
  id: string;
  order_number: string;
  user_id: string;
  service_id: string;
  platform_id: string;
  supplier_id: string | null;
  supplier_order_id: string | null;
  target_url: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: OrderStatus;
  start_count: number | null;
  current_count: number | null;
  remains: number | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  // Joined
  service?: Service;
  platform?: Platform;
  user?: Profile;
}

export interface PaymentRecord {
  id: string;
  user_id: string;
  wallet_id: string;
  reference_number: string;
  amount: number;
  currency: string;
  payment_method: string;
  sender_name: string | null;
  sender_account: string | null;
  proof_url: string | null;
  status: PaymentStatus;
  verified_by: string | null;
  verified_at: string | null;
  rejection_reason: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Joined
  user?: Profile;
}

export interface ResellerPrice {
  id: string;
  reseller_id: string;
  service_id: string;
  wholesale_price: number;
  retail_price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined
  service?: Service;
}

export interface SupportTicket {
  id: string;
  ticket_number: string;
  user_id: string;
  order_id: string | null;
  subject: string;
  message: string;
  status: TicketStatus;
  priority: TicketPriority;
  assigned_to: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined
  user?: Profile;
  order?: Order;
  replies?: TicketReply[];
}

export interface TicketReply {
  id: string;
  ticket_id: string;
  user_id: string;
  message: string;
  is_staff: boolean;
  created_at: string;
  // Joined
  user?: Profile;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  // Joined
  actor?: Profile;
}

// API Response types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Dashboard stats
export interface AdminStats {
  total_users: number;
  total_resellers: number;
  total_orders: number;
  total_revenue: number;
  pending_payments: number;
  open_tickets: number;
  orders_today: number;
  revenue_today: number;
}

export interface CustomerStats {
  wallet_balance: number;
  total_orders: number;
  active_orders: number;
  total_spent: number;
}

// Order form
export interface CreateOrderInput {
  service_id: string;
  target_url: string;
  quantity: number;
}

// Payment form
export interface CreatePaymentInput {
  amount: number;
  payment_method: string;
  reference_number: string;
  sender_name: string;
  sender_account: string;
  proof_url?: string;
}

// Supplier interface (provider pattern)
export interface SupplierAdapter {
  id: string;
  name: string;
  placeOrder(params: PlaceOrderParams): Promise<SupplierOrderResult>;
  getOrderStatus(supplierOrderId: string): Promise<SupplierOrderStatus>;
  getBalance(): Promise<number | null>;
}

export interface PlaceOrderParams {
  serviceId: string;
  targetUrl: string;
  quantity: number;
}

export interface SupplierOrderResult {
  success: boolean;
  supplierOrderId?: string;
  error?: string;
}

export interface SupplierOrderStatus {
  status: OrderStatus;
  startCount?: number;
  currentCount?: number;
  remains?: number;
}
