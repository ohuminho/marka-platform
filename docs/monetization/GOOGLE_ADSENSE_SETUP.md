# Google AdSense — MARKA Marketplace

## Current implementation

The Marketplace has an optional, discreet Google AdSense slot after the fifth product card. It is independent of MARKA's own sponsored campaigns delivered through `/api/ads` and `SponsoredAdCard`.

The slot stays hidden unless both deployment variables are configured:

- `NEXT_PUBLIC_ADSENSE_CLIENT_ID`: the publisher client ID issued by Google, normally in the form `ca-pub-XXXXXXXXXXXXXXXX`.
- `NEXT_PUBLIC_ADSENSE_MARKETPLACE_SLOT_ID`: the numeric ad-unit ID created in the approved AdSense account.

These values are public identifiers, not secrets. Never put service credentials or private API keys in `NEXT_PUBLIC_*` variables.

## Activation checklist

1. Confirm that the MARKA domain is added to the correct Google AdSense account and approved for serving ads.
2. Create a responsive display ad unit for the Marketplace feed and use its exact client and slot IDs.
3. Add both variables to the Vercel project for every environment where ads should be enabled. Redeploy after changing build-time public variables.
4. Publish the exact Google-provided publisher declaration at `/ads.txt` for the production domain. Do not use a placeholder publisher ID; copy the line from the AdSense account.
5. Ensure the site's privacy notice, cookie/consent handling and applicable Angola/international privacy obligations cover advertising technologies and any personalized advertising.
6. Test on the production domain after approval. Confirm the slot is absent when IDs are missing, does not overlap product controls, and does not appear during checkout or payment.
7. Monitor AdSense policy status, invalid traffic, page performance and revenue in Google's dashboard.

## Placement and product policy

- AdSense is limited to a dedicated Marketplace discovery placement; it is not inserted into Mobility navigation, trip safety, checkout, payment or financial confirmation flows.
- Keep the existing MARKA-sponsored campaign system separate. Its approval, impression limits and advertiser analytics are not Google AdSense.
- Do not click live ads or ask users to click them. Do not create artificial impressions.
- Ad delivery is controlled by Google and may not be immediate even after configuration and approval.

## Important status distinction

Code support is not the same as an activated AdSense account. This repository change does not prove that the publisher account is approved, that the production domain is verified, that the publisher declaration is published, or that ads are serving. Those require valid account-issued identifiers and production verification.
