import { toast } from 'sonner';

/**
 * Normalized error shape used across the app.
 * Supabase/Postgrest errors expose: { code, message, details, hint }
 * Plain JS errors expose: { name, message, stack }
 */
export interface NormalizedError {
  code?: string;
  message: string;
  hint?: string;
  details?: string;
  stack?: string;
  name?: string;
  context?: string;
}

export function normalizeError(err: unknown, context?: string): NormalizedError {
  if (!err) {
    return { message: 'Unknown error', context };
  }

  if (typeof err === 'string') {
    return { message: err, context };
  }

  const anyErr = err as Record<string, unknown>;

  return {
    code: typeof anyErr.code === 'string' ? anyErr.code : undefined,
    message:
      (typeof anyErr.message === 'string' && anyErr.message) ||
      (typeof anyErr.error_description === 'string' && (anyErr.error_description as string)) ||
      (typeof anyErr.error === 'string' && (anyErr.error as string)) ||
      'Unknown error',
    hint: typeof anyErr.hint === 'string' ? anyErr.hint : undefined,
    details: typeof anyErr.details === 'string' ? anyErr.details : undefined,
    stack: typeof anyErr.stack === 'string' ? anyErr.stack : undefined,
    name: typeof anyErr.name === 'string' ? anyErr.name : undefined,
    context,
  };
}

export function formatErrorReport(n: NormalizedError): string {
  const lines: string[] = [];
  lines.push('--- Error Report ---');
  lines.push(`Time: ${new Date().toISOString()}`);
  if (n.context) lines.push(`Context: ${n.context}`);
  if (n.code) lines.push(`Code: ${n.code}`);
  if (n.name) lines.push(`Name: ${n.name}`);
  lines.push(`Message: ${n.message}`);
  if (n.hint) lines.push(`Hint: ${n.hint}`);
  if (n.details) lines.push(`Details: ${n.details}`);
  if (typeof window !== 'undefined') {
    lines.push(`URL: ${window.location.href}`);
    lines.push(`UserAgent: ${navigator.userAgent}`);
  }
  if (n.stack) {
    lines.push('Stack:');
    lines.push(n.stack);
  }
  return lines.join('\n');
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    return true;
  } catch {
    return false;
  }
}

/**
 * Surfaces an error to the user as a toast with a "Report this" action that
 * copies the full error report (code, message, hint, details, stack, context)
 * to the clipboard.
 */
export function reportError(err: unknown, context?: string): NormalizedError {
  const n = normalizeError(err, context);
  const report = formatErrorReport(n);

  // Always log to console for devs
  // eslint-disable-next-line no-console
  console.error('[reportError]', context || '', err, '\n', report);

  const titleParts: string[] = [];
  if (context) titleParts.push(context);
  const title = titleParts.length ? titleParts.join(' — ') : 'Something went wrong';

  const descParts: string[] = [];
  if (n.code) descParts.push(`Code ${n.code}`);
  descParts.push(n.message);
  if (n.hint) descParts.push(`Hint: ${n.hint}`);
  const description = descParts.join(' • ');

  toast.error(title, {
    description,
    duration: 10000,
    action: {
      label: 'Report this',
      onClick: async () => {
        const ok = await copyToClipboard(report);
        if (ok) {
          toast.success('Error report copied', {
            description: 'Paste it into a support message so we can fix it fast.',
          });
        } else {
          toast.error('Could not copy report', {
            description: 'Open the browser console to view the full error.',
          });
        }
      },
    },
  });

  return n;
}

/**
 * Convenience wrapper around a Supabase query.
 * Usage:
 *   const { data, error } = await supabase.from('x').select();
 *   if (error) return reportDbError(error, 'Load profiles');
 */
export function reportDbError(err: unknown, context: string): NormalizedError {
  return reportError(err, context);
}

/**
 * Installs window-level handlers for uncaught errors and unhandled promise
 * rejections so silent failures surface to the user.
 */
let installed = false;
export function installGlobalErrorHandlers() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  window.addEventListener('error', (event) => {
    // Avoid noisy resource load errors (img/script with no message)
    if (!event.message && !event.error) return;
    reportError(event.error || event.message, 'Uncaught error');
  });

  window.addEventListener('unhandledrejection', (event) => {
    reportError(event.reason, 'Unhandled promise rejection');
  });
}
