/** Bearer tokens are accepted exclusively from fragments, never from URL queries. */
export function consumeShareFragment(location: Pick<Location, 'href'>, replace: (url: string) => void) {
  const url = new URL(location.href);
  const fragment = new URLSearchParams(url.hash.slice(1));
  const token = fragment.get('token');
  url.hash = '';
  url.searchParams.delete('token');
  replace(url.pathname + url.search);
  return token && /^[A-Za-z0-9_-]{32,256}$/.test(token) ? token : null;
}
