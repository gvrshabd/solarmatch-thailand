import Link from '@/components/site/internal-link';

export default function EnglishNotFound() {
  return (
    <main className="empty-result" lang="en">
      <div className="site-shell">
        <p className="eyebrow">404</p>
        <h1>We could not find that page</h1>
        <p>The link may be incorrect or this page may not be available yet.</p>
        <Link className="button" href="/en">Return home</Link>
      </div>
    </main>
  );
}
