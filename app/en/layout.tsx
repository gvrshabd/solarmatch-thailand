export default function EnglishLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // The root document language is synchronized after navigation. This server-rendered
  // language boundary also gives assistive technology the correct language before JS runs.
  return <div lang="en" data-locale="en">{children}</div>;
}
