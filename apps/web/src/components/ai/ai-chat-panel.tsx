'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type {
  AiAssembledContextResponse,
  AiConversationContextHints,
  AiConversationDetail,
  AiConversationMessage,
  AiConversationSummary,
  AiChatResultCard,
} from '@property-studio/contracts';
import { Badge, Button, EmptyState, StatusBadge } from '@property-studio/ui';

import { CoverageBadge } from '@/components/intelligence/coverage-badge';
import { ApiClientError, createBrowserApiClient } from '@/lib/api';

function formatPrice(priceMinor: string | null | undefined, currency = 'INR'): string | null {
  if (!priceMinor) return null;
  const major = Number(priceMinor) / 100;
  if (!Number.isFinite(major)) return null;
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(major);
  } catch {
    return `${currency} ${major.toLocaleString('en-IN')}`;
  }
}

function ResultCard({
  card,
  onPropertyClick,
}: {
  card: AiChatResultCard;
  onPropertyClick?: (publicId: string) => void;
}) {
  const price = formatPrice(card.priceMinor, card.currency ?? 'INR');
  const inner = (
    <div className="rounded-lg border border-border bg-background/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">{card.kind}</Badge>
        {card.trustStatus ? <StatusBadge tone="neutral">{card.trustStatus}</StatusBadge> : null}
      </div>
      <p className="mt-2 font-medium leading-snug">{card.title}</p>
      {card.subtitle ? <p className="mt-1 text-sm text-muted-foreground">{card.subtitle}</p> : null}
      <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
        {card.location ? <p>{card.location}</p> : null}
        {card.configuration ? <p>{card.configuration}</p> : null}
        {card.areaLabel ? <p>{card.areaLabel}</p> : null}
        {price ? <p>{price}</p> : null}
        {card.developer ? <p>{card.developer}</p> : null}
        {card.availability ? <p>{card.availability}</p> : null}
        {card.publicId ? <p className="font-mono">{card.publicId}</p> : null}
      </div>
    </div>
  );

  if (card.href) {
    return (
      <Link
        href={card.href}
        className="block transition hover:opacity-90"
        onClick={() => {
          if (card.kind === 'PROPERTY' && card.publicId) {
            onPropertyClick?.(card.publicId);
          }
        }}
      >
        {inner}
      </Link>
    );
  }

  if (card.kind === 'PROPERTY' && card.publicId) {
    return (
      <button
        type="button"
        className="w-full text-left transition hover:opacity-90"
        onClick={() => onPropertyClick?.(card.publicId!)}
      >
        {inner}
      </button>
    );
  }

  return inner;
}

