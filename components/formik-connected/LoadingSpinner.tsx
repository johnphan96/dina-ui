export interface LoadingSpinnerProps {
  loading: boolean;
}

/** Renders a Bootstrap loading spinner. */
export function LoadingSpinner({ loading }: LoadingSpinnerProps) {
  return loading ? (
    <div className="spinner-border" role="status">
      <span className="sr-only">Loading...</span>
    </div>
  ) : null;
}
