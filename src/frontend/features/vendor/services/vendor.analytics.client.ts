export async function getVendorAnalytics(
  vendorId: string
) {

  const response =
    await fetch(
      `/api/vendors/${vendorId}/analytics`
    );


  if (!response.ok) {

    throw new Error(
      "Unable to load vendor analytics"
    );

  }


  return response.json();

}
