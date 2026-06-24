import React from 'react';

export default class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error('BuildTrack app error boundary caught an error:', error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.error) {
      return (
        <main className="app-page error-boundary-page">
          <div className="panel error-boundary-card">
            <h1>Something went wrong</h1>
            <p>The page hit an unexpected error. You can reload the app and try again.</p>
            <div className="row-actions">
              <button className="primary-button" type="button" onClick={this.handleReload}>Reload app</button>
              <button className="ghost-button" type="button" onClick={this.handleGoHome}>Go to login</button>
            </div>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
