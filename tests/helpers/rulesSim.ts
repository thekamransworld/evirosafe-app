// A small interpreter for the subset of the Firestore rules language that the
// generated PTW section uses. It exists because the real emulator cannot run
// in every environment: it lets `npm run test:ptw` evaluate the ACTUAL
// generated rule text against realistic documents.
//
// It is deliberately STRICT: a missing field, a wrong type or an unknown method
// throws (a real rules engine would deny), so a rule that only works by
// accident fails here. It is not a replacement for `npm run test:rules`
// (the real emulator, needs Java); it catches logic and typing mistakes early.

// ─── values ───────────────────────────────────────────────────────────────

export class RulesError extends Error {}
const err = (m: string): never => { throw new RulesError(m); };

export class Ts { constructor(public ms: number) {} toMillis() { return this.ms; } year() { return new Date(this.ms).getUTCFullYear(); } }
class Dur { constructor(public ms: number) {} }
class RPath { constructor(public s: string) {} }
class RSet { constructor(public items: any[]) {} }
class MapDiff { constructor(public a: Record<string, any>, public b: Record<string, any>) {} }

const isMap = (v: any) => v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Ts) && !(v instanceof Dur) && !(v instanceof RPath) && !(v instanceof RSet) && !(v instanceof MapDiff);

function deepEq(a: any, b: any): boolean {
  if (a === b) return true;
  if (a instanceof Ts && b instanceof Ts) return a.ms === b.ms;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((x, i) => deepEq(x, b[i]));
  if (isMap(a) && isMap(b)) {
    const ka = Object.keys(a), kb = Object.keys(b);
    return ka.length === kb.length && ka.every(k => k in b && deepEq(a[k], b[k]));
  }
  return false;
}

// ─── tokenizer ────────────────────────────────────────────────────────────

type Tok = { k: 'num' | 'str' | 'id' | 'p' | 'eof'; v: string };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  const two = ['&&', '||', '==', '!=', '<=', '>='];
  while (i < src.length) {
    const c = src[i];
    if (/\s/.test(c)) { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (/[A-Za-z_]/.test(c)) { let j = i; while (j < src.length && /[A-Za-z0-9_]/.test(src[j])) j++; out.push({ k: 'id', v: src.slice(i, j) }); i = j; continue; }
    if (/[0-9]/.test(c)) { let j = i; while (j < src.length && /[0-9.]/.test(src[j])) j++; out.push({ k: 'num', v: src.slice(i, j) }); i = j; continue; }
    if (c === "'" || c === '"') {
      let j = i + 1, s = '';
      while (j < src.length && src[j] !== c) { if (src[j] === '\\') j++; s += src[j]; j++; }
      if (j >= src.length) err('unterminated string');
      out.push({ k: 'str', v: s }); i = j + 1; continue;
    }
    const t2 = src.slice(i, i + 2);
    if (two.includes(t2)) { out.push({ k: 'p', v: t2 }); i += 2; continue; }
    if ('+-*/%?:()[]{},.;=!<>$'.includes(c)) { out.push({ k: 'p', v: c }); i++; continue; }
    err(`unexpected character "${c}"`);
  }
  out.push({ k: 'eof', v: '' });
  return out;
}

// ─── parser ───────────────────────────────────────────────────────────────

type Node = any;
export interface FuncDef { name: string; params: string[]; lets: { name: string; expr: Node }[]; ret: Node }

class Parser {
  i = 0;
  constructor(public toks: Tok[]) {}
  peek(o = 0) { return this.toks[this.i + o]; }
  next() { return this.toks[this.i++]; }
  isP(v: string, o = 0) { const t = this.peek(o); return t.k === 'p' && t.v === v; }
  isId(v: string, o = 0) { const t = this.peek(o); return t.k === 'id' && t.v === v; }
  expectP(v: string) { const t = this.next(); if (t.k !== 'p' || t.v !== v) err(`expected "${v}" but found "${t.v}"`); }
  expectId(): string { const t = this.next(); if (t.k !== 'id') err(`expected identifier but found "${t.v}"`); return t.v; }

