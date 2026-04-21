import type { CommitSuggestion } from "@/types";

export function formatCommitMessage(suggestion: CommitSuggestion): string {
  const scope = suggestion.scope ? `(${suggestion.scope})` : "";
  const prefix = suggestion.emoji ? `${suggestion.emoji} ` : "";
  return `${prefix}${suggestion.type}${scope}: ${suggestion.subject}`;
}

export function formatCommitMessageWithBody(
  suggestion: CommitSuggestion,
): string {
  const header = formatCommitMessage(suggestion);
  if (!suggestion.body) return header;
  return `${header}\n\n${suggestion.body}`;
}

export function applyScopeOverride(
  suggestion: CommitSuggestion,
  scope: string | undefined,
  disableScope: boolean | undefined,
): CommitSuggestion {
  if (disableScope) {
    return {
      ...suggestion,
      scope: undefined,
    };
  }

  if (!scope) {
    return suggestion;
  }

  return {
    ...suggestion,
    scope,
  };
}

export function truncateSubject(subject: string, maxLength: number): string {
  if (subject.length <= maxLength) {
    return subject;
  }

  return subject.slice(0, maxLength - 1).trimEnd();
}
