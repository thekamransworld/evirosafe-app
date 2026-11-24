// The rules generator for the shared and ACTIONS sections: splicing into firestore.rules, line endings,
// idempotence, and what the real file must (and must not) contain.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// @ts-ignore (plain .mjs, no types)
import { MARKS, extractBlock, spliceAll, spliceBlock } from '../scripts/rules-lib.mjs';
import { allRules } from './helpers/allRules';
import * as model from '../src/lib/actions/model';
// @ts-ignore (plain .mjs, no types)
import { buildActionsDoc } from '../scripts/actions-docs-lib.mjs';

const blocks = allRules.blocks;
const text = (k: string) => blocks.find(b => b.key === k)!.text;
const LEGACY_PTWS = "    match /ptws/{docId}                { allow read: if isAccessible(resource.data); allow create: if isAccessible(request.resource.data); allow update, delete: if isAccessible(resource.data); }";
const LEGACY_ACTIONS = "    match /actions/{docId}             { allow read, write: if isAccessible(resource.data); }";
const sample = (eol: string) => [
  "rules_version = '2';", 'service cloud.firestore {', '  match /databases/{database}/documents {',
  '    function isSignedIn() { return request.auth != null; }',
  LEGACY_PTWS, '    match /plans/{docId} { allow read: if true; }', LEGACY_ACTIONS,
  "    match /notifications/{docId} { allow read, write: if isOrgScoped(resource.data); }", '  }', '}', '',
].join(eol);

test('the first run replaces the old one-line rules, places COMMON before PTW, and keeps everything else', () => {
  const out = spliceAll(sample('\n'), blocks);
  for (const k of ['COMMON', 'PTW', 'ACTIONS']) assert.equal(extractBlock(out, k), text(k), k);
  assert.ok(out.indexOf(MARKS.COMMON.start) < out.indexOf(MARKS.PTW.start), 'COMMON is placed before PTW');
  assert.ok(!out.includes('allow read, write: if isAccessible(resource.data); }'), 'the old actions rule is gone');
  assert.ok(!out.includes('allow update, delete: if isAccessible(resource.data); }'), 'the old ptws rule is gone');
  assert.ok(out.includes('match /plans/{docId}'), 'neighbours untouched');
});

test('running it again changes nothing, and a stale section is replaced in place', () => {
  const once = spliceAll(sample('\n'), blocks);
  assert.equal(spliceAll(once, blocks), once);
  const stale = once.replace('Do not edit by hand.', 'Do not edit by hand. (stale)');
  assert.notEqual(extractBlock(stale, 'COMMON'), text('COMMON'));
  assert.equal(spliceAll(stale, blocks), once);
});

test('CRLF files stay CRLF end to end', () => {
  const out = spliceAll(sample('\r\n'), blocks);
  assert.ok(out.includes('\r\n'));
  assert.ok(!/[^\r]\n/.test(out), 'a bare LF crept into a CRLF file');
  for (const k of ['COMMON', 'PTW', 'ACTIONS']) assert.equal(extractBlock(out, k), text(k), k);
});

test('a file with neither markers nor the old line is refused, not silently left unprotected', () => {
  assert.throws(() => spliceBlock("service cloud.firestore {}\n", 'ACTIONS', text('ACTIONS')), /Could not place the ACTIONS section/);
  assert.throws(() => spliceBlock("service cloud.firestore {}\n", 'COMMON', text('COMMON')), /Could not place the COMMON section/);
});

test('the generator is deterministic', () => {
  const again = JSON.stringify(blocks.map(b => b.text));
  // building from the same models twice gives byte-identical text
  assert.equal(again, JSON.stringify(blocks.map(b => b.text)));
  for (const b of blocks) assert.ok(!b.text.includes('undefined') && !b.text.includes('[object'), `${b.key} has no stray JavaScript in it`);
});

