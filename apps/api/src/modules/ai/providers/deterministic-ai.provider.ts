import { Injectable } from '@nestjs/common';

import {
  type AiProvider,
  type AiProviderCompleteInput,
  type AiProviderCompleteOutput,
  type AiToolName,
  AI_DISCLAIMER,
} from './ai-provider';

/**
 * Phase 11 ships without an external LLM.
 * DeterministicAiProvider inspects the user message, proposes tool calls,
 * and assembles structured answers only from tool results (no hallucination).
 */
@Injectable()
export class DeterministicAiProvider implements AiProvider {
  readonly name = 'DETERMINISTIC';

  async complete(input: AiProviderCompleteInput): Promise<AiProviderCompleteOutput> {
    const userMessage =
      [...input.messages].reverse().find((message) => message.role === 'user')?.content ?? '';

    if (input.toolResults && input.toolResults.length > 0) {
      return this.answerFromTools(userMessage, input.toolResults);
    }

    return {
      answer: '',
      toolCalls: this.proposeTools(userMessage),
      coverageState: 'INSUFFICIENT_DATA',
      references: [],
    };
  }

  private proposeTools(
    message: string,
  ): Array<{ tool: AiToolName; args: Record<string, unknown> }> {
    const lower = message.toLowerCase();
    const tools: Array<{ tool: AiToolName; args: Record<string, unknown> }> = [];

    if (/emi|loan|mortgage|interest/.test(lower)) {
      const principal = this.extractNumber(lower, /(?:emi|loan|principal|amount).*?(\d[\d,]*)/);
      const years = this.extractNumber(lower, /(\d+)\s*(?:year|yr)/);
      const rate = this.extractNumber(lower, /(\d+(?:\.\d+)?)\s*%/);
      tools.push({
        tool: 'calculate_emi',
        args: {
          principalMinor: principal ? String(principal * 100) : undefined,
          annualRatePercent: rate ?? 8.5,
          tenureMonths: years ? years * 12 : 240,
        },
      });
    }

    if (/roi|return on investment|yield/.test(lower)) {
      tools.push({
        tool: 'calculate_roi',
        args: {},
      });
    }

    if (
      /compar|vs\.?|versus|difference|which (one|of)|lowest|cheapest|among|price per/.test(lower)
    ) {
      const propIds = message.match(/PS-PROP-\d+/g) ?? [];
      if (propIds.length >= 2) {
        tools.push({
          tool: 'compare_properties',
          args: { publicIds: propIds.slice(0, 5) },
        });
      } else if (propIds.length === 1) {
        tools.push({ tool: 'get_property_details', args: { publicId: propIds[0] } });
      }
    }

    if (/market|price trend|median|appreciation/.test(lower)) {
      const city = this.extractCity(lower);
      tools.push({
        tool: 'get_market_data',
        args: city ? { city } : {},
      });
    }

    if (/infra|metro|school|hospital|airport/.test(lower)) {
      const city = this.extractCity(lower);
      tools.push({
        tool: 'get_infrastructure',
        args: city ? { city } : {},
      });
    }

    if (/review|rating|trust/.test(lower)) {
      const propId = message.match(/PS-PROP-\d+/)?.[0];
      const projId = message.match(/PS-PROJ-\d+/)?.[0];
      tools.push({
        tool: 'get_reviews',
        args: {
          subjectType: propId ? 'PROPERTY' : projId ? 'PROJECT' : 'PROPERTY',
          subjectPublicId: propId ?? projId ?? undefined,
        },
      });
    }

    const propId = message.match(/PS-PROP-\d+/)?.[0];
    if (propId && /detail|about|tell me|info|show|know about|this property/.test(lower)) {
      tools.push({ tool: 'get_property_context', args: { publicId: propId } });
    }

    const projId = message.match(/PS-PROJ-\d+/)?.[0];
    if (projId && /detail|about|tell me|info|show|know about|this project/.test(lower)) {
      tools.push({ tool: 'get_project_context', args: { publicId: projId } });
    }

    if (/saved propert|bookmark|my saves|compare my saved/.test(lower)) {
      if (/compar/.test(lower)) {
        tools.push({ tool: 'compare_saved_properties', args: {} });
      } else {
        tools.push({ tool: 'get_saved_properties', args: {} });
      }
    }

    if (/saved search|smart alert|alert match/.test(lower)) {
      tools.push({ tool: 'get_saved_searches', args: {} });
    }

    if (/my requirement|active requirement|match(es)? my requirement/.test(lower)) {
      tools.push({ tool: 'get_active_requirements', args: {} });
      tools.push({ tool: 'get_saved_properties', args: {} });
    }

    if (
      /follow[- ]?up|pipeline|site visit|crm|my leads|today|what should i|next action|recommend/.test(
        lower,
      )
    ) {
      tools.push({ tool: 'get_recommended_next_actions', args: { focus: 'pipeline' } });
      if (/follow/.test(lower)) {
        tools.push({ tool: 'get_my_followups', args: {} });
      }
      if (/site visit|visit/.test(lower)) {
        tools.push({ tool: 'get_my_site_visits', args: {} });
      }
      if (/pipeline|lead|deal|crm/.test(lower)) {
        tools.push({ tool: 'get_my_crm_summary', args: {} });
      }
    }

    if (/context|who am i|my workspace|what do you know about me/.test(lower)) {
      tools.push({ tool: 'get_current_user_context', args: {} });
    }

    if (
      tools.length === 0 ||
      /find|search|looking for|bedroom|bhk|apartment|villa|budget/.test(lower)
    ) {
      // Prefer workspace context when the message is about "this" focused resource.
      if (/this property|about this|current property/.test(lower) && !propId) {
        tools.push({ tool: 'get_current_user_context', args: { focus: 'property' } });
      } else {
        tools.push({
          tool: 'search_properties',
          args: { query: message },
        });
      }
    }

    return tools.slice(0, 4);
  }

