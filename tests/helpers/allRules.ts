// Every generated rules section (COMMON helpers, PTW, ACTIONS) built from the real models: what the rules
// simulator and the service tests judge writes against.
// @ts-ignore (plain .mjs, no types)
import { buildAllRules } from '../../scripts/rules-lib.mjs';
import * as ptw from '../../src/lib/ptw/model';
import * as actions from '../../src/lib/actions/model';
import * as roles from '../../src/lib/shared/roles';
import * as notifications from '../../src/lib/shared/notifications';

export const allRules = buildAllRules({ shared: { roles, notifications }, ptw, actions }) as {
  blocks: Array<{ key: string; functions: string; matches: any[]; text: string }>;
  functions: string;
  matches: any[];
};
