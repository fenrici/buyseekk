import assert from 'node:assert/strict';
import {
  chatInboxFetchKey,
  isChatInboxBackgroundRefresh,
  shouldShowChatInboxInitialLoader,
  shouldShowChatInboxList,
} from './chat-inbox';

const key = chatInboxFetchKey('u1', 'BUYER', 1);
assert.equal(key, 'u1:BUYER:1');

assert.equal(isChatInboxBackgroundRefresh(null, key, 0), false);
assert.equal(isChatInboxBackgroundRefresh(key, key, 3), true);
assert.equal(isChatInboxBackgroundRefresh(key, `${key}:other`, 3), false);

assert.equal(shouldShowChatInboxList(true, 0), false);
assert.equal(shouldShowChatInboxList(true, 2), true);
assert.equal(shouldShowChatInboxList(false, 0), true);

assert.equal(shouldShowChatInboxInitialLoader(true, 0), true);
assert.equal(shouldShowChatInboxInitialLoader(true, 2), false);
assert.equal(shouldShowChatInboxInitialLoader(false, 0), false);

console.log('chat-inbox: all assertions passed');
