import { z } from "zod";

export const privateServiceProposalSchema = z.object({
  action: z.enum(["ACCEPT", "DECLINE"]),
  proposedFeeKz: z.number().int().min(0).max(1_000_000_000).optional(),
  proposalAvailability: z.string().trim().min(3).max(500).optional(),
  proposalApproach: z.string().trim().min(20).max(1500).optional(),
}).strict().superRefine((value, context) => {
  if (value.action === "ACCEPT" &&
      (value.proposedFeeKz === undefined || !value.proposalAvailability || !value.proposalApproach)) {
    context.addIssue({
      code: "custom",
      message: "Para aceitar, indica honorários, disponibilidade e abordagem profissional.",
      path: ["proposalApproach"],
    });
  }
});

export type PrivateServiceProposalInput = z.infer<typeof privateServiceProposalSchema>;
