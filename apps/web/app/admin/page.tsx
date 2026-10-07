export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/** Canonical overview lives at /admin/overview — keep /admin as the entry redirect. */
export default async function AdminHomePage({ searchParams }: PageProps) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  const period = first(params.period);
  const from = first(params.from);
  const to = first(params.to);
  if (period) qs.set('period', period);
  if (from) qs.set('from', from);
  if (to) qs.set('to', to);
  const suffix = qs.toString();
  redirect(suffix ? `/admin/overview?${suffix}` : '/admin/overview');
}
