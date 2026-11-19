// The rules generator: splicing into firestore.rules, line endings, idempotence,
// and that the real file has what the generated section depends on.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// @ts-ignore (plain .mjs, no types)
import { buildPtwRules, extractBlock, spliceRules, START_MARK, END_MARK } from '../scripts/ptw-rules-lib.mjs';
import * as model from '../src/lib/ptw/model';

const { text } = buildPtwRules(model);
const LEGACY = "    match /ptws/{docId}                { allow read: if isAccessible(resource.data); allow create: if isAccessible(request.resource.data); allow update, delete: if isAccessible(resource.data); }";
const sample = (eol: string) => ['rules_version = \'2\';', 'service cloud.firestore {', '  match /databases/{database}/documents {', LEGACY, '    match /plans/{docId} { allow read: if true; }', '  }', '}', ''].join(eol);

test('the first run replaces the old one-line ptws rule and keeps everything else', () => {
  const out = spliceRules(sample('\n'), text);
  assert.ok(out.includes(START_MARK) && out.includes(END_MARK));
  assert.ok(!out.includes('allow update, delete: if isAccessible(resource.data); }'), 'old permissive rule is gone');
  assert.ok(out.includes('match /plans/{docId}'), 'neighbours untouched');
  assert.equal(extractBlock(out), text);
});

test('running it again changes nothing (idempotent), and a stale section is replaced in place', () => {
  const once = spliceRules(sample('\n'), text);
  assert.equal(spliceRules(once, text), once);
  const stale = once.replace('Do not edit by hand.', 'Do not edit by hand. (stale)');
  assert.notEqual(extractBlock(stale), text);
  assert.equal(spliceRules(stale, text), once);
});

test('CRLF files stay CRLF end to end', () => {
  const out = spliceRules(sample('\r\n'), text);
  assert.ok(out.includes('\r\n'));
  assert.ok(!/[^\r]\n/.test(out), 'a bare LF crept into a CRLF file');
  assert.equal(extractBlock(out), text, 'check mode compares LF-normalised text');
});

test('a file with neither markers nor the old line is refused, not silently left unprotected', () => {
  assert.throws(() => spliceRules("service cloud.firestore {}\n", text), /Could not find/);
});

test('the real firestore.rules has the helpers the generated section calls, and the old line or a current section', () => {
  const real = readFileSync('firestore.rules', 'utf8');
  for (const fn of ['isSignedIn', 'myPointer', 'isAccessible']) assert.match(real, new RegExp(`function ${fn}\\(`), fn);
  assert.ok(extractBlock(real) !== null || /match \/ptws\/\{docId\}/.test(real), 'neither a generated section nor the legacy ptws rule found');
  // the generated section may only use helpers that exist
  const used = new Set((text.match(/\b(isSignedIn|myPointer|isAccessible|isOrgScoped|myRole|myOrgId)\(/g) ?? []).map(s => s.slice(0, -1)));
  for (const fn of used) assert.match(real, new RegExp(`function ${fn}\\(`), `generated rules call ${fn}() but firestore.rules does not define it`);
});

test('every generated function name is unique and prefixed, so it cannot shadow an existing helper', () => {
  const real = readFileSync('firestore.rules', 'utf8');
  const have = (extractBlock(real) ? real.replace(extractBlock(real) as string, '') : real);
  const names = Array.from(text.matchAll(/function (\w+)\(/g)).map(m => m[1]);
  assert.equal(new Set(names).size, names.length, 'duplicate function names');
  for (const n of names) {
    assert.ok(n.startsWith('ptw'), `${n} is not ptw-prefixed`);
    assert.ok(!new RegExp(`function ${n}\\(`).test(have), `${n} already exists in firestore.rules`);
  }
});

test('the generated block is balanced and has one match block per collection', () => {
  const open = (text.match(/\{/g) ?? []).length, close = (text.match(/\}/g) ?? []).length;
  assert.equal(open, close, 'unbalanced braces');
  assert.equal((text.match(/\(/g) ?? []).length, (text.match(/\)/g) ?? []).length, 'unbalanced parentheses');
  assert.equal((text.match(/^\s*match \//gm) ?? []).length, 3);
  for (const m of ['/ptws/{docId}', '/ptw_public/{token}', '/counters/{counterId}']) assert.ok(text.includes(`match ${m}`), m);
});
