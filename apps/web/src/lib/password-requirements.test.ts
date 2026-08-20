import assert from 'node:assert/strict';
import { checkPasswordRequirements } from '@buyseekk/shared';

const empty = checkPasswordRequirements('');
assert.equal(empty.minLength, false);
assert.equal(empty.uppercase, false);
assert.equal(empty.lowercase, false);
assert.equal(empty.number, false);

const partial = checkPasswordRequirements('Pass1');
assert.equal(partial.minLength, false);
assert.equal(partial.uppercase, true);
assert.equal(partial.lowercase, true);
assert.equal(partial.number, true);

const complete = checkPasswordRequirements('ValidPass1');
assert.equal(complete.minLength, true);
assert.equal(complete.uppercase, true);
assert.equal(complete.lowercase, true);
assert.equal(complete.number, true);

console.log('password-requirements-ui: all assertions passed');
