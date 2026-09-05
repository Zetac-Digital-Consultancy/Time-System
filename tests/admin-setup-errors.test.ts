import test from "node:test";
import assert from "node:assert/strict";
import { AdminSetupError, adminSetupErrorMessage } from "../scripts/admin-setup-errors";

test("setup errors explain known input and database failures without leaking raw data", () => {
  const sensitive = "postgresql://admin:private-password@db/platform MFA-SECRET";
  assert.match(adminSetupErrorMessage(new AdminSetupError("Passwords do not match"), "password confirmation"), /Passwords do not match/);
  assert.match(adminSetupErrorMessage({ name: "ZodError", message: sensitive }, "password"), /15 characters/);
  assert.match(adminSetupErrorMessage({ code: "P2022", message: sensitive }, "saving account"), /column is missing/);
  assert.match(adminSetupErrorMessage({ code: "P2002", message: sensitive }, "saving account"), /already exists/);
  for (const error of [new Error(sensitive), { code: sensitive, message: sensitive }, { code: "P2022", message: sensitive }]) {
    assert.ok(!adminSetupErrorMessage(error, "saving account").includes(sensitive));
  }
});
