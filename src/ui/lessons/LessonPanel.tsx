/**
 * Guided lessons ("Dersler"): lesson list with objectives and availability, then a step
 * player that prepares the 3D scene for each step (isolate/show/focus/camera) and shows the
 * step text with its sources. Leaving a lesson restores the scene from before it started.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Lesson, SceneState, SourceRef } from '../../core/schema.ts'
import { DETAIL_LEVEL_LABEL, REVIEW_STATUS_LABEL } from '../../i18n/labels.ts'
import { applyTourStep, lessonAvailability, nextStep, prevStep, startTour, type TourState } from '../../learning/guidedTour.ts'
import type { SceneEffects } from '../../learning/sceneActions.ts'
import { useServices } from '../services.tsx'

function Sources({ refs }: { refs: SourceRef[] }) {
  const { index } = useServices()
  return (
    <p className="small muted">
      Kaynak:{' '}
      {refs.map((r) => `${index.getSource(r.sourceId)?.shortLabel ?? r.sourceId}${r.locator ? `, ${r.locator}` : ''}`).join('; ')}
    </p>
  )
}

function Player({ lesson, onExit }: { lesson: Lesson; onExit: () => void }) {
  const { index, store, engine, settings } = useServices()
  const [tour, setTour] = useState<TourState>(() => startTour(lesson))
  const headingRef = useRef<HTMLHeadingElement>(null)
  const step = lesson.steps[tour.stepIndex]!
  // Structures of this step that cannot be shown in 3D (unknown or without a model).
  const missing = [...new Set([...step.show, ...step.focus])].flatMap((id) =>
    !index.getStructure(id)
      ? [`${id}: yapı içerikte bulunamadı`]
      : !index.hasModel(id)
        ? [`${index.displayName(id, settings.nameLanguage)}: 3B modeli henüz yok`]
        : [],
  )

  const effects: SceneEffects = useMemo(
    () => ({
      loadAssets: async (ids) => {
        if (!engine) return
        await Promise.all(ids.map((id) => index.getAsset(id)).flatMap((a) => (a ? [engine.loadAsset(a)] : [])))
      },
      highlight: (ids, style) => engine?.setHighlight(ids, style),
      focus: (ids) => engine?.focusStructures(ids),
      cameraPreset: (p) => engine?.setCameraPreset(p),
    }),
    [engine, index],
  )

  useEffect(() => {
    const { plan, result } = applyTourStep(store, tour, index, effects)
    const focus = plan.step.focus
    // Frame again once models loaded by this step are in the scene.
    void result.done.then(() => {
      if (focus.length > 0) {
        engine?.setHighlight(focus, 'lesson')
        engine?.focusStructures(focus)
      }
    })
    headingRef.current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per step
  }, [tour.stepIndex])

  const total = lesson.steps.length
  const pos = tour.stepIndex + 1
  return (
    <section aria-labelledby="lesson-step">
      <p className="small muted">
        {lesson.title} · Adım {pos}/{total}
        {lesson.review !== 'approved' && <span className="badge warn">{REVIEW_STATUS_LABEL[lesson.review]}</span>}
      </p>
      <h2 id="lesson-step" tabIndex={-1} ref={headingRef}>
        {step.title}
      </h2>
      <div aria-live="polite">
        <p>{step.body}</p>
        {step.focus.length > 0 && (
          <p className="small">
            Vurgulanan: {step.focus.map((id) => index.displayName(id, settings.nameLanguage)).join(', ')}
          </p>
        )}
        {missing.length > 0 && (
          <ul className="small muted">
            {missing.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}
        <Sources refs={step.sources} />
      </div>
      <p className="actions">
        <button type="button" disabled={pos === 1} onClick={() => setTour(prevStep)}>
          Önceki adım
        </button>
        {pos < total ? (
          <button type="button" className="primary" onClick={() => setTour(nextStep)}>
            Sonraki adım
          </button>
        ) : (
          <button type="button" className="primary" onClick={onExit}>
            Dersi bitir
          </button>
        )}
        <button type="button" onClick={onExit}>
          Dersten çık
        </button>
      </p>
    </section>
  )
}

export function LessonPanel() {
  const { index, store, engine } = useServices()
  const [active, setActive] = useState<Lesson | null>(null)
  const before = useRef<SceneState | null>(null)
  const lessons = [...index.bundle.lessons].sort((a, b) => a.id.localeCompare(b.id))

  const start = (l: Lesson) => {
    before.current = store.getState().scene
    setActive(l)
  }
  const exit = () => {
    engine?.setHighlight([], null)
    if (before.current) store.getState().loadScene(before.current, 'Ders öncesi görünüm')
    before.current = null
    setActive(null)
  }

  if (active) return <Player key={active.id} lesson={active} onExit={exit} />

  return (
    <section aria-labelledby="lessons-title">
      <h2 id="lessons-title">Rehberli dersler</h2>
      {lessons.length === 0 && <p className="muted">Henüz ders eklenmedi.</p>}
      <ul className="lesson-list">
        {lessons.map((l) => {
          const avail = lessonAvailability(l, index)
          return (
            <li key={l.id}>
              <h3>{l.title}</h3>
              <p className="small muted">
                {DETAIL_LEVEL_LABEL[l.level]} · {l.steps.length} adım
                {l.review !== 'approved' && <span className="badge warn">{REVIEW_STATUS_LABEL[l.review]}</span>}
              </p>
              <ul className="small">
                {l.objectives.map((o) => (
                  <li key={o.id}>{o.text}</li>
                ))}
              </ul>
              {avail.missing.length > 0 && (
                <p className="small muted">{avail.missing.length} yapı 3B olarak gösterilemiyor; metinleri yine de okunabilir.</p>
              )}
              <button type="button" className="primary" onClick={() => start(l)}>
                Derse başla
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
