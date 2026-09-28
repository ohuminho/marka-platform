import type {
  ComplianceCaseStatus,
  ComplianceDocumentStatus,
  ComplianceStatus,
  ComplianceSubjectType,
} from "@prisma/client";

export type ComplianceFaq = {
  question: string;
  answer: string;
};

export type ComplianceProfileView = {
  id: string;
  subjectType: ComplianceSubjectType;
  subjectId: string;
  organizationId: string | null;
  status: ComplianceStatus;
  countryCode: string | null;
  submittedAt: string | null;
  verifiedAt: string | null;
  expiresAt: string | null;
  rejectionReason: string | null;
  documents: Array<{
    id: string;
    documentType: string;
    status: ComplianceDocumentStatus;
    expiresAt: string | null;
    rejectionReason: string | null;
  }>;
  cases: Array<{
    id: string;
    status: ComplianceCaseStatus;
    reason: string;
    decision: string | null;
    notes: string | null;
  }>;
};

export const COMPLIANCE_FAQS: ComplianceFaq[] = [
  {
    question: "Why does MARKA require verification?",
    answer:
      "Verification helps establish account, business and operational identity before access to controlled services or transactions.",
  },
  {
    question: "What is KYC?",
    answer:
      "KYC means Know Your Customer. It verifies the identity and required information of a customer.",
  },
  {
    question: "What is KYD?",
    answer:
      "KYD means Know Your Driver. It verifies driver identity, required driving documents and operational eligibility.",
  },
  {
    question: "What is KYB?",
    answer:
      "KYB means Know Your Business. It verifies a business or organization and the information required to operate as a business participant.",
  },
  {
    question: "Why can a verification remain pending?",
    answer:
      "A submission can remain pending while required information is incomplete or while a compliance review is in progress.",
  },
  {
    question: "What happens if a document expires?",
    answer:
      "An expired document can require renewal before the related verification remains eligible.",
  },
  {
    question: "How is compliance information used?",
    answer:
      "Compliance information is used for identity, eligibility, security, risk and regulatory-control processes applicable to the MARKA service.",
  },
];
