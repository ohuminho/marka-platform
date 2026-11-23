import assert from "node:assert/strict";
import { privateServiceProposalSchema } from "../../../src/core/private-services/proposal.schema";

const valid = {
  action: "ACCEPT",
  proposedFeeKz: 25000,
  proposalAvailability: "Segunda a sexta, mediante marcação.",
  proposalApproach: "Consulta inicial, análise do caso e definição dos próximos passos.",
};

assert.equal(privateServiceProposalSchema.safeParse(valid).success, true);
assert.equal(privateServiceProposalSchema.safeParse({ action: "DECLINE" }).success, true);
assert.equal(
  privateServiceProposalSchema.safeParse({ action: "ACCEPT" }).success,
  false,
  "An acceptance must include a fee, availability and professional approach."
);
assert.equal(
  privateServiceProposalSchema.safeParse({ ...valid, proposedFeeKz: -1 }).success,
  false,
  "A proposal cannot contain a negative fee."
);
assert.equal(
  privateServiceProposalSchema.safeParse({ ...valid, extra: "not allowed" }).success,
  false,
  "Unexpected fields must be rejected."
);

console.log("MARKA private service proposal tests passed.");
