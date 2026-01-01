import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/Button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = () => {
    // Clear local storage to remove any bad cached state
    localStorage.clear();
    // Reload the page
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 text-white p-6 text-center">
          <div className="bg-slate-800 p-8 rounded-2xl shadow-2xl max-w-md border border-slate-700">
            <h1 className="text-3xl font-bold text-red-500 mb-4">System Error</h1>
            <p className="text-slate-300 mb-6">
              The application encountered an unexpected error while loading data.
            </p>
            <div className="bg-black/30 p-4 rounded-lg mb-6 text-left overflow-auto max-h-32">
              <code className="text-xs text-red-300 font-mono">
                {this.state.error?.message || 'Unknown Error'}
              </code>
            </div>
            <p className="text-sm text-slate-400 mb-6">
              Click below to clear your local cache and restart the application.
            </p>
            <Button onClick={this.handleReset} className="w-full">
              🔄 Reset Application
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}