import { Component } from 'react';

export default class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || 'Something went wrong while loading this view.'
    };
  }

  componentDidCatch(error) {
    // Keep the app from going blank if a tab crashes.
    console.error('Application view error:', error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <main className="app-page">
          {this.props.controls}
          <div className="panel error-boundary-panel">
            <h2>Something went wrong</h2>
            <p>{this.state.errorMessage}</p>
            <button className="primary-button" type="button" onClick={() => window.location.reload()}>
              Refresh page
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
