import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { EmptyState } from './empty-state';
import { LoadingState } from './loading-state';
import { ErrorState } from './error-state';
import { PageHeader } from './page-header';
import { Breadcrumbs } from './breadcrumbs';
import { Button } from './ui/button';

describe('shared UI components', () => {
  it('renders EmptyState title', () => {
    render(<EmptyState title="No saved properties yet." />);
    expect(screen.getByText('No saved properties yet.')).toBeTruthy();
  });

  it('renders LoadingState with accessible status', () => {
    render(<LoadingState label="Loading profile" />);
    expect(screen.getByRole('status')).toBeTruthy();
    expect(screen.getByText('Loading profile')).toBeTruthy();
  });

  it('renders ErrorState alert', () => {
    render(<ErrorState message="Request failed" />);
    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Request failed')).toBeTruthy();
  });

  it('renders PageHeader and Button', () => {
    render(
      <PageHeader
        title="Profile"
        description="Account details"
        actions={<Button type="button">Edit</Button>}
      />,
    );
    expect(screen.getByText('Profile')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Edit' })).toBeTruthy();
  });

  it('renders Breadcrumbs navigation', () => {
    render(
      <Breadcrumbs
        items={[{ label: 'Properties', href: '/properties' }, { label: 'PS-PROP-000001' }]}
      />,
    );
    expect(screen.getByLabelText('Breadcrumb')).toBeTruthy();
    expect(screen.getByText('PS-PROP-000001')).toBeTruthy();
  });
});