  parseFunctions(): FuncDef[] {
    const fs: FuncDef[] = [];
    while (this.peek().k !== 'eof') {
      if (!this.isId('function')) err(`expected "function" but found "${this.peek().v}"`);
      this.next();
      const name = this.expectId();
      this.expectP('(');
      const params: string[] = [];
      while (!this.isP(')')) { params.push(this.expectId()); if (this.isP(',')) this.next(); }
      this.expectP(')'); this.expectP('{');
      const lets: { name: string; expr: Node }[] = [];
      while (this.isId('let')) { this.next(); const n = this.expectId(); this.expectP('='); lets.push({ name: n, expr: this.expr() }); this.expectP(';'); }
      if (!this.isId('return')) err(`function ${name}: expected "return"`);
      this.next();
      const ret = this.expr();
      this.expectP(';'); this.expectP('}');
      fs.push({ name, params, lets, ret });
    }
    return fs;
  }

  parseExpression(): Node { const e = this.expr(); if (this.peek().k !== 'eof') err(`unexpected "${this.peek().v}"`); return e; }

  expr(): Node {
    const c = this.or();
    if (this.isP('?')) { this.next(); const a = this.expr(); this.expectP(':'); const b = this.expr(); return { t: 'tern', c, a, b }; }
    return c;
  }
  or(): Node { let l = this.and(); while (this.isP('||')) { this.next(); l = { t: 'or', l, r: this.and() }; } return l; }
  and(): Node { let l = this.eq(); while (this.isP('&&')) { this.next(); l = { t: 'and', l, r: this.eq() }; } return l; }
  eq(): Node { let l = this.rel(); while (this.isP('==') || this.isP('!=')) { const op = this.next().v; l = { t: 'bin', op, l, r: this.rel() }; } return l; }
  rel(): Node {
    let l = this.add();
    for (;;) {
      if (this.isP('<') || this.isP('<=') || this.isP('>') || this.isP('>=')) { const op = this.next().v; l = { t: 'bin', op, l, r: this.add() }; }
      else if (this.isId('in')) { this.next(); l = { t: 'in', l, r: this.add() }; }
      else if (this.isId('is')) { this.next(); l = { t: 'is', l, ty: this.expectId() }; }
      else return l;
    }
  }
  add(): Node { let l = this.mul(); while (this.isP('+') || this.isP('-')) { const op = this.next().v; l = { t: 'bin', op, l, r: this.mul() }; } return l; }
  mul(): Node { let l = this.unary(); while (this.isP('*') || this.isP('%') || (this.isP('/') && this.peek(1).k !== 'id')) { const op = this.next().v; l = { t: 'bin', op, l, r: this.unary() }; } return l; }
  unary(): Node {
    if (this.isP('!')) { this.next(); return { t: 'not', e: this.unary() }; }
    if (this.isP('-')) { this.next(); return { t: 'neg', e: this.unary() }; }
    return this.postfix();
  }
  postfix(): Node {
    let e = this.primary();
    for (;;) {
      if (this.isP('.')) { this.next(); e = { t: 'mem', o: e, k: this.expectId() }; }
      else if (this.isP('(')) {
        this.next(); const args: Node[] = [];
        while (!this.isP(')')) { args.push(this.expr()); if (this.isP(',')) this.next(); }
        this.expectP(')'); e = { t: 'call', f: e, args };
      } else if (this.isP('[')) {
        this.next();
        if (this.isP(':')) { this.next(); const hi = this.expr(); this.expectP(']'); e = { t: 'slice', o: e, lo: null, hi }; continue; }
        const a = this.expr();
        if (this.isP(':')) { this.next(); const hi = this.isP(']') ? null : this.expr(); this.expectP(']'); e = { t: 'slice', o: e, lo: a, hi }; }
        else { this.expectP(']'); e = { t: 'idx', o: e, i: a }; }
      } else return e;
    }
  }
  primary(): Node {
    const t = this.next();
    if (t.k === 'num') return { t: 'lit', v: Number(t.v) };
    if (t.k === 'str') return { t: 'lit', v: t.v };
    if (t.k === 'id') {
      if (t.v === 'true') return { t: 'lit', v: true };
      if (t.v === 'false') return { t: 'lit', v: false };
      if (t.v === 'null') return { t: 'lit', v: null };
      return { t: 'id', n: t.v };
    }
    if (t.k === 'p') {
      if (t.v === '(') { const e = this.expr(); this.expectP(')'); return e; }
      if (t.v === '[') { const items: Node[] = []; while (!this.isP(']')) { items.push(this.expr()); if (this.isP(',')) this.next(); } this.expectP(']'); return { t: 'list', items }; }
      if (t.v === '{') { const props: [string, Node][] = []; while (!this.isP('}')) { const k = this.next().v; this.expectP(':'); props.push([k, this.expr()]); if (this.isP(',')) this.next(); } this.expectP('}'); return { t: 'map', props }; }
      if (t.v === '/') {
        const segs: Node[] = [];
        for (;;) {
          if (this.isP('$')) { this.next(); this.expectP('('); segs.push(this.expr()); this.expectP(')'); }
          else { const s = this.next(); if (s.k !== 'id' && s.k !== 'num') err(`bad path segment "${s.v}"`); segs.push({ t: 'lit', v: s.v }); }
          if (this.isP('/') && (this.peek(1).k === 'id' || this.isP('$', 1))) { this.next(); continue; }
          break;
        }
        return { t: 'path', segs };
      }
    }
    return err(`unexpected "${t.v}"`);
  }
}

