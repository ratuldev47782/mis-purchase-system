// lib/stage.js

export const stageOf = (b) => {
  const f = b.files || [];
  if (f.some((x) => x.category === 'resolution')) return 'Resolution';
  if (f.some((x) => x.category === 'application')) return 'Application';
  return b.resolution ? 'Resolution' : 'Application';
};