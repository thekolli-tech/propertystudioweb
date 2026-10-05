import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { OrganizationSummary, UserSummary } from '@property-studio/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { switchOrganization, logout } = vi.hoisted(() => ({
  switchOrganization: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/app',
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/api', () => ({
  ApiClientError: class ApiClientError extends Error {
    status: number;
    code: string;
    constructor(message: string, status = 401, code = 'UNAUTHORIZED') {
      super(message);
      this.name = 'ApiClientError';
      this.status = status;
      this.code = code;
    }
  },
  createBrowserApiClient: () => ({ switchOrganization, logout }),
}));

import { OrganizationSwitcher } from '@/components/organization-switcher';
import { UserMenu } from '@/components/user-menu';

const user: UserSummary = {
  publicId: 'PS-USER-000001',
  email: 'owner@example.com',
  emailVerified: false,
  status: 'ACTIVE',
  platformRoles: [],
  personas: [],
  activeOrganizationPublicId: 'PS-ORG-000001',
};

const organizations: OrganizationSummary[] = [
  {
    publicId: 'PS-ORG-000001',
    name: 'Alpha Developers',
    type: 'DEVELOPER',
    status: 'ACTIVE',
    role: 'DEVELOPER',
  },
  {
    publicId: 'PS-ORG-000002',
    name: 'Beta Agency',
    type: 'AGENCY',
    status: 'ACTIVE',
    role: 'AGENT',
  },
];

describe('application shell controls', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    switchOrganization.mockReset();
    logout.mockReset();
  });

  it('switches organization through the API client', async () => {
    switchOrganization.mockResolvedValue({ activeOrganizationPublicId: 'PS-ORG-000002' });
    const events = userEvent.setup();
    render(
      <OrganizationSwitcher
        organizations={organizations}
        activeOrganizationPublicId="PS-ORG-000001"
      />,
    );

    await events.click(screen.getByRole('button', { name: /Alpha Developers/i }));
    await events.click(await screen.findByText('Beta Agency'));

    await waitFor(() => {
      expect(switchOrganization).toHaveBeenCalledWith('PS-ORG-000002');
    });
  });

  it('logs out through the API client', async () => {
    logout.mockResolvedValue({ ok: true });
    const events = userEvent.setup();
    render(<UserMenu user={user} />);

    await events.click(screen.getByRole('button', { name: /owner@example.com/i }));
    await events.click(await screen.findByRole('menuitem', { name: 'Sign out' }));

    await waitFor(() => {
      expect(logout).toHaveBeenCalled();
    });
  });
});