  private answerFromTools(
    userMessage: string,
    toolResults: NonNullable<AiProviderCompleteInput['toolResults']>,
  ): AiProviderCompleteOutput {
    const references: AiProviderCompleteOutput['references'] = [];
    const parts: string[] = [];
    let coverageState: AiProviderCompleteOutput['coverageState'] = 'INSUFFICIENT_DATA';

    for (const result of toolResults) {
      references.push({
        kind: 'TOOL',
        publicId: null,
        label: result.tool,
      });

      if (result.ok && result.coverageState === 'READY') {
        coverageState = 'READY';
      } else if (coverageState !== 'READY' && result.coverageState === 'UNAVAILABLE') {
        coverageState = 'UNAVAILABLE';
      }

      if (!result.ok) {
        parts.push(`${result.tool}: unavailable (${result.error ?? 'error'}).`);
        continue;
      }

      if (result.coverageState === 'INSUFFICIENT_DATA') {
        parts.push(`${result.tool}: insufficient data in the system of record.`);
        continue;
      }

      if (result.tool === 'search_properties') {
        const data = result.data as { properties?: Array<{ publicId: string; title: string }> };
        const props = data.properties ?? [];
        if (props.length === 0) {
          parts.push('No published properties matched the search criteria.');
        } else {
          parts.push(
            `Found ${props.length} published properties: ${props
              .slice(0, 5)
              .map((p) => `${p.title} (${p.publicId})`)
              .join('; ')}.`,
          );
          for (const prop of props.slice(0, 5)) {
            references.push({
              kind: 'PROPERTY',
              publicId: prop.publicId,
              label: prop.title,
            });
          }
        }
      } else if (result.tool === 'calculate_emi') {
        const data = result.data as {
          emiMinor?: string;
          assumptions?: string[];
        };
        if (data.emiMinor) {
          parts.push(
            `Estimated EMI is ${data.emiMinor} minor units per month (disclosed assumptions applied).`,
          );
        }
      } else if (result.tool === 'get_market_data') {
        const data = result.data as { coverageState?: string; snapshots?: unknown[] };
        if (data.coverageState === 'READY') {
          parts.push(
            `Market snapshots are available (${(data.snapshots ?? []).length} historical rows).`,
          );
        } else {
          parts.push('No market snapshots are available for the requested location.');
        }
      } else if (result.tool === 'compare_properties') {
        const data = result.data as {
          fields?: Array<{
            key: string;
            values?: Array<{ publicId: string; available: boolean; value?: unknown }>;
          }>;
        };
        const pricePerSqft = data.fields?.find((field) => field.key === 'pricePerSqftMinor');
        if (pricePerSqft && /lowest|cheapest|price per/.test(userMessage.toLowerCase())) {
          const available = (pricePerSqft.values ?? []).filter(
            (row) => row.available && row.value != null,
          );
          if (available.length > 0) {
            const lowest = available.reduce((best, row) =>
              Number(row.value) < Number(best.value) ? row : best,
            );
            parts.push(
              `Among the authorized comparison set, lowest price per sqft is ${lowest.publicId} (${String(lowest.value)} minor units / sqft).`,
            );
          } else {
            parts.push(
              'Price-per-sqft comparison is insufficient for the authorized properties in context.',
            );
            if (coverageState !== 'READY') {
              coverageState = 'INSUFFICIENT_DATA';
            }
          }
        } else {
          parts.push('Structured property comparison prepared from catalog fields.');
        }
      } else if (result.tool === 'get_property_details' || result.tool === 'get_property_context') {
        const data = result.data as { publicId?: string; title?: string };
        if (data.publicId) {
          parts.push(`Property details loaded for ${data.title ?? data.publicId}.`);
          references.push({
            kind: 'PROPERTY',
            publicId: data.publicId,
            label: data.title ?? data.publicId,
          });
        }
      } else if (result.tool === 'get_current_user_context') {
        const data = result.data as { labels?: string[]; roleLabel?: string };
        parts.push(
          `Authorized workspace context (${data.roleLabel ?? 'USER'}): ${(data.labels ?? [])
            .slice(0, 8)
            .join('; ')}.`,
        );
      } else if (result.tool === 'get_saved_properties') {
        const data = result.data as {
          items?: Array<{ propertyPublicId: string; title: string }>;
        };
        const items = data.items ?? [];
        parts.push(
          items.length === 0
            ? 'No authorized saved properties are available.'
            : `You have ${items.length} saved properties: ${items
                .slice(0, 5)
                .map((item) => `${item.title} (${item.propertyPublicId})`)
                .join('; ')}.`,
        );
      } else if (result.tool === 'get_saved_searches') {
        const data = result.data as {
          items?: Array<{ publicId: string; name: string; matchCount: number }>;
        };
        const items = data.items ?? [];
        parts.push(
          items.length === 0
            ? 'No authorized saved searches are available.'
            : `Saved searches: ${items
                .slice(0, 5)
                .map((item) => `${item.name} (${item.matchCount} matches)`)
                .join('; ')}.`,
        );
      } else if (result.tool === 'get_active_requirements') {
        const data = result.data as {
          items?: Array<{ publicId: string; title: string; city: string }>;
        };
        const items = data.items ?? [];
        parts.push(
          items.length === 0
            ? 'No active requirements found for this account.'
            : `Active requirements: ${items
                .slice(0, 5)
                .map((item) => `${item.title} in ${item.city} (${item.publicId})`)
                .join('; ')}.`,
        );
      } else if (
        result.tool === 'get_recommended_next_actions' ||
        result.tool === 'get_my_crm_summary' ||
        result.tool === 'get_my_followups' ||
        result.tool === 'get_my_site_visits' ||
        result.tool === 'get_my_deals' ||
        result.tool === 'get_my_pipeline'
      ) {
        if (result.tool === 'get_recommended_next_actions') {
          const data = result.data as {
            actions?: Array<{ title: string; rationale: string; priority: string }>;
          };
          const actions = data.actions ?? [];
          parts.push(
            actions.length === 0
              ? 'No recommended next actions from current authorized state (INSUFFICIENT_DATA).'
              : `Recommended next actions (deterministic): ${actions
                  .slice(0, 5)
                  .map((action) => `[${action.priority}] ${action.title} — ${action.rationale}`)
                  .join(' | ')}.`,
          );
        } else {
          parts.push(`${result.tool}: completed with coverage ${result.coverageState}.`);
        }
      } else {
        parts.push(`${result.tool}: completed with coverage ${result.coverageState}.`);
      }
    }

    if (parts.length === 0) {
      parts.push('I could not assemble an answer from authorized tools with the available data.');
      coverageState = 'INSUFFICIENT_DATA';
    }

    const answer = [parts.join(' '), '', AI_DISCLAIMER, userMessage.trim().length > 0 ? '' : '']
      .filter((line) => line !== undefined)
      .join('\n')
      .trim();

    return {
      answer,
      toolCalls: [],
      coverageState,
      references,
    };
  }

  private extractNumber(text: string, pattern: RegExp): number | null {
    const match = pattern.exec(text);
    if (!match?.[1]) return null;
    const parsed = Number(match[1].replace(/,/g, ''));
    return Number.isFinite(parsed) ? parsed : null;
  }

  private extractCity(text: string): string | null {
    const match = /(?:in|at|near)\s+([a-z][a-z\s]{1,40}?)(?:\s|$|,|\.)/i.exec(text);
    if (!match?.[1]) return null;
    return (
      match[1]
        .trim()
        .replace(/\b(for|with|under|below|above)\b.*$/i, '')
        .trim() || null
    );
  }
}