// ─── evaluator ────────────────────────────────────────────────────────────

export interface Stats { evals: number; accessCalls: number; byFn?: Record<string, number> }

export class RulesSim {
  funcs = new Map<string, FuncDef>();
  stats: Stats = { evals: 0, accessCalls: 0 };
  /** Documents before / after the request, keyed by "/collection/id". */
  before: Record<string, any> = {};
  after: Record<string, any> = {};
  request: any = {};
  resource: any = null;
  /** Host functions (isSignedIn, myPointer, isAccessible...) supplied by the test. */
  host: Record<string, (...a: any[]) => any> = {};

  load(src: string) {
    for (const f of new Parser(tokenize(src)).parseFunctions()) this.funcs.set(f.name, f);
  }

  /** Evaluates one expression string with extra variables, e.g. { docId, token }. */
  evalExpr(src: string, vars: Record<string, any> = {}): any {
    return this.ev(new Parser(tokenize(src)).parseExpression(), { ...vars });
  }

  /** Calls a loaded function directly (used by the exhaustive tests). */
  call(name: string, args: any[]): any { return this.invoke(name, args); }

  private invoke(name: string, args: any[], depth = 0): any {
    if (depth > 20) err('function call depth exceeded');
    const f = this.funcs.get(name);
    if (!f) {
      if (this.host[name]) return this.host[name](...args);
      return err(`unknown function ${name}`);
    }
    if (args.length !== f.params.length) err(`${name}: expected ${f.params.length} args, got ${args.length}`);
    if (f.params.length > 7) err(`${name}: more than 7 parameters`);
    if (f.lets.length > 10) err(`${name}: more than 10 let bindings`);
    const env: Record<string, any> = {};
    f.params.forEach((p, i) => { env[p] = args[i]; });
    (env as any).__depth = depth + 1;
    const startEvals = this.stats.evals;
    for (const l of f.lets) env[l.name] = this.ev(l.expr, env);
    const out = this.ev(f.ret, env);
    if (this.stats.byFn) this.stats.byFn[name] = (this.stats.byFn[name] ?? 0) + (this.stats.evals - startEvals);
    return out;
  }

  private bool(v: any, what: string): boolean { if (typeof v !== 'boolean') err(`${what}: expected bool, got ${describe(v)}`); return v; }

