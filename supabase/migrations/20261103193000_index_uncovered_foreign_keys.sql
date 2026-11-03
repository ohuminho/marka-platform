-- Cover foreign-key columns identified by Supabase performance advisors.
-- These indexes reduce parent-row delete/update scans and improve joins.
CREATE INDEX IF NOT EXISTS "CommunicationCallSignal_senderId_idx"
  ON public."CommunicationCallSignal" ("senderId");

CREATE INDEX IF NOT EXISTS "MarketplaceConversation_productId_idx"
  ON public."MarketplaceConversation" ("productId");

CREATE INDEX IF NOT EXISTS "MobilityAudioSafetySession_startedByUserId_idx"
  ON public."MobilityAudioSafetySession" ("startedByUserId");

CREATE INDEX IF NOT EXISTS "MobilitySafetyEvent_actorUserId_idx"
  ON public."MobilitySafetyEvent" ("actorUserId");

CREATE INDEX IF NOT EXISTS "MobilitySafetyIncident_reportedByUserId_idx"
  ON public."MobilitySafetyIncident" ("reportedByUserId");

CREATE INDEX IF NOT EXISTS "MobilitySafetyIncident_resolvedByUserId_idx"
  ON public."MobilitySafetyIncident" ("resolvedByUserId");
