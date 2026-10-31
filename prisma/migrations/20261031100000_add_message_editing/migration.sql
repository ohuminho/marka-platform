-- Support message editing with an explicit edited timestamp.
ALTER TABLE "MarketplaceMessage" ADD COLUMN "editedAt" TIMESTAMP(3);
ALTER TABLE "CommunicationThreadMessage" ADD COLUMN "editedAt" TIMESTAMP(3);
