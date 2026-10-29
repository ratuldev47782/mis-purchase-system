// lib/stage.js
//
// Text of the "Application / Resolution" column, decided by the uploaded SCAN files:
//   only application scan(s)           -> "Application"
//   application + resolution scans     -> "Application to Resolution"
//   only resolution scan(s)            -> "Resolution"
//   no scan uploaded yet               -> falls back to the documents (old behavior)

export const stageOf = (b) => {
  const f = b.files || [];
  const hasApp = f.some((x) => x.category === 'application');
  const hasRes = f.some((x) => x.category === 'resolution');
  if (hasApp && hasRes) return 'Application to Resolution';
  if (hasRes) return 'Resolution';
  if (hasApp) return 'Application';
  return b.resolution ? 'Resolution' : 'Application';
};