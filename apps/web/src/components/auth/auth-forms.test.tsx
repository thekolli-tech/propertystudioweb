import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { login, register } = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn(),
  }),
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
  createBrowserApiClient: () => ({ login, register }),
}));

import { LoginForm } from '@/components/auth/login-form';
import { RegisterForm } from '@/components/auth/register-form';
import { ApiClientError } from '@/lib/api';

describe('auth forms', () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    login.mockReset();
    register.mockReset();
  });

  it('submits login credentials to the API client', async () => {
    login.mockResolvedValue({
      user: {
        publicId: 'PS-USER-000001',
        email: 'seeker@example.com',
        emailVerified: false,
        status: 'ACTIVE',
        platformRoles: [],
        personas: [],
        activeOrganizationPublicId: null,
      },
    });

    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/^Email$/i), 'seeker@example.com');
    await user.type(screen.getByLabelText(/^Password$/i), 'password-long-enough');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith({
        email: 'seeker@example.com',
        password: 'password-long-enough',
      });
    });
  });

  it('submits registration to the API client', async () => {
    register.mockResolvedValue({
      user: {
        publicId: 'PS-USER-000002',
        email: 'new@example.com',
        emailVerified: false,
        status: 'ACTIVE',
        platformRoles: [],
        personas: [],
        activeOrganizationPublicId: null,
      },
    });

    const user = userEvent.setup();
    render(<RegisterForm />);

    await user.type(screen.getByLabelText(/^Email$/i), 'new@example.com');
    await user.type(screen.getByLabelText(/^Password$/i), 'password-long-enough');
    await user.type(screen.getByLabelText(/^Confirm password$/i), 'password-long-enough');
    await user.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => {
      expect(register).toHaveBeenCalledWith({
        email: 'new@example.com',
        password: 'password-long-enough',
        personas: [],
      });
    });
  });

  it('shows an error when login fails', async () => {
    login.mockRejectedValue(new ApiClientError('Invalid email or password.', 401, 'UNAUTHORIZED'));

    const user = userEvent.setup();
    render(<LoginForm />);

    await user.type(screen.getByLabelText(/^Email$/i), 'seeker@example.com');
    await user.type(screen.getByLabelText(/^Password$/i), 'wrong-password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password.')).toBeTruthy();
    });
  });
});
