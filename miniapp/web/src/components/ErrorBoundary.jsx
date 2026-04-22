import React from "react";
import { clientLogger } from "../lib/logger";

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || "Unexpected UI error"
    };
  }

  componentDidCatch(error, info) {
    clientLogger.error("ui.errorBoundary", {
      error: error?.message,
      stack: error?.stack,
      componentStack: info?.componentStack
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16, color: "#ffa9a9" }}>
          UI crashed: {this.state.message}
        </div>
      );
    }
    return this.props.children;
  }
}