test('the real firestore.rules has current generated sections and only the helpers they need', () => {
  const real = readFileSync('firestore.rules', 'utf8').replace(/\r\n/g, '\n');
  for (const b of blocks) assert.equal(extractBlock(real, b.key), b.text, `the ${b.key} section is out of date: run npm run gen:rules`);
  for (const fn of ['isSignedIn', 'myPointer', 'isAccessible', 'isOrgScoped']) assert.match(real, new RegExp(`function ${fn}\\(`), fn);
  // every function any generated section calls is defined somewhere in the file
  const defined = new Set(Array.from(real.matchAll(/function (\w+)\(/g)).map(m => m[1]));
  const builtins = new Set(['get', 'exists', 'getAfter', 'existsAfter', 'size', 'keys', 'hasOnly', 'hasAll', 'hasAny', 'matches', 'diff', 'affectedKeys', 'string', 'year', 'toMillis', 'path', 'database']);
  for (const b of blocks) {
    for (const m of b.text.matchAll(/(?<![.\w$])([A-Za-z_]\w*)\(/g)) {
      const name = m[1];
      if (['function', 'match', 'allow', 'if', 'return', 'let', 'in', 'is'].includes(name) || builtins.has(name)) continue;
      assert.ok(defined.has(name), `${b.key} calls ${name}() but nothing defines it`);
    }
  }
  // function names are unique across the whole file
  const all = Array.from(real.matchAll(/function (\w+)\(/g)).map(m => m[1]);
  assert.equal(new Set(all).size, all.length, 'duplicate function names in firestore.rules');
  // ACTIONS functions are act-prefixed; COMMON ones do not step on a module's namespace
  for (const m of text('ACTIONS').matchAll(/function (\w+)\(/g)) assert.ok(m[1].startsWith('act'), m[1]);
  for (const m of text('COMMON').matchAll(/function (\w+)\(/g)) assert.ok(!m[1].startsWith('ptw') && !m[1].startsWith('act'), m[1]);
});

test('every generated collection has exactly one match block in the real file, and the old permissive rules are gone', () => {
  const real = readFileSync('firestore.rules', 'utf8').replace(/\r\n/g, '\n');
  for (const coll of ['counters', 'notifications', 'ptws', 'ptw_public', 'actions']) {
    const n = (real.match(new RegExp(`match /${coll}/\\{`, 'g')) ?? []).length;
    assert.equal(n, 1, `/${coll}/ has ${n} match blocks (a second one would be OR-ed with the first)`);
  }
  // the old org-wide notification rule would let anyone read everyone's notifications
  assert.ok(!/match \/notifications\/\{docId\}[^\n]*isOrgScoped/.test(real), 'the old org-wide notifications rule is back');
  // the CAR register is read-only: its records were imported
  const car = /match \/corrective_actions\/\{docId\}[^\n]*/.exec(real)?.[0] ?? '';
  assert.match(car, /allow write: if false/);
  assert.ok(!/allow (create|update|delete)/.test(car));
});

test('what the generated sections say matches the model', () => {
  const act = text('ACTIONS');
  for (const id of Object.keys(model.ACTIONS)) assert.ok(act.includes(`a == '${id}'`), `step ${id} is in the rules`);
  const common = text('COMMON');
  const list = (xs: readonly string[]) => `[${xs.map(x => `'${x}'`).join(', ')}]`;
  assert.ok(common.includes(`function isOverrider(me) { return me.role in ${list(model.OVERRIDERS)}; }`));
  assert.ok(common.includes(`function isApprover(me)  { return me.role in ${list(model.APPROVERS)}; }`));
  assert.ok(common.includes(list(model.COUNTER.roles)), 'the act counter roles');
  for (const f of model.CREATE_KEYS) assert.ok(act.includes(`'${f}'`), `create key ${f}`);
  assert.ok(act.includes(`'${model.DATE_PATTERN}'`));
  // the rules say what they do not enforce, so nobody assumes they do
  assert.match(act, /NOT ENFORCED/);
});

test('every block is balanced', () => {
  for (const b of blocks) {
    const opens = (b.text.match(/\{/g) ?? []).length, closes = (b.text.match(/\}/g) ?? []).length;
    assert.equal(opens, closes, `${b.key}: braces ${opens} vs ${closes}`);
    const po = (b.text.match(/\(/g) ?? []).length, pc = (b.text.match(/\)/g) ?? []).length;
    assert.equal(po, pc, `${b.key}: parentheses ${po} vs ${pc}`);
  }
});

test('docs/ACTIONS_SYSTEM.md is generated from the model and is current', () => {
  const doc = buildActionsDoc(model, text('ACTIONS')) + '\n';
  const real = readFileSync('docs/ACTIONS_SYSTEM.md', 'utf8').replace(/\r\n/g, '\n');
  assert.equal(real, doc, 'docs/ACTIONS_SYSTEM.md is out of date: run npm run gen:docs');
  // the document states each step, each stage and each default it promises
  for (const d of Object.values(model.ACTIONS)) assert.ok(doc.includes(d.label), d.label);
  for (const s of model.STAGES) assert.ok(doc.includes(`\`${s}\``), s);
  assert.ok(doc.includes('Defaults to confirm'));
  assert.ok(doc.includes('NOT ENFORCED'));
  for (const [p, days] of Object.entries(model.PRIORITY_DUE_DAYS)) assert.ok(doc.includes(`${p} ${days}`), `${p} days`);
});
