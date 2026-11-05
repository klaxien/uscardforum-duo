const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');
const source = readFileSync('uscardforum-duo-mobile.user.js', 'utf8');

function boot({ iphone = true, framed = false, css = '', failed = false } = {}) {
  const styles = [], queries = [], warnings = [];
  const link = { href: 'https://www-cdn.uscardforum.com/stylesheets/common.css',
    media: '', isConnected: true, disabled: false, after: style => styles.push(style) };
  const nativeList = { addEventListener() {}, removeEventListener() {} };
  const originalMatchMedia = query => { queries.push(query); return nativeList; };
  const window = { matchMedia: originalMatchMedia };
  window.self = window;
  window.top = framed ? {} : window;
  const context = {
    window, screen: { width: 466, height: 678 }, devicePixelRatio: 3,
    navigator: { userAgent: iphone ? 'iPhone' : 'Macintosh' },
    location: { href: 'https://www.uscardforum.com/' }, URL,
    document: {
      head: { append: style => styles.push(style) },
      createElement: () => ({ dataset: {} }),
      querySelectorAll: () => css ? [link] : [],
    },
    MutationObserver: class { observe() {} },
    fetch: async () => ({ ok: !failed, status: failed ? 503 : 200, text: async () => css }),
    console: { warn: (...args) => warnings.push(args) },
  };
  vm.runInNewContext(source, context);
  return { window, originalMatchMedia, nativeList, styles, queries, link, warnings };
}

// Small evaluator for the width-only queries under test, not a browser CSS parser.
function matches(query, width) {
  const expression = query.replace(/(\d+(?:\.\d+)?)(rem|px)/g,
    (_, number, unit) => String(Number(number) * (unit === 'rem' ? 16 : 1)))
    .replace(/\bwidth\s*:/g, 'width ===')
    .replace(/\bwidth\b/g, String(width))
    .replace(/\band\b/g, '&&').replace(/\bor\b/g, '||').replace(/\bnot\b/g, '!');
  return vm.runInNewContext(expression);
}

test('only the tested device and top-level page are changed', () => {
  for (const options of [{ iphone: false }, { framed: true }]) {
    const env = boot(options);
    assert.equal(env.window.matchMedia, env.originalMatchMedia);
    assert.equal(env.styles.length, 0);
  }
});

test('portrait gets mobile queries; other widths retain original results', () => {
  const env = boot();
  for (const query of ['(width < 40rem)', '(width >= 40rem)', '(width <= 640px)']) {
    assert.equal(env.window.matchMedia(query), env.nativeList);
    const adjusted = env.queries.at(-1);
    assert.equal(matches(adjusted, 669), matches(query, 600));
    for (const width of [382, 594, 639, 640, 668, 670, 704, 951]) {
      assert.equal(matches(adjusted, width), matches(query, width), `${query} at ${width}`);
    }
  }
  for (const query of ['(prefers-color-scheme: dark)', '(height < 40rem)', '(width >= 48rem)']) {
    env.window.matchMedia(query);
    assert.equal(env.queries.at(-1), query);
  }
});

test('CSS keeps declarations and resource locations while changing the query', async () => {
  const env = boot({ css: '@media(width < 40rem){.topic{color:red;background:url(../images/icon.svg)}}' });
  await new Promise(setImmediate);
  assert.equal(env.link.disabled, true);
  const copy = env.styles.at(-1);
  assert.match(copy.textContent, /color:red/);
  assert.match(copy.textContent, /width: 669px/);
  assert.match(copy.textContent, /https:\/\/www-cdn.uscardforum.com\/images\/icon.svg/);
  assert.match(env.styles[0].textContent, /padding-inline: 32px/);
});

test('failed CSS fetch leaves the original stylesheet enabled', async () => {
  const env = boot({ css: '@media(width < 40rem){}', failed: true });
  await new Promise(setImmediate);
  assert.equal(env.link.disabled, false);
  assert.equal(env.styles.length, 1);
  assert.equal(env.warnings.length, 1);
});

test('update metadata and package version match the shipped script', () => {
  const metadata = source.match(/^\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==/)[0] + '\n';
  assert.equal(readFileSync('uscardforum-duo-mobile.meta.js', 'utf8'), metadata);
  assert.equal(source.match(/@version\s+(\S+)/)[1], require('../package.json').version);
  assert.match(metadata, /@updateURL\s+https:\/\/raw.githubusercontent.com\/klaxien\/uscardforum-duo\/main\/uscardforum-duo-mobile.meta.js/);
  assert.match(metadata, /@downloadURL\s+https:\/\/raw.githubusercontent.com\/klaxien\/uscardforum-duo\/main\/uscardforum-duo-mobile.user.js/);
});
