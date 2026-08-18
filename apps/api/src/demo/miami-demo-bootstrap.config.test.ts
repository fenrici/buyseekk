import assert from 'node:assert/strict';
import { isMiamiDemoBootstrapEnabled } from './miami-demo-bootstrap.config';

assert.equal(isMiamiDemoBootstrapEnabled(undefined), false);
assert.equal(isMiamiDemoBootstrapEnabled(''), false);
assert.equal(isMiamiDemoBootstrapEnabled('false'), false);
assert.equal(isMiamiDemoBootstrapEnabled('0'), false);
assert.equal(isMiamiDemoBootstrapEnabled('no'), false);
assert.equal(isMiamiDemoBootstrapEnabled('true'), true);
assert.equal(isMiamiDemoBootstrapEnabled('1'), true);
assert.equal(isMiamiDemoBootstrapEnabled('yes'), true);

console.log('miami-demo-bootstrap.config: all assertions passed');
