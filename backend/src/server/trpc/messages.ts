// The es-CO catalog and its renderer live in the shared kernel, which never imports this adapter
// (decision log Impl-1 #19); the tRPC layer reads them through this re-export.
export { MESSAGES, type MessageCode } from '../../shared-kernel/messages.generated.js';
export { MISSING_INPUT, renderMessage } from '../../shared-kernel/messages.js';