  private ev(n: Node, env: Record<string, any>): any {
    this.stats.evals++;
    switch (n.t) {
      case 'lit': return n.v;
      case 'id': return this.ident(n.n, env);
      case 'list': return n.items.map((x: Node) => this.ev(x, env));
      case 'map': { const o: Record<string, any> = {}; for (const [k, v] of n.props) o[k] = this.ev(v, env); return o; }
      case 'path': return new RPath('/' + n.segs.map((s: Node) => String(this.ev(s, env))).join('/'));
      case 'not': return !this.bool(this.ev(n.e, env), '!');
      case 'neg': return -this.ev(n.e, env);
      case 'and': { const l = this.bool(this.ev(n.l, env), '&&'); if (!l) return false; return this.bool(this.ev(n.r, env), '&&'); }
      case 'or': { const l = this.bool(this.ev(n.l, env), '||'); if (l) return true; return this.bool(this.ev(n.r, env), '||'); }
      case 'tern': return this.bool(this.ev(n.c, env), '?:') ? this.ev(n.a, env) : this.ev(n.b, env);
      case 'bin': return this.binary(n.op, this.ev(n.l, env), this.ev(n.r, env));
      case 'in': { const l = this.ev(n.l, env), r = this.ev(n.r, env); return this.contains(r, l); }
      case 'is': return this.isType(this.ev(n.l, env), n.ty);
      case 'mem': return this.member(this.ev(n.o, env), n.k);
      case 'idx': return this.index(this.ev(n.o, env), this.ev(n.i, env));
      case 'slice': {
        const o = this.ev(n.o, env);
        if (!Array.isArray(o)) err('slice of a non-list');
        const lo = n.lo ? this.ev(n.lo, env) : 0, hi = n.hi ? this.ev(n.hi, env) : o.length;
        if (lo < 0 || hi > o.length || lo > hi) err(`slice [${lo}:${hi}] out of range for list of ${o.length}`);
        return o.slice(lo, hi);
      }
      case 'call': return this.callNode(n, env);
      default: return err(`unknown node ${n.t}`);
    }
  }

  private ident(name: string, env: Record<string, any>): any {
    if (name in env) return env[name];
    switch (name) {
      case 'request': return this.request;
      case 'resource': return this.resource;
      case 'database': return '(default)';
      case 'duration': return { __ns: 'duration' };
      default: return err(`unknown identifier ${name}`);
    }
  }

  private callNode(n: Node, env: Record<string, any>): any {
    const args = n.args.map((a: Node) => this.ev(a, env));
    const depth = (env as any).__depth ?? 0;
    if (n.f.t === 'id') {
      const name = n.f.n;
      switch (name) {
        case 'get': case 'getAfter': case 'exists': case 'existsAfter': return this.access(name, args[0]);
        case 'string': return typeof args[0] === 'number' ? String(args[0]) : err('string(): unsupported value');
        case 'int': return Math.trunc(Number(args[0]));
        default: return this.invoke(name, args, depth);
      }
    }
    if (n.f.t === 'mem') {
      const recv = this.ev(n.f.o, env);
      if (isMap(recv) && (recv as any).__ns === 'duration' && n.f.k === 'value') {
        const unit: Record<string, number> = { w: 6048e5, d: 864e5, h: 36e5, m: 6e4, s: 1e3, ms: 1 };
        if (!(args[1] in unit)) err(`duration.value: bad unit ${args[1]}`);
        return new Dur(args[0] * unit[args[1]]);
      }
      return this.method(recv, n.f.k, args);
    }
    return err('call of a non-function');
  }

  private access(kind: string, p: any): any {
    this.stats.accessCalls++;
    if (!(p instanceof RPath)) err(`${kind}: expected a path`);
    const key = p.s.replace(/^\/databases\/\(default\)\/documents/, '');
    const src = kind === 'get' || kind === 'exists' ? this.before : this.after;
    const found = Object.prototype.hasOwnProperty.call(src, key) && src[key] !== undefined && src[key] !== null;
    if (kind === 'exists' || kind === 'existsAfter') return found;
    if (!found) err(`${kind}: document ${key} does not exist`);
    return { data: src[key], id: key.split('/').pop() };
  }

