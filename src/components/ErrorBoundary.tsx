import React from 'react';
import { Button } from '@/components/ui/button';
import { formatErrorReport, normalizeError } from '@/lib/reportError';
import { toast } from 'sonner';
import { AlertTriangle, Copy, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  error: Error | null;
  info: React.ErrorInfo | null;
}

class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, info: null };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // eslint-disable-next-line no-console
    console.error('[ErrorBoundary]', error, info);
    this.setState({ info });
  }

  handleReset = () => {
    this.setState({ error: null, info: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleCopy = async () => {
    const { error, info } = this.state;
    if (!error) return;
    const n = normalizeError(error, 'React render error');
    const report =
      formatErrorReport(n) +
      (info?.componentStack ? `\nComponent stack:${info.componentStack}` : '');
    try {
      await navigator.clipboard.writeText(report);
      toast.success('Error report copied', {
        description: 'Paste it into a support message so we can investigate.',
      });
    } catch {
      toast.error('Could not copy report');
    }
  };

  render() {
    const { error, info } = this.state;
    if (!error) return this.props.children;

    const n = normalizeError(error, 'React render error');

    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background p-6">
        <div className="max-w-xl w-full rounded-lg border bg-card text-card-foreground shadow-sm p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="rounded-full bg-destructive/10 p-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Something went wrong</h1>
              <p className="text-sm text-muted-foreground">
                The app hit an unexpected error. You can copy a full report below and send it
                to support so we can fix it.
              </p>
            </div>
          </div>

          <div className="rounded-md border bg-muted/40 p-3 text-sm font-mono whitespace-pre-wrap break-words max-h-64 overflow-auto">
            {n.code ? <div><span className="font-semibold">code:</span> {n.code}</div> : null}
            <div><span className="font-semibold">message:</span> {n.message}</div>
            {n.hint ? <div><span className="font-semibold">hint:</span> {n.hint}</div> : null}
            {n.details ? (
              <div><span className="font-semibold">details:</span> {n.details}</div>
            ) : null}
            {info?.componentStack ? (
              <div className="mt-2 text-xs opacity-70">{info.componentStack}</div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <Button onClick={this.handleCopy} variant="default">
              <Copy className="h-4 w-4 mr-2" />
              Report this
            </Button>
            <Button onClick={this.handleReset} variant="outline">
              Try again
            </Button>
            <Button onClick={this.handleReload} variant="ghost">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload page
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
