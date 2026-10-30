-- Buyer/seller messaging for Marketplace. Does not modify orders, payments or ledger data.
CREATE TABLE "MarketplaceConversation" (
  "id" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "orderId" TEXT,
  "subject" TEXT,
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "MarketplaceConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MarketplaceMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MarketplaceMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketplaceConversation_buyerId_sellerId_productId_key"
  ON "MarketplaceConversation"("buyerId", "sellerId", "productId");
CREATE INDEX "MarketplaceConversation_buyerId_lastMessageAt_idx"
  ON "MarketplaceConversation"("buyerId", "lastMessageAt");
CREATE INDEX "MarketplaceConversation_sellerId_lastMessageAt_idx"
  ON "MarketplaceConversation"("sellerId", "lastMessageAt");
CREATE INDEX "MarketplaceConversation_storeId_lastMessageAt_idx"
  ON "MarketplaceConversation"("storeId", "lastMessageAt");
CREATE INDEX "MarketplaceConversation_orderId_idx"
  ON "MarketplaceConversation"("orderId");
CREATE INDEX "MarketplaceMessage_conversationId_createdAt_idx"
  ON "MarketplaceMessage"("conversationId", "createdAt");
CREATE INDEX "MarketplaceMessage_senderId_createdAt_idx"
  ON "MarketplaceMessage"("senderId", "createdAt");
CREATE INDEX "MarketplaceMessage_conversationId_readAt_idx"
  ON "MarketplaceMessage"("conversationId", "readAt");

ALTER TABLE "MarketplaceConversation"
  ADD CONSTRAINT "MarketplaceConversation_buyerId_fkey"
  FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceConversation"
  ADD CONSTRAINT "MarketplaceConversation_sellerId_fkey"
  FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceConversation"
  ADD CONSTRAINT "MarketplaceConversation_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceConversation"
  ADD CONSTRAINT "MarketplaceConversation_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceConversation"
  ADD CONSTRAINT "MarketplaceConversation_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MarketplaceMessage"
  ADD CONSTRAINT "MarketplaceMessage_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "MarketplaceConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketplaceMessage"
  ADD CONSTRAINT "MarketplaceMessage_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
