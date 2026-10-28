import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

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
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    localStorage.removeItem('iec_temporary_db');
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
          <h1 style={{ color: '#ef4444' }}>Application Error</h1>
          <p style={{ margin: '1rem 0', color: '#4b5563' }}>
            The application encountered a critical runtime error. This might be caused by corrupted temporary local data.
          </p>
          <pre style={{ background: '#f3f4f6', padding: '1rem', borderRadius: '8px', overflowX: 'auto', textAlign: 'left', fontSize: '0.875rem' }}>
            {this.state.error?.message}
          </pre>
          <button 
            onClick={this.handleReset}
            style={{ marginTop: '2rem', padding: '0.75rem 1.5rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
          >
            Reset Temporary Data & Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
