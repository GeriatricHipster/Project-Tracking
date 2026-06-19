import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Keep the UI visible even if a tab or panel crashes.
    // eslint-disable-next-line no-console
    console.error('BuildTrack UI error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <main className="app-page">
          <div className="panel error-fallback">
            <h2>Something went wrong</h2>
            <p>{this.state.error?.message || 'A page section crashed while loading.'}</p>
            <button className="primary-button" type="button" onClick={() => window.location.reload()}>
              Reload page
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