function MessageBubble({
  message,
  onConfirmRequirement,
  onPropertyClick,
}: {
  message: AiConversationMessage;
  onConfirmRequirement?: () => void;
  onPropertyClick?: (publicId: string) => void;
}) {
  const isUser = message.role === 'USER';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[min(100%,42rem)] space-y-3 rounded-2xl px-4 py-3 text-sm ${
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'border border-border bg-card text-foreground'
        }`}
      >
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        {!isUser && message.coverageState ? <CoverageBadge state={message.coverageState} /> : null}
        {!isUser && message.toolInvocations.length > 0 ? (
          <ul className="space-y-1 text-xs text-muted-foreground">
            {message.toolInvocations.map((tool, index) => (
              <li key={`${tool.tool}-${index}`}>
                Tool {tool.tool}: {tool.ok ? tool.coverageState : 'failed'}
                {tool.summary ? ` — ${tool.summary}` : ''}
              </li>
            ))}
          </ul>
        ) : null}
        {!isUser && message.cards.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {message.cards.map((card, index) => (
              <ResultCard
                key={`${card.kind}-${card.publicId ?? index}`}
                card={card}
                onPropertyClick={onPropertyClick}
              />
            ))}
          </div>
        ) : null}
        {!isUser &&
        message.cards.some((card) => card.kind === 'REQUIREMENT_CONFIRMATION') &&
        onConfirmRequirement ? (
          <Button type="button" size="sm" onClick={onConfirmRequirement}>
            Confirm requirement
          </Button>
        ) : null}
        {!isUser && message.references.length > 0 ? (
          <ul className="space-y-1 text-xs text-muted-foreground">
            {message.references.map((ref, index) => (
              <li key={`${ref.kind}-${ref.publicId ?? index}`}>
                {ref.label}
                {ref.publicId ? ` (${ref.publicId})` : ''}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

export type AiChatPanelProps = {
  organizationPublicId?: string | null;
  variant?: 'default' | 'broadcast';
  contextHints?: AiConversationContextHints | null;
};

function describeHints(hints: AiConversationContextHints | null | undefined): string | null {
  if (!hints) return null;
  if (hints.propertyPublicId) return `Context: Property ${hints.propertyPublicId}`;
  if (hints.projectPublicId) return `Context: Project ${hints.projectPublicId}`;
  if (hints.requirementPublicId) return `Context: Requirement ${hints.requirementPublicId}`;
  if (hints.focus === 'saved_properties') return 'Context: My saved properties';
  if (hints.focus === 'saved_searches') return 'Context: My saved searches';
  if (hints.focus === 'pipeline') return 'Context: My pipeline';
  if (hints.focus === 'follow_ups') return "Context: Today's follow-ups";
  if (hints.focus && hints.focus !== 'general') {
    return `Context: ${hints.focus.replaceAll('_', ' ')}`;
  }
  return null;
}

export function AiChatPanel({
  organizationPublicId,
  variant = 'default',
  contextHints = null,
}: AiChatPanelProps) {
  const [conversations, setConversations] = useState<AiConversationSummary[]>([]);
  const [active, setActive] = useState<AiConversationDetail | null>(null);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [assembled, setAssembled] = useState<AiAssembledContextResponse | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const resolvedHints: AiConversationContextHints = {
    ...contextHints,
    organizationPublicId: contextHints?.organizationPublicId ?? organizationPublicId ?? null,
  };

  const loadConversations = useCallback(async () => {
    const client = createBrowserApiClient();
    const list = await client.listAiConversations({ limit: 40 });
    setConversations(list.items);
    return list.items;
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const client = createBrowserApiClient();
        const [items, context] = await Promise.all([
          loadConversations(),
          client.getAiAssembledContext(resolvedHints).catch(() => null),
        ]);
        if (cancelled) return;
        if (context) setAssembled(context);
        if (items[0]) {
          const detail = await client.getAiConversation(items[0].publicId);
          if (!cancelled) setActive(detail);
        }
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
          setUnauthorized(true);
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load conversations.');
        }
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    loadConversations,
    resolvedHints.propertyPublicId,
    resolvedHints.projectPublicId,
    resolvedHints.requirementPublicId,
    resolvedHints.focus,
    resolvedHints.organizationPublicId,
  ]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [active?.messages.length, pending]);

  async function startNewConversation() {
    setError(null);
    setPending(true);
    try {
      const client = createBrowserApiClient();
      const created = await client.createAiConversation({
        organizationPublicId: organizationPublicId ?? null,
        contextHints: resolvedHints,
      });
      const detail = await client.getAiConversation(created.publicId);
      setActive(detail);
      await loadConversations();
    } catch (err) {
      if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
        setUnauthorized(true);
      } else {
        setError(err instanceof Error ? err.message : 'Could not start conversation.');
      }
    } finally {
      setPending(false);
    }
  }

  async function selectConversation(publicId: string) {
    setError(null);
    setPending(true);
    try {
      const detail = await createBrowserApiClient().getAiConversation(publicId);
      setActive(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open conversation.');
    } finally {
      setPending(false);
    }
  }

  async function sendMessage(options?: { confirmRequirement?: boolean; message?: string }) {
    setError(null);
    const text = (options?.message ?? draft).trim();
    if (!text && !options?.confirmRequirement) return;

    setPending(true);
    try {
      const client = createBrowserApiClient();
      let conversationPublicId = active?.publicId;
      if (!conversationPublicId) {
        const created = await client.createAiConversation({
          organizationPublicId: organizationPublicId ?? null,
          title: text.slice(0, 80) || 'New chat',
          contextHints: resolvedHints,
        });
        conversationPublicId = created.publicId;
      }

      const response = await client.postAiConversationMessage(conversationPublicId, {
        message: text || 'confirm',
        confirmRequirement: options?.confirmRequirement ?? false,
        contextHints: resolvedHints,
      });

      const detail = await client.getAiConversation(conversationPublicId);
      setActive(detail);
      setDraft('');
      await loadConversations();
      void response;
    } catch (err) {
      if (err instanceof ApiClientError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Message failed.');
      }
    } finally {
      setPending(false);
    }
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    await sendMessage();
  }

  async function retryLast() {
    const lastUser = [...(active?.messages ?? [])]
      .reverse()
      .find((message) => message.role === 'USER');
    if (!lastUser) return;
    setDraft(lastUser.content);
    await sendMessage({ message: lastUser.content });
  }

  if (unauthorized) {
    return (
      <EmptyState
        title="Sign in to use AI Copilot"
        description="Conversations are private to your account. Public catalog answers still require an authenticated session with AI permissions."
        action={
          <Button asChild>
            <Link href="/login?next=/ai/chat">Sign in</Link>
          </Button>
        }
      />
    );
  }

  const shellClass =
    variant === 'broadcast'
      ? 'grid gap-4 lg:grid-cols-[14rem_minmax(0,1fr)]'
      : 'grid gap-4 lg:grid-cols-[16rem_minmax(0,1fr)]';

  return (
    <div className={shellClass}>
      <aside className="space-y-3 rounded-xl border border-border bg-card p-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Conversations</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={startNewConversation}
            disabled={pending}
          >
            New
          </Button>
        </div>
        {bootstrapping ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : conversations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No conversations yet.</p>
        ) : (
          <ul className="max-h-[28rem] space-y-1 overflow-y-auto">
            {conversations.map((item) => (
              <li key={item.publicId}>
                <button
                  type="button"
                  className={`w-full rounded-lg px-2 py-2 text-left text-sm transition ${
                    active?.publicId === item.publicId
                      ? 'bg-secondary font-medium'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => selectConversation(item.publicId)}
                >
                  <span className="line-clamp-2">{item.title ?? 'Untitled chat'}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <section className="flex min-h-[28rem] flex-col rounded-xl border border-border bg-card">
        {describeHints(resolvedHints) || assembled ? (
          <div className="space-y-1 border-b border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">
              {describeHints(active?.contextHints ?? resolvedHints) ??
                describeHints(resolvedHints) ??
                'Authorized workspace context'}
            </p>
            {assembled ? (
              <p className="line-clamp-2">{assembled.labels.slice(0, 6).join(' · ')}</p>
            ) : null}
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div>
            <p className="font-medium">{active?.title ?? 'Property Studio AI Copilot'}</p>
            <p className="text-xs text-muted-foreground">
              Uses Phase 11 authorized tools only. Streaming is disabled for the deterministic
              provider.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={retryLast}
              disabled={pending || !active}
            >
              Retry
            </Button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
          {!active || active.messages.length === 0 ? (
            <EmptyState
              title="Ask about properties, markets, or EMI"
              description="Example: “Show me 3BHK villas in Tellapur.” Follow-ups keep conversation context without bypassing authorization."
            />
          ) : (
            active.messages.map((message) => (
              <MessageBubble
                key={message.publicId}
                message={message}
                onConfirmRequirement={() =>
                  sendMessage({ confirmRequirement: true, message: 'confirm' })
                }
                onPropertyClick={(publicId) => {
                  void createBrowserApiClient().postAiConversationMessage(active.publicId, {
                    message: `Open ${publicId}`,
                    confirmRequirement: false,
                    clickedPropertyPublicId: publicId,
                  });
                }}
              />
            ))
          )}
          {pending ? (
            <div className="text-sm text-muted-foreground">
              Thinking / running authorized tools…
            </div>
          ) : null}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={onSubmit} className="border-t border-border p-4">
          {error ? <p className="mb-2 text-sm text-destructive">{error}</p> : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <textarea
              className="min-h-20 flex-1 rounded-[var(--radius)] border border-input bg-background px-3 py-2 text-sm"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask the copilot…"
              maxLength={4000}
              disabled={pending}
            />
            <Button type="submit" disabled={pending || draft.trim().length === 0}>
              {pending ? 'Sending…' : 'Send'}
            </Button>
          </div>
          {active?.disclaimer ? (
            <p className="mt-2 text-xs text-muted-foreground">{active.disclaimer}</p>
          ) : null}
        </form>
      </section>
    </div>
  );
}
