// Loads .env (if present) so tests can find the PostgreSQL server. Integration tests never use the
// DATABASE_URL database itself: they create and drop a throwaway database on the same server.
try {
  process.loadEnvFile(".env");
} catch {
  // no .env (e.g. CI): everything needed comes from the environment
}
