/** Preserve the condition/message; avoid D1 HTTP's nested CASE/END import parser. */
export function triggerSafeStatement(sql){
  if(!/^CREATE\s+TRIGGER\b/iu.test(sql.trim()))return sql;
  const transported=sql.replace(/SELECT\s+CASE\s+WHEN\s+([\s\S]*?)\s+THEN\s+(RAISE\(\s*ABORT\s*,\s*'(?:[^']|'')*'\s*\))\s+END\s*;/giu,'SELECT $2 WHERE $1;');
  // CASE expressions in VALUES/UPDATE remain unchanged. The import defect is
  // specifically an internal END; mistaken for the end of the trigger body.
  if(/\bEND\s*;/iu.test(transported.replace(/\bEND\s*;?\s*$/iu,'')))throw Error('Unreviewed internal END in trigger transport.');
  return transported;
}
