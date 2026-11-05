import { readFileSync, writeFileSync } from 'node:fs';
const source = readFileSync(new URL('../uscardforum-duo-mobile.user.js', import.meta.url), 'utf8');
const metadata = source.match(/^\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==/)[0];
writeFileSync(new URL('../uscardforum-duo-mobile.meta.js', import.meta.url), metadata + '\n');
