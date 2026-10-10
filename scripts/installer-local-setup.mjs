import { randomBytes } from 'node:crypto';
import { appendFile, readFile, writeFile } from 'node:fs/promises';
// Exclusive create preserves existing secrets. These keys are synthetic test only.
const lines = ['INSTALLER_AUTH_SECRET', 'PHONE_VERIFICATION_SECRET', 'ASSESSMENT_SIGNING_SECRET', 'CSRF_SECRET', 'LOCAL_ADMIN_PASSWORD', 'LOCAL_ADMIN_SESSION_SECRET', 'LINE_CHANNEL_SECRET'].map((name) => name + '=' + randomBytes(32).toString('hex'));
try {
  await writeFile('.installer-test/.dev.vars', lines.join('\n') + '\n', { flag: 'wx', mode: 0o600 });
  console.log('Created ignored local test signing keys. No credentials were printed.');
} catch (error) {
  if (error.code === 'EEXIST') {
    const contents = await readFile('.installer-test/.dev.vars', 'utf8');
    const missing = ['LOCAL_ADMIN_PASSWORD', 'LOCAL_ADMIN_SESSION_SECRET', 'LINE_CHANNEL_SECRET'].filter((name) => !new RegExp(`^${name}=.{32,}$`, 'm').test(contents));
    if (missing.length) {
      if (missing.some((name) => new RegExp(`^${name}=`, 'm').test(contents))) throw new Error('An existing local admin key is too short; repair the ignored configuration manually.');
      await appendFile('.installer-test/.dev.vars', (contents.endsWith('\n') ? '' : '\n') + missing.map((name) => name + '=' + randomBytes(32).toString('hex')).join('\n') + '\n');
      console.log('Added missing isolated test keys without printing them.');
    } else console.log('Existing isolated test keys preserved.');
  }
  else throw error;
}
