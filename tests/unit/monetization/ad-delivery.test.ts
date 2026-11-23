import assert from "node:assert/strict";
import { isAdvertisementCampaignDeliverable } from "../../../src/monetization/ads/ad-delivery";

const now = new Date("2026-11-23T12:00:00.000Z");
const base = {
  status: "APPROVED",
  startsAt: new Date("2026-11-23T11:00:00.000Z"),
  endsAt: new Date("2026-11-23T13:00:00.000Z"),
  impressions: 9,
  maxImpressions: 10,
  creativeType: "IMAGE",
  creativeUrl: "https://cdn.example.com/ad.webp",
};
const safeUrl = (value: string | null) => Boolean(value && value.startsWith("https://"));

assert.equal(isAdvertisementCampaignDeliverable(base, now, safeUrl), true);
assert.equal(isAdvertisementCampaignDeliverable({ ...base, status: "PAUSED" }, now, safeUrl), false);
assert.equal(
  isAdvertisementCampaignDeliverable({ ...base, startsAt: new Date("2026-11-23T12:00:01.000Z") }, now, safeUrl),
  false,
  "A campaign must not be delivered before its start time."
);
assert.equal(
  isAdvertisementCampaignDeliverable({ ...base, endsAt: now }, now, safeUrl),
  false,
  "The end timestamp is exclusive."
);
assert.equal(
  isAdvertisementCampaignDeliverable({ ...base, impressions: 10 }, now, safeUrl),
  false,
  "A campaign at its impression cap must not be delivered."
);
assert.equal(
  isAdvertisementCampaignDeliverable({ ...base, maxImpressions: null, impressions: 10_000 }, now, safeUrl),
  true,
  "A campaign without a configured impression cap may continue."
);
assert.equal(
  isAdvertisementCampaignDeliverable({ ...base, creativeUrl: "http://unsafe.example.com/ad.webp" }, now, safeUrl),
  false,
  "Non-native creatives must use a safe HTTPS URL."
);
assert.equal(
  isAdvertisementCampaignDeliverable({ ...base, creativeType: "NATIVE", creativeUrl: null }, now, safeUrl),
  true,
  "Native creatives may omit a media URL."
);

console.log("MARKA ad delivery tests passed.");
