export class VendorService {
  createVendor(name: string) {
    return {
      id: crypto.randomUUID(),
      name,
    };
  }
}
