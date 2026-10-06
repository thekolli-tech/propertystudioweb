'use client';

import { useState, type FormEvent } from 'react';
import type { IntelligenceCompareResponse } from '@property-studio/contracts';
import { Button, EmptyState, Label } from '@property-studio/ui';

import { CoverageBadge } from '@/components/intelligence/coverage-badge';
import { ApiClientError, createBrowserApiClient } from '@/lib/api';

export function AiCompareForm() {
  const [publicIdsText, setPublicIdsText] = useState('');
  const [subjectType, setSubjectType] = useState<'PROPERTY' | 'PROJECT'>('PROPERTY');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IntelligenceCompareResponse | null>(null);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const publicIds = publicIdsText
        .split(/[\s,]+/)
        .map((value) => value.trim())
        .filter(Boolean);
      if (publicIds.length < 2 || publicIds.length > 5) {
        throw new Error('Provide 2–5 public ids separated by commas or spaces.');
      }
      const client = createBrowserApiClient();
      const response = await client.compareIntelligence({
        subjectType,
        publicIds,
      });
      setResult(response);
    } catch (err) {
      setResult(null);
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Compare request failed.');
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="ai-compare-type">Subject type</Label>
          <select
            id="ai-compare-type"
            className="flex h-10 w-full max-w-xs rounded-[var(--radius)] border border-input bg-card px-3 py-2 text-sm"
            value={subjectType}
            onChange={(event) => setSubjectType(event.target.value as 'PROPERTY' | 'PROJECT')}
            disabled={pending}
          >
            <option value="PROPERTY">Properties</option>
            <option value="PROJECT">Projects</option>
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ai-compare-ids">Public ids (2–5)</Label>
          <textarea
            id="ai-compare-ids"
            className="min-h-24 w-full rounded-[var(--radius)] border border-input bg-card px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            value={publicIdsText}
            onChange={(event) => setPublicIdsText(event.target.value)}
            placeholder={
              subjectType === 'PROPERTY' ? 'PS-PROP-1, PS-PROP-2' : 'PS-PROJ-1, PS-PROJ-2'
            }
            required
            disabled={pending}
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" disabled={pending}>
          {pending ? 'Comparing…' : 'Compare'}
        </Button>
      </form>

      {result ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <CoverageBadge state={result.coverageState} label="Coverage" />
            <p className="text-xs text-muted-foreground">{result.disclaimer}</p>
          </div>
          {result.fields.length === 0 ? (
            <EmptyState
              title="No comparable fields"
              description="Insufficient verified data to compare these subjects."
            />
          ) : (
            <div className="overflow-x-auto rounded-[var(--radius)] border border-border">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">Field</th>
                    {result.subjects.map((subject) => (
                      <th key={subject.publicId} className="px-4 py-3 font-medium">
                        <div>{subject.title}</div>
                        <div className="mt-1 font-normal">
                          <CoverageBadge state={subject.coverageState} />
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.fields.map((field) => (
                    <tr key={field.key} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium">{field.label}</td>
                      {field.values.map((cell) => (
                        <td key={`${field.key}-${cell.publicId}`} className="px-4 py-3">
                          {cell.available
                            ? cell.value === null || cell.value === undefined
                              ? '—'
                              : String(cell.value)
                            : 'Unavailable'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
