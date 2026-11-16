export function canPublishIndividualListing(otherNonArchivedListings: number): boolean {
  return Number.isInteger(otherNonArchivedListings) && otherNonArchivedListings === 0;
}
