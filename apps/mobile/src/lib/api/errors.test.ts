import assert from 'node:assert/strict';
import {
  ApiError,
  isInvalidSessionError,
  isRetriableTransportError,
  parseApiErrorBody,
} from './errors';

assert.equal(parseApiErrorBody(401, { message: 'Credenciales inválidas' }).code, 'UNAUTHORIZED');
assert.equal(parseApiErrorBody(401, { message: 'Credenciales inválidas' }).message, 'Credenciales inválidas');

assert.equal(parseApiErrorBody(409, { message: 'Email ya registrado' }).code, 'CONFLICT');

const validation = parseApiErrorBody(400, {
  message: ['email must be an email', 'Debés aceptar los términos y la política de privacidad'],
});
assert.equal(validation.code, 'VALIDATION');
assert.match(validation.message, /email must be an email/);

assert.equal(parseApiErrorBody(500, { message: 'Internal' }).code, 'SERVER');
assert.equal(isRetriableTransportError(parseApiErrorBody(503, {})), true);
assert.equal(isInvalidSessionError(parseApiErrorBody(401, {})), true);
assert.equal(isInvalidSessionError(parseApiErrorBody(500, {})), false);

const net = new ApiError('NETWORK', 'Sin conexión');
assert.equal(isRetriableTransportError(net), true);
assert.equal(isInvalidSessionError(net), false);

console.log('api/errors: all assertions passed');
