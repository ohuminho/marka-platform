import assert from "node:assert/strict";
import { isLoginRequestBody } from "../../../src/core/authentication/login-input";

const validBody = { email: "founder@example.com", password: "not-a-real-password" };

assert.equal(isLoginRequestBody(validBody), true);
assert.equal(isLoginRequestBody({}), true);
assert.equal(isLoginRequestBody(null), false);
assert.equal(isLoginRequestBody(undefined), false);
assert.equal(isLoginRequestBody([]), false);
assert.equal(isLoginRequestBody("email"), false);
assert.equal(isLoginRequestBody(42), false);

console.log("Login request body validation tests passed.");
