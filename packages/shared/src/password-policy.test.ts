import assert from 'node:assert/strict';
import { checkPasswordRequirements, isPasswordValid } from './password-policy';

assert.equal(isPasswordValid('Short1a'), false);
assert.equal(checkPasswordRequirements('Short1a').minLength, false);

assert.equal(isPasswordValid('alllower1'), false);
assert.equal(checkPasswordRequirements('alllower1').uppercase, false);

assert.equal(isPasswordValid('ALLUPPER1'), false);
assert.equal(checkPasswordRequirements('ALLUPPER1').lowercase, false);

assert.equal(isPasswordValid('NoNumberHere'), false);
assert.equal(checkPasswordRequirements('NoNumberHere').number, false);

assert.equal(isPasswordValid('ValidPass1'), true);
assert.equal(isPasswordValid('ValidPass1!'), true);

console.log('password-policy: all assertions passed');
