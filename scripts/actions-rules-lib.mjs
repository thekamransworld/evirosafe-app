// Builds the ACTIONS section of firestore.rules from src/lib/actions/model.ts.
//
// The table that drives the buttons in the app (who may do what, from which stage, to which stage, and who
// may NOT do it: the owner may not verify their own work) is turned into rules here, so the client and the
// database cannot disagree. Pure functions only: no file access, so the tests can call this directly.

const q = s => `'${s}'`;
const L = a => `[${a.map(q).join(', ')}]`;

export function buildActionsRules(m) {
  const defs = Object.values(m.ACTIONS);
  const reasonIds = defs.filter(d => d.reason).map(d => d.id);

  // ── what a step may change, field by field ──────────────────────────────
  const fieldRule = k => {
    const s = m.FIELD_SPECS[k];
    if (s.kind === 'date') return `after.${k} is string && after.${k}.matches('${m.DATE_PATTERN}')`;
    if (s.kind === 'id') return `after.${k} is string && after.${k}.size() > 0 && after.${k}.size() <= ${m.MAX.id}`;
    if (s.kind === 'enum') return `after.${k} in ${L(s.values)}`;
    throw new Error(`Unknown field spec kind for ${k}: ${s.kind}`);
  };
  const recordRule = rec => `after.${rec} is map
            && after.${rec}.keys().hasOnly(['by', 'at', 'note'])
            && after.${rec}.by == me.docId
            && after.${rec}.at == request.time
            && after.${rec}.note == last.get('note', '')`;

  const clause = d => {
    const parts = [];
    parts.push(d.from.length === 1 ? `before.status == ${q(d.from[0])}` : `before.status in ${L(d.from)}`);
    parts.push(d.to === 'SAME' ? 'after.status == before.status' : `after.status == ${q(d.to)}`);
    parts.push(`me.role in ${L(d.roles)}`);
    if (d.actor === 'owner') parts.push('(owner || ovr)');
    else if (d.actor === 'creator') parts.push('(creator || ovr)');
    else if (d.actor === 'verifier') parts.push('((!owner && !completer) || ovr)');
    parts.push(`changed.hasOnly(${L([...m.COMMON_TRANSITION_KEYS, ...d.writes])})`);
    if (d.record) parts.push(recordRule(d.record));
    const fields = d.writes.filter(k => m.FIELD_SPECS[k]);
    if (fields.length) {
      parts.push(`changed.hasAny(${L(fields)})`);
      // hasAny with a list is the form the live permit rules already use; "in" on a Set is avoided on purpose.
      for (const k of fields) parts.push(`(!changed.hasAny([${q(k)}]) || (${fieldRule(k)}))`);
    }
    return `a == ${q(d.id)}\n        ? (${parts.join('\n            && ')})`;
  };
  const transitionChain = defs.map(clause).join('\n        : ') + '\n        : false';

  const carFields = m.CAR_KEYS
    .map(k => `&& (!(${q(k)} in car) || (car.${k} is string && car.${k}.size() <= ${m.MAX.car}))`)
    .join('\n        ');

  const noteRule = reasonIds.length
    ? `(!(last.action in ${L(reasonIds)})
            || (last.get('note', '') is string && last.get('note', '').size() >= ${m.MIN_REASON_CHARS}))`
    : 'true';

  const functions = `
    function actLast(d) { return d.history[d.history.size() - 1]; }

    // The history grows by exactly one entry, earlier entries are never touched, and the new entry names the
    // person actually making the request and the transition really made. A step that needs a reason carries it.
    function actLogAppendOk(me, before, after) {
      let prev = before.history;
      let entries = after.history;
      let last = entries[entries.size() - 1];
      return entries is list
        && entries.size() == prev.size() + 1
        && entries[0:prev.size()] == prev
        && last.keys().hasOnly(${L(m.HISTORY_KEYS)})
        && last.user_id == me.docId
        && last.role == me.role
        && last.from == before.status
        && last.stage == after.status
        && last.action is string
        && last.timestamp is string
        && (last.get('override', false) != true
            || (isOverrider(me)
                && last.get('justification', '') is string
                && last.get('justification', '').size() >= ${m.MIN_JUSTIFICATION_CHARS}))
        && ${noteRule};
    }

    // Only the new stage's timestamp may change, and it must be server time. A step that leaves the stage
    // alone (a note, a new due date) leaves every timestamp alone.
    function actStageTimesOk(before, after) {
      let times = after.stage_times;
      return times is map
        && (after.status == before.status
            ? times == before.stage_times
            : (times[after.status] == request.time
               && times.diff(before.stage_times).affectedKeys().hasOnly([after.status])));
    }

    // Which step this is, who may do it (role and segregation of duties), and exactly which fields it may
    // touch. Generated from ACTIONS in model.ts. owner / creator / completer say who the caller is
    // relative to this action; ovr is an administrator's written override, which is flagged in the history.
    function actTransitionOk(me, before, after) {
      let last = actLast(after);
      let a = last.action;
      let owner = me.docId == before.owner_id;
      let creator = me.docId == before.creator_id;
      let completer = me.docId == before.get('completion', {}).get('by', '');
      let ovr = last.get('override', false) == true && isOverrider(me);
      let changed = after.diff(before).affectedKeys();
      return ${transitionChain};
    }

    function actTransitionUpdate(me, before, after) {
      return after.last_transition_at == request.time
        && after.updated_at == request.time
        && actTransitionOk(me, before, after)
        && actLogAppendOk(me, before, after)
        && actStageTimesOk(before, after);
    }

    function actCarOk(car) {
      return car is map
        && car.keys().hasOnly(${L(m.CAR_KEYS)})
        ${carFields};
    }

    // The definition (title, description, CAR section) may be edited while the action is not finished:
    // by whoever raised it or an approver; the CAR section also by a reviewer who is not the owner.
    // Editing never touches the status, the history or any time except updated_at.
    function actContentUpdate(me, before, after) {
      let changed = after.diff(before).affectedKeys();
      return after.status == before.status
        && before.status in ${L(m.CONTENT_STAGES)}
        && changed.hasOnly(${L(m.CONTENT_KEYS)})
        && after.updated_at == request.time
        && after.history == before.history
        && after.title is string && after.title.size() > 0 && after.title.size() <= ${m.MAX.title}
        && (!('description' in after) || (after.description is string && after.description.size() <= ${m.MAX.description}))
        && (!('car' in after) || actCarOk(after.car))
        && (me.docId == before.creator_id
            || isApprover(me)
            || (changed.hasOnly(['car', 'updated_at']) && isReviewer(me) && me.docId != before.owner_id));
    }

    // Actions made before the rebuild have no number and are read-only (they were imported into new
    // documents); everything else is either a step (the history grows) or a content edit.
    function actUpdateOk(before, after) {
      let me = myPointer();
      return 'number' in before
        && isStaff(me)
        && inScope(me, before)
        && (after.history != before.history
            ? actTransitionUpdate(me, before, after)
            : actContentUpdate(me, before, after));
    }

    function actSourceOk(s) {
      return s is map
        && s.keys().hasOnly(${L(m.SOURCE_KEYS)})
        && s.type in ${L(m.SOURCE_TYPES)}
        && (s.type == 'manual' || (s.get('id', null) is string && s.id.size() > 0 && s.id.size() <= ${m.MAX.id}))
        && (!('ref' in s) || (s.ref is string && s.ref.size() <= ${m.MAX.ref}))
        && (!('item' in s) || (s.item is string && s.item.size() <= ${m.MAX.ref}));
    }

    // A new action is always OPEN, raised by the person creating it, numbered by consuming the next counter
    // value in the same transaction, with a server-stamped start and a one-entry history.
    function actCreateOk(docId, d) {
      let me = myPointer();
      return me.role in ${L(m.CREATE_ROLES)}
        && inScope(me, d)
        && d.keys().hasOnly(${L(m.CREATE_KEYS)})
        && d.keys().hasAll(${L(m.CREATE_REQUIRED)})
        && d.status == 'OPEN'
        && d.title is string && d.title.size() > 0 && d.title.size() <= ${m.MAX.title}
        && (!('description' in d) || (d.description is string && d.description.size() <= ${m.MAX.description}))
        && d.kind in ${L(m.KINDS)}
        && d.priority in ${L(m.PRIORITIES)}
        && d.project_id is string && d.project_id.size() > 0
        && d.owner_id is string && d.owner_id.size() > 0 && d.owner_id.size() <= ${m.MAX.id}
        && d.creator_id == me.docId
        && d.due_date is string && d.due_date.matches('${m.DATE_PATTERN}')
        && actSourceOk(d.source)
        && (!('car' in d) || actCarOk(d.car))
        && d.action_year is int
        && d.action_year >= request.time.year() - 1 && d.action_year <= request.time.year() + 1
        && d.number is string
        && d.number.matches('${m.COUNTER.prefix}-' + string(d.action_year) + '-[0-9]{4,}')
        && d.history is list && d.history.size() == 1
        && d.history[0].keys().hasOnly(${L(m.HISTORY_KEYS)})
        && d.history[0].action == 'create'
        && d.history[0].user_id == me.docId
        && d.history[0].role == me.role
        && d.history[0].stage == 'OPEN' && d.history[0].from == 'OPEN'
        && d.last_transition_at == request.time
        && d.created_at == request.time
        && d.updated_at == request.time
        && d.stage_times.keys().hasOnly(['OPEN'])
        && d.stage_times.OPEN == request.time
        && counterBumped('act', d.org_id, d.action_year);
    }

    // One-off import of the old stores (actions, corrective_actions, report capa[]): administrators only,
    // a deterministic document id (so a second run cannot duplicate), the old record kept in \`legacy\`,
    // and a history that says plainly that this is an import. Numbered like any other action.
    function actImportOk(docId, d) {
      let me = myPointer();
      return me.role in ${L(m.IMPORT_ROLES)}
        && inScope(me, d)
        && docId.matches('imp_[A-Za-z0-9_-]{1,100}')
        && d.keys().hasOnly(${L(m.IMPORT_KEYS)})
        && d.keys().hasAll(${L(m.IMPORT_REQUIRED)})
        && d.imported == true
        && d.import_source in ${L(m.IMPORT_SOURCES)}
        && d.import_ref is string && d.import_ref.size() > 0 && d.import_ref.size() <= 200
        && d.legacy is map
        && d.status in ${L(m.STAGES)}
        && d.title is string && d.title.size() > 0 && d.title.size() <= ${m.MAX.title}
        && (!('description' in d) || (d.description is string && d.description.size() <= ${m.MAX.description}))
        && d.kind in ${L(m.KINDS)}
        && d.priority in ${L(m.PRIORITIES)}
        && (!('project_id' in d) || (d.project_id is string && d.project_id.size() > 0))
        && d.owner_id is string && d.owner_id.size() <= ${m.MAX.id}
        && d.creator_id is string && d.creator_id.size() > 0
        && d.due_date is string && d.due_date.matches('${m.DATE_PATTERN}')
        && actSourceOk(d.source)
        && (!('car' in d) || actCarOk(d.car))
        && d.action_year == request.time.year()
        && d.number is string
        && d.number.matches('${m.COUNTER.prefix}-' + string(d.action_year) + '-[0-9]{4,}')
        && d.history is list && d.history.size() == 1
        && d.history[0].keys().hasOnly(${L(m.HISTORY_KEYS)})
        && d.history[0].action == 'import'
        && d.history[0].user_id == me.docId
        && d.history[0].role == me.role
        && d.history[0].stage == d.status && d.history[0].from == d.status
        && d.last_transition_at == request.time
        && d.created_at == request.time
        && d.updated_at == request.time
        && d.stage_times.keys().hasOnly([d.status])
        && d.stage_times[d.status] == request.time
        && counterBumped('act', d.org_id, d.action_year);
    }

    // A numbered action is never deleted: cancel it with a reason instead. An old, unnumbered action may be
    // deleted by an administrator (after it has been imported).
    function actDeleteOk(data) {
      let me = myPointer();
      return me.role in ${L(m.OVERRIDERS)}
        && inScope(me, data)
        && !('number' in data);
    }`;

  const matches = [
    {
      path: '/actions/{docId}',
      allows: [
        { ops: ['read'], expr: 'isAccessible(resource.data)' },
        { ops: ['create'], expr: 'actCreateOk(docId, request.resource.data) || actImportOk(docId, request.resource.data)' },
        { ops: ['update'], expr: 'actUpdateOk(resource.data, request.resource.data)' },
        { ops: ['delete'], expr: 'actDeleteOk(resource.data)' },
      ],
    },
  ];

  const START = '    // >>> ACTIONS: generated by scripts/gen-rules.mjs from src/lib/actions/model.ts. Do not edit by hand.';
  const END = '    // <<< ACTIONS';
  const header = `${START}
    // Regenerate with: npm run gen:rules      Verify in CI with: npm run check:rules
    //
    // ENFORCED HERE   who may raise an action, and who may do each step (role, owner / creator / verifier,
    //                 and the administrator override); the owner and the person who recorded the completion
    //                 can never verify it; a signed completion / verification record stamped with server
    //                 time; an append-only history; server-stamped times; numbers from the yearly counter;
    //                 no deletion of numbered actions; the one-off import by administrators.
    // NOT ENFORCED    that the owner is really a person of this organisation (a rule cannot look a person
    //                 up by document id), that a due date is in the future, and anything about the words in
    //                 a note beyond its length.
`;
  const matchText = matches.map(mt => {
    const lines = [];
    if (mt.comment) lines.push(`    // ${mt.comment}`);
    lines.push(`    match ${mt.path} {`);
    for (const a of mt.allows) lines.push(`      allow ${a.ops.join(', ')}: if ${a.expr};`);
    lines.push('    }');
    return lines.join('\n');
  }).join('\n\n');

  const text = `${header}${functions}\n\n${matchText}\n${END}`;
  return { functions, matches, text };
}