  private binary(op: string, l: any, r: any): any {
    switch (op) {
      case '==': return deepEq(l, r);
      case '!=': return !deepEq(l, r);
      case '<': case '<=': case '>': case '>=': {
        const a = l instanceof Ts ? l.ms : l, b = r instanceof Ts ? r.ms : r;
        if (typeof a !== typeof b || (typeof a !== 'number' && typeof a !== 'string')) err(`cannot compare ${describe(l)} with ${describe(r)}`);
        return op === '<' ? a < b : op === '<=' ? a <= b : op === '>' ? a > b : a >= b;
      }
      case '+':
        if (typeof l === 'number' && typeof r === 'number') return l + r;
        if (typeof l === 'string' && typeof r === 'string') return l + r;
        if (l instanceof Ts && r instanceof Dur) return new Ts(l.ms + r.ms);
        if (Array.isArray(l) && Array.isArray(r)) return [...l, ...r];
        return err(`cannot add ${describe(l)} and ${describe(r)}`);
      case '-': if (typeof l === 'number' && typeof r === 'number') return l - r; return err('bad subtraction');
      case '*': return l * r;
      case '/': return l / r;
      case '%': return l % r;
      default: return err(`unknown operator ${op}`);
    }
  }

  private contains(container: any, item: any): boolean {
    if (Array.isArray(container)) return container.some(x => deepEq(x, item));
    if (container instanceof RSet) return container.items.some(x => deepEq(x, item));
    if (isMap(container)) { if (typeof item !== 'string') err('map key must be a string'); return Object.prototype.hasOwnProperty.call(container, item); }
    return err(`"in" on ${describe(container)}`);
  }

  private isType(v: any, ty: string): boolean {
    switch (ty) {
      case 'string': return typeof v === 'string';
      case 'int': return typeof v === 'number' && Number.isInteger(v);
      case 'float': case 'number': return typeof v === 'number';
      case 'bool': return typeof v === 'boolean';
      case 'list': return Array.isArray(v);
      case 'map': return isMap(v);
      case 'timestamp': return v instanceof Ts;
      case 'duration': return v instanceof Dur;
      case 'path': return v instanceof RPath;
      case 'set': return v instanceof RSet;
      default: return err(`unknown type ${ty}`);
    }
  }

  private member(o: any, k: string): any {
    if (isMap(o)) { if (!Object.prototype.hasOwnProperty.call(o, k)) err(`no field "${k}"`); return o[k]; }
    return err(`member "${k}" of ${describe(o)}`);
  }

  private index(o: any, i: any): any {
    if (Array.isArray(o)) { if (!Number.isInteger(i) || i < 0 || i >= o.length) err(`list index ${i} out of range (${o.length})`); return o[i]; }
    if (isMap(o)) { if (typeof i !== 'string' || !Object.prototype.hasOwnProperty.call(o, i)) err(`no key ${String(i)}`); return o[i]; }
    return err(`index of ${describe(o)}`);
  }

  private method(recv: any, name: string, args: any[]): any {
    if (recv instanceof Ts) { if (name === 'year') return recv.year(); err(`Timestamp.${name} not supported`); }
    if (typeof recv === 'string') {
      if (name === 'size') return recv.length;
      if (name === 'matches') return new RegExp(`^(?:${args[0]})$`).test(recv);
      return err(`String.${name} not supported`);
    }
    if (Array.isArray(recv)) {
      if (name === 'size') return recv.length;
      if (name === 'hasAll') return args[0].every((x: any) => this.contains(recv, x));
      if (name === 'hasAny') return args[0].some((x: any) => this.contains(recv, x));
      if (name === 'hasOnly') return recv.every((x: any) => this.contains(args[0], x));
      return err(`List.${name} not supported`);
    }
    if (recv instanceof RSet) {
      if (name === 'size') return recv.items.length;
      if (name === 'hasAll') return args[0].every((x: any) => this.contains(recv, x));
      if (name === 'hasAny') return args[0].some((x: any) => this.contains(recv, x));
      if (name === 'hasOnly') return recv.items.every(x => this.contains(args[0], x));
      return err(`Set.${name} not supported`);
    }
    if (recv instanceof MapDiff) {
      const { a, b } = recv;
      const keys = (o: any) => Object.keys(o);
      const added = keys(a).filter(k => !(k in b));
      const removed = keys(b).filter(k => !(k in a));
      const changed = keys(a).filter(k => k in b && !deepEq(a[k], b[k]));
      if (name === 'affectedKeys') return new RSet([...added, ...removed, ...changed]);
      if (name === 'addedKeys') return new RSet(added);
      if (name === 'removedKeys') return new RSet(removed);
      if (name === 'changedKeys') return new RSet(changed);
      return err(`MapDiff.${name} not supported`);
    }
    if (isMap(recv)) {
      if (name === 'get') { const [k, d] = args; return Object.prototype.hasOwnProperty.call(recv, k) ? recv[k] : d; }
      if (name === 'keys') return Object.keys(recv);
      if (name === 'size') return Object.keys(recv).length;
      if (name === 'diff') { if (!isMap(args[0])) err('diff() needs a map'); return new MapDiff(recv, args[0]); }
      return err(`Map.${name} not supported`);
    }
    return err(`method ${name} on ${describe(recv)}`);
  }
}

