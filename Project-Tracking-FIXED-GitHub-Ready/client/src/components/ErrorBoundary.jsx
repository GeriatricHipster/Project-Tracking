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
    // Keep the rest of the app visible even if one page section crashes.
    // eslint-disable-next-line no-console
    console.error('PSG and SS Tracking UI error', error, info);
  }

  componentDidUpdate(previousProps) {
    if (this.state.hasError && previousProps.resetKey !== this.props.resetKey) {
      // eslint-disable-next-line react/no-did-update-set-state
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(this.state.error);
      }

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
