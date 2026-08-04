import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const html = readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

test('starts with the HTML doctype', () => {
  assert.ok(html.startsWith('<!DOCTYPE html>'));
});

test('contains exactly one <article> tag', () => {
  const matches = html.match(/<article/g) ?? [];
  assert.equal(matches.length, 1);
});

test('contains the required structural ids', () => {
  assert.match(html, /id="article-title"/);
  assert.match(html, /id="article-meta"/);
  assert.match(html, /id="article-content"/);
  assert.match(html, /id="like-button"/);
});

test('like button starts in the unliked state', () => {
  const buttonMatch = html.match(/<button[^>]*id="like-button"[^>]*>([^<]*)<\/button>/);
  assert.ok(buttonMatch, 'like-button element not found');
  const [openingAndText, text] = buttonMatch;
  assert.match(openingAndText, /aria-pressed="false"/);
  assert.equal(text.trim(), '🤍 Like');
});

test('contains no CSS', () => {
  assert.doesNotMatch(html, /<style/);
  assert.doesNotMatch(html, / style=/);
  assert.doesNotMatch(html, /<link rel="stylesheet"/);
});

test('contains a <script> tag', () => {
  assert.match(html, /<script/);
});
