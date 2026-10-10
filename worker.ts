import handler from 'vinext/server/app-router-entry';
import { runInstallerJobs } from './lib/installer/jobs';
import type { SolarMatchRuntimeEnv } from './lib/server/runtime';

const worker = {
  fetch(request: Request, env: SolarMatchRuntimeEnv, context: ExecutionContext) {
    return handler.fetch(request, env as SolarMatchRuntimeEnv & { ASSETS?: Fetcher }, context);
  },
  scheduled(_controller: ScheduledController, env: SolarMatchRuntimeEnv, context: ExecutionContext) {
    if (!['local-test', 'sandbox'].includes(env.INSTALLER_PLATFORM_MODE || 'off')) return;
    context.waitUntil(runInstallerJobs(env));
  },
};
export default worker;
