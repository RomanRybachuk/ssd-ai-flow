import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
assert.ok(scriptMatch, 'inline <script> block not found in index.html');
const scriptText = scriptMatch[1];

function makeButton() {
  const attrs = { 'aria-pressed': 'false' };
  let clickHandler = null;
  return {
    textContent: '',
    setAttribute(k, v) {
      attrs[k] = v;
    },
    getAttribute(k) {
      return attrs[k];
    },
    addEventListener(type, handler) {
      if (type === 'click') clickHandler = handler;
    },
    click() {
      if (clickHandler) clickHandler();
    },
  };
}

function makeDocument(button) {
  return {
    getElementById(id) {
      return id === 'like-button' ? button : null;
    },
  };
}

function makeLocalStorage(initial = {}) {
  const store = { ...initial };
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = value;
    },
    _store: store,
  };
}

function makeThrowingLocalStorage() {
  return {
    getItem() {
      throw new Error('localStorage unavailable');
    },
    setItem() {
      throw new Error('localStorage unavailable');
    },
  };
}

function run(button, localStorage) {
  const document = makeDocument(button);
  const ctx = vm.createContext({ document, localStorage });
  vm.runInContext(scriptText, ctx);
}

test('fresh button + empty localStorage renders unliked state', () => {
  const button = makeButton();
  const localStorage = makeLocalStorage();
  run(button, localStorage);
  assert.equal(button.textContent, '🤍 Like');
  assert.equal(button.getAttribute('aria-pressed'), 'false');
});

test('clicking an unliked button switches to liked and persists', () => {
  const button = makeButton();
  const localStorage = makeLocalStorage();
  run(button, localStorage);
  button.click();
  assert.equal(button.textContent, '❤️ Liked');
  assert.equal(button.getAttribute('aria-pressed'), 'true');
  assert.equal(localStorage.getItem('html-blog:liked'), 'true');
});

test('pre-seeded liked state renders liked on load, before any click', () => {
  const button = makeButton();
  const localStorage = makeLocalStorage({ 'html-blog:liked': 'true' });
  run(button, localStorage);
  assert.equal(button.textContent, '❤️ Liked');
  assert.equal(button.getAttribute('aria-pressed'), 'true');
});

test('clicking a liked button switches back to unliked and persists', () => {
  const button = makeButton();
  const localStorage = makeLocalStorage({ 'html-blog:liked': 'true' });
  run(button, localStorage);
  button.click();
  assert.equal(button.textContent, '🤍 Like');
  assert.equal(button.getAttribute('aria-pressed'), 'false');
  assert.equal(localStorage.getItem('html-blog:liked'), 'false');
});

test('throwing localStorage does not break rendering or clicking', () => {
  const button = makeButton();
  const localStorage = makeThrowingLocalStorage();
  assert.doesNotThrow(() => run(button, localStorage));
  assert.equal(button.textContent, '🤍 Like');
  assert.equal(button.getAttribute('aria-pressed'), 'false');
  assert.doesNotThrow(() => button.click());
  assert.equal(button.textContent, '❤️ Liked');
  assert.equal(button.getAttribute('aria-pressed'), 'true');
});
