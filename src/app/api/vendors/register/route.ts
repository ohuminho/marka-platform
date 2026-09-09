import { NextResponse } from "next/server";
import { VendorService } from "@/services/vendors/vendor.service";

export async function POST(request: Request) {
  const body = await request.json();

  const service = new VendorService();

  const vendor = await service.createVendor(
    body.ownerId,
    body.storeName
  );

  return NextResponse.json(vendor);
}
