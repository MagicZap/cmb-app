import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("ErrorBoundary capturou:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex flex-col items-center justify-center py-20 bg-red-50 rounded-xl border border-red-200">
          <p className="text-red-700 font-bold text-base mb-2">Erro ao carregar o histórico</p>
          <p className="text-red-500 text-sm mb-4">{this.state.errorMessage}</p>
          <button
            onClick={() => this.setState({ hasError: false, errorMessage: "" })}
            className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700"
          >
            Tentar novamente
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
