import { redirect } from 'next/navigation';

/** Canonical wallet list remains /admin/wallets. */
export default function AdminWalletAliasPage() {
  redirect('/admin/wallets');
}
