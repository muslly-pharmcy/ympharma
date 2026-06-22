// React Error Boundary — catches render-time errors inside child routes.
// TanStack already has a router-level errorComponent; this one protects
// non-route React children (widgets, providers) that aren't covered by it.
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("[ErrorBoundary]", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    return (
      <div dir="rtl" className="flex min-h-[40vh] items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="size-4" />
          <AlertTitle>حدث خطأ غير متوقع</AlertTitle>
          <AlertDescription>
            <p className="mb-3 text-sm">
              {this.state.error?.message || "يرجى المحاولة مرة أخرى."}
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (typeof window !== "undefined") window.location.reload();
                }}
              >
                تحديث الصفحة
              </Button>
              <Button size="sm" variant="ghost" onClick={this.handleReset}>
                إعادة المحاولة
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }
}
