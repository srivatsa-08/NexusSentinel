import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || "Unexpected visualization error.",
    };
  }

  componentDidCatch(error, info) {
    console.error(`[ErrorBoundary:${this.props.name || "Component"}]`, error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="ns-card p-4 border border-rose-500/40 text-xs space-y-2">
          <div className="font-semibold text-rose-300">
            {this.props.name || "Visualization"} encountered a runtime error
          </div>
          <p className="text-[#AD98C5] font-mono text-[11px]">{this.state.errorMessage}</p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false, errorMessage: "" })}
            className="ns-btn ns-btn-ghost text-[11px]"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

