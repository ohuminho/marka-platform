export class ProductService {
  createProduct(data: unknown) {
    return {
      success: true,
      data,
    };
  }
}
