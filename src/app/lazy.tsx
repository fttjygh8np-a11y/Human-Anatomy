/**
 * Lazily loaded parts of the shell (code splitting). The 3D viewer pulls in three.js and the
 * engine, the quiz panel the question generator and session logic; neither is needed to show
 * the tree, search and info card. `Deferred` shows an accessible Turkish loading message while
 * a chunk downloads and a reload hint if the download fails.
 */
import { Component, lazy, Suspense, type ReactNode } from 'react'

/** A lazily loaded chunk could not be downloaded (network error, stale deploy). */
class ChunkLoadError extends Error {}

function chunkFailed(e: unknown): never {
  throw new ChunkLoadError(e instanceof Error ? e.message : String(e))
}

/** Starts downloading the viewer chunk (called while the content bundle loads). */
export const preloadViewer = () => import('../ui/viewer/ViewerCanvas.tsx')

export const ViewerCanvas = lazy(() => preloadViewer().then((m) => ({ default: m.ViewerCanvas }), chunkFailed))
export const QuizPanel = lazy(() => import('../ui/quiz/QuizPanel.tsx').then((m) => ({ default: m.QuizPanel }), chunkFailed))
export const LessonPanel = lazy(() =>
  import('../ui/lessons/LessonPanel.tsx').then((m) => ({ default: m.LessonPanel }), chunkFailed),
)
export const SettingsPanel = lazy(() =>
  import('../ui/settings/SettingsPanel.tsx').then((m) => ({ default: m.SettingsPanel }), chunkFailed),
)

class ChunkBoundary extends Component<{ what: string; children: ReactNode }, { error: unknown }> {
  state: { error: unknown } = { error: null }

  static getDerivedStateFromError(error: unknown) {
    return { error }
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children
    // Only download failures are handled here; other errors propagate as before.
    if (!(error instanceof ChunkLoadError)) throw error
    return (
      <div role="alert" className="deferred">
        <p>{this.props.what} yüklenemedi. İnternet bağlantınızı denetleyip sayfayı yenileyin.</p>
        <button type="button" onClick={() => window.location.reload()}>
          Sayfayı yenile
        </button>
      </div>
    )
  }
}

/** Suspense + download-error boundary for a lazily loaded part; `what` names it ("3B görüntüleyici"). */
export function Deferred({ what, children }: { what: string; children: ReactNode }) {
  return (
    <ChunkBoundary what={what}>
      <Suspense
        fallback={
          <p role="status" className="deferred muted">
            {what} yükleniyor…
          </p>
        }
      >
        {children}
      </Suspense>
    </ChunkBoundary>
  )
}