function describe(v: any): string {
  if (v === null) return 'null';
  if (v instanceof Ts) return 'timestamp';
  if (Array.isArray(v)) return 'list';
  return typeof v;
}

// ─── a tiny database to run requests against ──────────────────────────────

export interface PointerDoc { docId: string; org_id: string; role: string; project_ids?: string[] }

export interface Op { kind: 'set' | 'update' | 'delete'; path: string; data?: Record<string, any> }

export interface MatchDef { path: string; allows: { ops: string[]; expr: string }[] }

export class World {
  docs: Record<string, any> = {};
  sim = new RulesSim();
  lastStats: Stats = { evals: 0, accessCalls: 0 };
  /** Worst inclusive expression count seen for each rule function (for budgeting). */
  profile: Record<string, number> = {};
  constructor(functions: string, public matches: MatchDef[]) {
    this.sim.load(functions);
  }

  seed(path: string, data: any) { this.docs[path] = data; }
  pointer(uid: string, p: PointerDoc) { this.docs[`/users_by_uid/${uid}`] = p; }

  /** Evaluates the allow rule that governs `op` against the current database. Returns null when allowed, else why not. */
  private check(uid: string | null, op: Op, afterDocs: Record<string, any>, now: number): string | null {
    const [, coll, id] = op.path.split('/');
    const match = this.matches.find(m => m.path.split('/')[1] === coll);
    if (!match) return `no match block for /${coll}`;
    const existed = op.path in this.docs;
    const kind = op.kind === 'delete' ? 'delete' : existed ? 'update' : 'create';
    const rule = match.allows.find(a => a.ops.includes(kind));
    if (!rule) return `no ${kind} rule`;

    const sim = this.sim;
    sim.before = this.docs;
    sim.after = afterDocs;
    sim.request = {
      auth: uid ? { uid } : null,
      time: new Ts(now),
      resource: { data: afterDocs[op.path] },
    };
    sim.resource = existed ? { data: this.docs[op.path] } : null;
    sim.host = {
      isSignedIn: () => !!uid,
      myPointer: () => {
        if (!uid) err('not signed in');
        const p = this.docs[`/users_by_uid/${uid}`];
        if (!p) err('no pointer');
        sim.stats.accessCalls++;
        return p;
      },
    };
    const vars: Record<string, any> = {};
    for (const seg of match.path.split('/')) { const m = /^\{(\w+)\}$/.exec(seg); if (m) vars[m[1]] = id; }
    try {
      const ok = sim.evalExpr(rule.expr, vars);
      return ok === true ? null : `rule returned ${String(ok)}`;
    } catch (e) {
      return e instanceof RulesError ? `error: ${e.message}` : (() => { throw e; })();
    }
  }

  /** A batch / transaction: every op must be allowed, judged against the state after ALL ops. */
  commit(uid: string | null, ops: Op[], now: number): { ok: true } | { ok: false; op: Op; why: string } {
    const after: Record<string, any> = { ...this.docs };
    for (const op of ops) {
      if (op.kind === 'delete') delete after[op.path];
      else after[op.path] = op.data;
    }
    let evals = 0, access = 0;
    for (const op of ops) {
      this.sim.stats = { evals: 0, accessCalls: 0, byFn: {} };
      const why = this.check(uid, op, after, now);
      evals += this.sim.stats.evals; access += this.sim.stats.accessCalls;
      for (const [k, v] of Object.entries(this.sim.stats.byFn ?? {})) this.profile[k] = Math.max(this.profile[k] ?? 0, v);
      if (why) return { ok: false, op, why };
    }
    this.lastStats = { evals, accessCalls: access };
    this.docs = after;
    return { ok: true };
  }
}
