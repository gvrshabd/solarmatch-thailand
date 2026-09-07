import type { AnchorHTMLAttributes, ReactNode } from 'react';

type InternalLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> & {
  href: string;
  children: ReactNode;
};

/**
 * Vinext's current client-side Next Link interception can swallow navigation
 * after hydration on Workers. A normal same-origin anchor is deliberately used
 * until that compatibility gap is removed upstream.
 */
export default function InternalLink({ href, children, ...props }: InternalLinkProps) {
  return <a href={href} {...props}>{children}</a>;
}
