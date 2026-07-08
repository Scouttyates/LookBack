// Post-lock-in pause on every mechanic before auto-advancing to the
// round-result screen. Long enough to read the outcome without feeling stalled.
export const REVEAL_DELAY_MS = 2500;

// Per-item reveal inside multi-step mechanics. Shorter than REVEAL_DELAY_MS
// because the pause fires repeatedly within a single round.
export const ITEM_REVEAL_DELAY_MS = 1200;
