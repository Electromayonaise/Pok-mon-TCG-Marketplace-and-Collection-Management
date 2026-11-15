// The Reference Seed Profile (PRD §3; Impl-1 statement §4.3): the one entry point for tests that
// need a realistic marketplace. The data is generated, never stored: `seedMarketplace` writes it
// into the test file's database at the virtual instant T0, and `summarize` reads its counts back.
export { T0 } from '../solu2/fixtures.js';
export { businessId, buyerId, catalogLayout, entryId, individualId, seedMarketplace, summarize, type SeedSummary } from '../solu2/seed-marketplace.js';
