import assert from 'node:assert/strict';
import {
  getChatUnreadSocketSubscriberCount,
  resetChatUnreadSocketBridge,
  subscribeChatInboxBump,
  subscribeChatUnreadState,
} from './chat-unread-socket';

resetChatUnreadSocketBridge();

let bumps = 0;
const unsubA = subscribeChatInboxBump(() => {
  bumps += 1;
});
const unsubB = subscribeChatInboxBump(() => {
  bumps += 1;
});

assert.equal(getChatUnreadSocketSubscriberCount(), 2);

let stateUpdates = 0;
const unsubState = subscribeChatUnreadState(() => {
  stateUpdates += 1;
});
assert.equal(getChatUnreadSocketSubscriberCount(), 3);

unsubA();
assert.equal(getChatUnreadSocketSubscriberCount(), 2);

unsubB();
unsubState();
assert.equal(getChatUnreadSocketSubscriberCount(), 0);

resetChatUnreadSocketBridge();
console.log('chat-unread-socket: all assertions passed');
