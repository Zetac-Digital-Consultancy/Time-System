export class AdminSetupError extends Error {}

const databaseErrors: Record<string, string> = {
  P1000: "Database authentication failed. Check DATABASE_URL against the database's actual credentials.",
  P1001: "Cannot reach PostgreSQL. Check that the db service is healthy and DATABASE_URL uses the correct host.",
  P1002: "PostgreSQL connection timed out. Check the database service and network.",
  P1003: "The configured database does not exist. Check POSTGRES_DB and DATABASE_URL.",
  P1010: "The database user lacks access. Check its database permissions.",
  P2021: "A required table is missing. Apply the production migrations before creating an administrator.",
  P2022: "A required column is missing. Apply the production migrations and rebuild the migrator image.",
  P2002: "An account with that email already exists. Creation did not overwrite it.",
  P2004: "A database constraint rejected the account. Verify that all company/security migrations have been applied.",
  P2028: "The database transaction failed or timed out. Check PostgreSQL health and migration status before retrying.",
  ECONNREFUSED: "The database connection was refused. Check the db service and DATABASE_URL host/port.",
  ENOTFOUND: "The database hostname could not be resolved. Inside Compose, the database hostname is normally db.",
  "28P01": "Database authentication failed. Editing POSTGRES_PASSWORD alone does not change an existing database password.",
  "42501": "The database user lacks the required permissions.",
};

export function adminSetupErrorMessage(error: unknown, stage: string) {
  // Only our own fixed messages are safe to display. Prisma/driver messages can
  // contain connection strings, query arguments, password hashes or MFA secrets.
  if (error instanceof AdminSetupError) return error.message;
  if (error && typeof error === "object") {
    const code = "code" in error && typeof error.code === "string" ? error.code : "";
    if (databaseErrors[code]) return databaseErrors[code];
    if ("name" in error && error.name === "ZodError") {
      if (stage === "email") return "Enter a valid email address.";
      if (stage === "name") return "Enter a name containing at least two characters.";
      if (stage === "password") return "Use at least 15 characters and at most 72 UTF-8 bytes for the password.";
    }
  }
  return "Unexpected failure. Run the read-only --check command and check database migration status. Raw errors are withheld to protect credentials.";
}
