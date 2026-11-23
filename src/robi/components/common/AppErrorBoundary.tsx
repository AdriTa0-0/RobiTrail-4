import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error.message || "An unexpected application error occurred.",
    };
  }

  override componentDidCatch(error: Error) {
    console.error("RobiTrail ErrorBoundary caught:", error.message);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-6">
          <div className="max-w-md w-full rounded-2xl bg-white border border-rose-200 p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-100 text-rose-700 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-950">Something went wrong</h1>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed break-words">
                  {this.state.errorMessage}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
