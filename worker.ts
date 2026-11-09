import handler from 'vinext/server/app-router-entry';
import { runInstallerJobs } from './lib/installer/jobs';
import { withSecurityHeaders } from './lib/server/response-security';
import type { SolarMatchRuntimeEnv } from './lib/server/runtime';

const worker = {
  async fetch(request: Request, env: SolarMatchRuntimeEnv, context: ExecutionContext) {
    const url = new URL(request.url);
    if (url.protocol === 'http:' && url.hostname.endsWith('.workers.dev')) {
      url.protocol = 'https:';
      return withSecurityHeaders(Response.redirect(url, 308));
    }
    const response = await handler.fetch(request, env as SolarMatchRuntimeEnv & { ASSETS?: Fetcher }, context);
    return withSecurityHeaders(response);
  },
  scheduled(_controller: ScheduledController, env: SolarMatchRuntimeEnv, context: ExecutionContext) {
    if (!['local-test', 'sandbox', 'production'].includes(env.INSTALLER_PLATFORM_MODE || 'off')) return;
    context.waitUntil(runInstallerJobs(env));
  },
};
export default worker;
