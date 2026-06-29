// Single source of truth for all internal redirect paths.
// Import and use this everywhere so the three call sites can't drift apart.

/** Route that the authenticated user lands on (the expense list). */
export const PROTECTED_HOME = '/(protected)'
