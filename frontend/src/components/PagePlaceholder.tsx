interface PagePlaceholderProps {
  title: string;
  description: string;
  /** Issue that builds the real page. */
  issue: string;
}

export function PagePlaceholder({ title, description, issue }: PagePlaceholderProps) {
  return (
    <section>
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-2 text-slate-600">{description}</p>
      <p className="mt-4 text-sm text-slate-500">Coming soon ({issue}).</p>
    </section>
  );
}
