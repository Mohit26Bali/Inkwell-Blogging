// Vitest runs in plain Node, so the real "server-only" package (which throws outside Next's server
// bundle) is aliased to this empty module, letting server modules be tested directly.
export {};
