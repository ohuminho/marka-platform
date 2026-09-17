import type {
  CatalogProduct,
  CatalogProductStatus,
} from "@/catalog-engine/catalog.contracts";
import type { IsoCurrencyCode } from "@/core/domain/contracts";
import { ProductService } from "@/services/products/product.service";

export interface CatalogCreateProductCommand {
  organizationId: string;
  ownerId: string;
  storeId: string;
  name: string;
  description?: string;
  priceMinor: number;
  currency: IsoCurrencyCode;
}

export class CatalogAdapter {
  constructor(
    private readonly productService: ProductService = new ProductService(),
  ) {}

  async createProduct(
    command: CatalogCreateProductCommand,
  ): Promise<CatalogProduct> {
    this.validate(command);

    const product = await this.productService.createProduct(
      command.ownerId,
      command.storeId,
      command.name.trim(),
      command.priceMinor,
      command.description?.trim(),
    );

    const now = new Date();

    return {
      id: product.id,
      organizationId: command.organizationId,
      status: this.mapStatus(product.status),
      createdAt: product.createdAt ?? now,
      updatedAt: product.updatedAt ?? now,
      storeId: command.storeId,
      name: product.name,
      description: product.description ?? undefined,
      categoryIds: [],
      attributes: [],
      variants: [
        {
          id: product.id,
          productId: product.id,
          sku: product.sku,
          attributes: [],
          price: {
            amountMinor: Number(product.price),
            currency: command.currency,
          },
          inventoryReference: product.id,
          status: this.mapStatus(product.status),
        },
      ],
      mediaReferences: [],
    };
  }

  async getProduct(
    organizationId: string,
    productId: string,
    currency: IsoCurrencyCode,
  ): Promise<CatalogProduct | null> {
    const product = await this.productService.getProduct(productId);

    if (!product) {
      return null;
    }

    const now = new Date();

    return {
      id: product.id,
      organizationId,
      status: this.mapStatus(product.status),
      createdAt: product.createdAt ?? now,
      updatedAt: product.updatedAt ?? now,
      storeId: product.storeId,
      name: product.name,
      description: product.description ?? undefined,
      categoryIds: [],
      attributes: [],
      variants: [
        {
          id: product.id,
          productId: product.id,
          sku: product.sku,
          attributes: [],
          price: {
            amountMinor: Number(product.price),
            currency,
          },
          inventoryReference: product.id,
          status: this.mapStatus(product.status),
        },
      ],
      mediaReferences: [],
    };
  }

  private validate(command: CatalogCreateProductCommand): void {
    if (!command.organizationId.trim()) {
      throw new Error("Organization is required.");
    }

    if (!command.ownerId.trim()) {
      throw new Error("Product owner is required.");
    }

    if (!command.storeId.trim()) {
      throw new Error("Store is required.");
    }

    if (!command.name.trim()) {
      throw new Error("Product name is required.");
    }

    if (!Number.isSafeInteger(command.priceMinor) || command.priceMinor < 0) {
      throw new Error("Product price must be a valid minor-unit integer.");
    }

    if (!command.currency) {
      throw new Error("Product currency is required.");
    }
  }

  private mapStatus(status: string): CatalogProductStatus {
    switch (status) {
      case "ACTIVE":
        return "ACTIVE";
      case "DISABLED":
        return "DISABLED";
      case "ARCHIVED":
        return "ARCHIVED";
      default:
        return "DRAFT";
    }
  }
}

export const catalogAdapter = new CatalogAdapter();
