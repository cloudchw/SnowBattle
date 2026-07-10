/**
 * 内购系统（纯 TS 单例，参照 CloudBridge）。
 * 封装微信小游戏虚拟支付（requestMidoPayment / getProducts）。
 */

export interface IapProduct {
  id: string;
  name?: string;
  price?: number;
  [key: string]: unknown;
}

export interface PurchaseRecord {
  productId: string;
  timestamp: number;
}

/** wx.getProducts 成功回调载荷的最小形状。 */
interface WxProductsResult {
  products?: IapProduct[];
}

export class IAPSystem {
  private static instance: IAPSystem;
  private products: IapProduct[] = [];
  private purchaseHistory: PurchaseRecord[] = [];

  static getInstance(): IAPSystem {
    if (!IAPSystem.instance) {
      IAPSystem.instance = new IAPSystem();
    }
    return IAPSystem.instance;
  }

  setProducts(products: IapProduct[]): void {
    this.products = products;
  }

  /** 拉取商品信息；wx 不可用时返回当前已配置的商品。 */
  loadProducts(): Promise<IapProduct[]> {
    return new Promise((resolve) => {
      if (typeof wx === 'undefined') {
        resolve(this.products);
        return;
      }
      wx.getProducts({
        productIds: this.products.map((p) => p.id),
        success: (res: WxProductsResult) => {
          if (res && Array.isArray(res.products)) {
            this.products = res.products;
          }
          resolve(this.products);
        },
        fail: () => resolve(this.products),
      });
    });
  }

  /** 发起购买；resolve(true) 表示成功。 */
  purchase(productId: string): Promise<boolean> {
    return new Promise((resolve) => {
      if (typeof wx === 'undefined') {
        resolve(false);
        return;
      }
      wx.requestMidoPayment({
        productId,
        success: () => {
          this.purchaseHistory.push({ productId, timestamp: Date.now() });
          resolve(true);
        },
        fail: () => resolve(false),
      });
    });
  }

  restorePurchases(): PurchaseRecord[] {
    return this.purchaseHistory;
  }

  isProductPurchased(productId: string): boolean {
    return this.purchaseHistory.some((p) => p.productId === productId);
  }
}

export const iapSystem = IAPSystem.getInstance();
