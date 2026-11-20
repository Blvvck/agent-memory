export const packageName = "@daimones/agent-memory";

export {
  ProtectedLogError,
  canonicalProtectedLogPath,
  deleteEntry,
  editEntry,
  policyForPath,
  repairBackwardTrace,
  repairBulletTraceMarkers,
  repairEntryHeader,
  retagEntry,
  rewriteEntry,
  validateDocument,
  writeEntry,
} from "./protected-log";
export { resolveCurrentSession, updateCurrentSession } from "./common";
