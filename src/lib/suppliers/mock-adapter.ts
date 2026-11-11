/**
 * Mock Supplier Adapter
 *
 * This is a development/testing adapter that simulates supplier API calls.
 * In production, replace this with real authorized supplier integrations.
 *
 * The SupplierAdapter interface allows plugging in real providers without
 * changing any other application code.
 */

import type {
  SupplierAdapter,
  PlaceOrderParams,
  SupplierOrderResult,
  SupplierOrderStatus,
  OrderStatus,
} from '@/types';

// Simulate async processing delays
function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Simulated order store for mock status tracking
const mockOrders = new Map<string, {
  status: OrderStatus;
  startCount: number;
  quantity: number;
  createdAt: number;
}>();

export class MockSupplierAdapter implements SupplierAdapter {
  id = 'mock-supplier';
  name = 'Mock Fulfillment Provider';

  async placeOrder(params: PlaceOrderParams): Promise<SupplierOrderResult> {
    await delay(300); // Simulate network latency

    // Validate URL format
    try {
      new URL(params.targetUrl);
    } catch {
      return { success: false, error: 'Invalid target URL' };
    }

    // Simulate occasional failures (5% chance in development)
    if (Math.random() < 0.05) {
      return { success: false, error: 'Supplier temporarily unavailable' };
    }

    const supplierOrderId = `MOCK-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    mockOrders.set(supplierOrderId, {
      status: 'processing',
      startCount: Math.floor(Math.random() * 1000),
      quantity: params.quantity,
      createdAt: Date.now(),
    });

    return { success: true, supplierOrderId };
  }

  async getOrderStatus(supplierOrderId: string): Promise<SupplierOrderStatus> {
    await delay(100);

    const order = mockOrders.get(supplierOrderId);
    if (!order) {
      return { status: 'failed' };
    }

    // Simulate progress over time
    const elapsedMs = Date.now() - order.createdAt;
    const elapsedMinutes = elapsedMs / 60000;
    const progressRate = order.quantity / 60; // 1 hour to complete
    const delivered = Math.min(order.quantity, Math.floor(progressRate * elapsedMinutes));
    const remains = order.quantity - delivered;

    let status: OrderStatus = 'processing';
    if (remains <= 0) {
      status = 'completed';
      mockOrders.set(supplierOrderId, { ...order, status: 'completed' });
    }

    return {
      status,
      startCount: order.startCount,
      currentCount: order.startCount + delivered,
      remains,
    };
  }

  async getBalance(): Promise<number | null> {
    await delay(100);
    return 999.99; // Mock balance
  }
}

// Factory function to get the appropriate adapter
export function getSupplierAdapter(supplierId: string): SupplierAdapter {
  // In production, map supplier IDs to real adapters
  // For now, always return mock
  console.log(`[Supplier] Using mock adapter for supplier: ${supplierId}`);
  return new MockSupplierAdapter();
}
