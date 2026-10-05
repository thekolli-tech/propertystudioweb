'use client';

import { useState, type FormEvent } from 'react';
import { Button, Input, Label, ErrorState } from '@property-studio/ui';

import { ApiClientError, createBrowserApiClient } from '@/lib/api';

export function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);
    try {
      await createBrowserApiClient().changePassword({ currentPassword, newPassword });
      setMessage('Password updated.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError('Unable to change password.');
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-md space-y-4">
      <div className="space-y-2">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
        />
      </div>
      {error ? <ErrorState title="Update failed" message={error} className="py-4" /> : null}
      {message ? <p className="text-sm text-[hsl(var(--success))]">{message}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? 'Updating…' : 'Change password'}
      </Button>
    </form>
  );
}
