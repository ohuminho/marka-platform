-- Extend the existing shared communication engine for selected private-service cases.
-- Existing threads remain unchanged; only explicitly selected parties can join.
ALTER TYPE "CommunicationContextType" ADD VALUE IF NOT EXISTS 'PRIVATE_SERVICE';
ALTER TYPE "CommunicationParticipantRole" ADD VALUE IF NOT EXISTS 'PROFESSIONAL';
