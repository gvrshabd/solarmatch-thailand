# Automated-access policy

Last checked: **2026-08-28**

SolarMatch remains a public but pre-validation prototype. The intended posture is to permit ordinary direct HTTP retrieval and user-directed Claude review without opting the site into model-training or AI-search crawling.

## Current Anthropic agents

The names and categories below were checked against Anthropic and Cloudflare's current official documentation on 2026-08-28:

| User agent | Category | SolarMatch policy |
| --- | --- | --- |
| `Claude-User` | AI Assistant / retrieval initiated by a Claude user | Allowed |
| `Claude-SearchBot` | AI Search crawler | Disallowed while the prototype remains pre-validation |
| `ClaudeBot` | AI crawler that may collect content for model development/training | Disallowed |

Authoritative references:

- Anthropic Help Center, “Does Anthropic crawl data from the web, and how can site owners block the crawler?” (dated 2026-04-07): <https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler>
- Cloudflare AI Crawl Control bot reference (last updated 2026-04-23): <https://developers.cloudflare.com/ai-crawl-control/reference/bots/>
- Cloudflare challenge-response detection (last updated 2026-05-05): <https://developers.cloudflare.com/cloudflare-challenges/challenge-types/challenge-pages/detect-response/>

Cloudflare lists detection ID `33564303` for `Claude-User`, `33564301` for `Claude-SearchBot`, and `33563859` for `ClaudeBot`.

## Implemented policy

`app/robots.ts` emits distinct groups:

```text
User-Agent: Claude-User
Allow: /

User-Agent: ClaudeBot
Disallow: /

User-Agent: Claude-SearchBot
Disallow: /

User-Agent: *
Disallow: /
```

The specific `Claude-User` group permits user-directed retrieval. The wildcard group preserves the previous conservative crawler posture for unrelated agents. Public pages use `noindex, follow` metadata so an allowed retrieval agent can read the page and observe that it should not be indexed.

`/llms.txt` is a descriptive plain-text review aid. It is not a security control and does not override `robots.txt`.

## Verification boundary

A direct GET or HEAD request with a `Claude-User` user-agent string verifies Worker behavior for that string. It cannot prove verified-bot identity, Anthropic source IP, an account-specific Claude feature, or the complete behavior of Claude's external product. End-to-end Claude-product retrieval must therefore be reported separately from server-level tests.

No account-wide Cloudflare bot, WAF, access, or security setting is changed by this repository policy. If a verified `Claude-User` request is still blocked after deployment, inspect SolarMatch-specific Cloudflare Security Events and AI Crawl Control before considering a narrowly scoped Worker rule. Do not weaken shared or account-wide controls and do not change Milly's settings.
