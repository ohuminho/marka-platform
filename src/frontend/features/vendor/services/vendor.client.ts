export async function getCurrentVendor() {

  const response =
    await fetch(
      "/api/vendors/me"
    );


  if (!response.ok) {

    throw new Error(
      "Vendor not found"
    );

  }


  return response.json();

}
