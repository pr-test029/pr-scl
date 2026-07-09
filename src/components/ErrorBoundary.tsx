import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorInfo: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorInfo: null };
  }

  static getDerivedStateFromError(_: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error', error, errorInfo);
    this.setState({ errorInfo: error.toString() });
  }

  handleRetry = () => {
    // Reset the error state and reload the page
    this.setState({ hasError: false, errorInfo: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
          <div className="bg-white dark:bg-slate-900/80 p-8 rounded-xl shadow-xl max-w-md text-center">
            <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Oups ! Une erreur est survenue.</h2>
            {this.state.errorInfo && (
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{this.state.errorInfo}</p>
            )}
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-[var(--primary-color)] text-white rounded hover:bg-[var(--primary-hover)] transition"
            >
              Réessayer
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
