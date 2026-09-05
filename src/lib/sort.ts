const stripArticle = (s: string) => s.replace(/^(the|a|an)\s+/i, '');
export const cmpName = (a: string | undefined, b: string | undefined) =>
  stripArticle(a ?? '').localeCompare(stripArticle(b ?? ''), undefined, { sensitivity: 'base' });
