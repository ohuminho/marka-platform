export async function getVendorIntelligence(
  vendorId: string
) {

  const response =
    await fetch(
      `/api/vendors/${vendorId}/intelligence`
    );


  if (!response.ok) {

    throw new Error(
      "Unable to load vendor intelligence"
    );

  }


  return response.json();

}
