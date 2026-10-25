// ESLint for the whole repository. The packages live in the isolated toolchain under tools/lint
// (decision log #7); run it with `npm run lint`. Story 1.4 adds the `tezg/*` rules here.
import { base } from './tools/lint/base.mjs';

export default [...base];
