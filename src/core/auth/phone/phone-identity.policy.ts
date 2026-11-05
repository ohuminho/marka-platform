export interface VerifiedContactState {
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
}

/**
 * MARKA accepts either verified email or verified phone as a verified
 * contact channel. Government identity/KYC checks remain separate.
 */
export function hasVerifiedContact(
  state: VerifiedContactState
): boolean {
  return state.emailVerifiedAt !== null || state.phoneVerifiedAt !== null;
}
