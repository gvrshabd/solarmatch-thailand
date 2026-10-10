import { randomBytes } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
// Exclusive create preserves existing secrets. These keys are synthetic test only.
const lines = ['INSTALLER_AUTH_SECRET', 'PHONE_VERIFICATION_SECRET', 'ASSESSMENT_SIGNING_SECRET', 'CSRF_SECRET'].map((name) => name + '=' + randomBytes(32).toString('hex'));
try {
  await writeFile('.installer-test/.dev.vars', lines.join('\n') + '\n', { flag: 'wx', mode: 0o600 });
  console.log('Created ignored local test signing keys. No credentials were printed.');
} catch (error) {
  if (error.code === 'EEXIST') console.log('Existing isolated test keys preserved.');
  else throw error;
}
