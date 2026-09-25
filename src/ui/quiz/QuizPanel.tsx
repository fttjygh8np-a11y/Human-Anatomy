/**
 * Quiz and exam UI: configuration, question flow (3D pick, multiple choice, typed answer),
 * feedback with sources (practice modes only), results, and progress/SRS recording.
 * Shortfalls and exclusions from the generator are always shown — never a silent cap.
 */
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { SYSTEM_IDS, type DetailLevel, type SceneState, type SourceRef, type SystemId } from '../../core/schema.ts'
import { DETAIL_LEVEL_LABEL } from '../../i18n/labels.ts'
import { generateQuiz } from '../../learning/generator.ts'
import { applyQuestionScene, planAnswerReveal } from '../../learning/prepareScene.ts'
import { applySceneActions, type SceneEffects } from '../../learning/sceneActions.ts'
import { createQuizSession, type QuizSession } from '../../learning/session.ts'
import type { GenerationReport, QuizMode } from '../../learning/types.ts'
import { useServices } from '../services.tsx'

const MODE_LABEL: Record<Exclude<QuizMode, 'section'>, string> = {
  find: '3B modelde bul',
  name: 'Adını yaz / seç',
  relation: 'İlişki soruları',
  review: 'Tekrar (aralıklı tekrar)',
  exam: 'Sınav (süreli, geri bildirim sonda)',
}

function Sources({ refs }: { refs: SourceRef[] }) {
  const { index } = useServices()
  if (refs.length === 0) return null
  return (
    <p className="small muted">
      Kaynak:{' '}
      {refs
        .map((r) => `${index.getSource(r.sourceId)?.shortLabel ?? r.sourceId}${r.locator ? `, ${r.locator}` : ''}`)
        .join('; ')}
    </p>
  )
}

function formatMs(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

function useSession(session: QuizSession) {
  useSyncExternalStore(session.subscribe, session.getState)
  return session.view()
}

function Runner({ session, onExit }: { session: QuizSession; onExit: () => void }) {
  const { index, store, engine, user, settings } = useServices()
  const view = useSession(session)
  const [text, setText] = useState('')
  const saved = useRef(false)
  const q = view.question

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

  // Exam timer.
  useEffect(() => {
    if (view.remainingMs === null || view.phase === 'finished') return
    const t = setInterval(() => session.tick(), 1000)
    return () => clearInterval(t)
  }, [session, view.remainingMs, view.phase])

  // Prepare the scene for each new question; drop questions whose structures cannot be shown.
  const qid = view.phase === 'question' ? q?.id : undefined
  useEffect(() => {
    if (!qid || !q) return
    const { plan, result } = applyQuestionScene(store, q, index, effects)
    if (plan.blocked.length > 0) {
      session.markUnavailable(`${plan.blocked.length} yapı gösterilemedi`)
    } else if (q.highlight) {
      const target = q.highlight
      // Show only the structure to be named: deep structures are otherwise hidden behind others.
      store.getState().isolate([target])
      // Frame it once its model has loaded (the first focus may run before the load finishes).
      void result.done.then(() => {
        if (session.view().question?.id === q.id) {
          engine?.setHighlight([target], 'quiz_target')
          engine?.focusStructures([target])
        }
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per question id
  }, [qid])

  // 3D picks answer 'find' questions.
  useEffect(() => {
    if (!engine || view.phase !== 'question' || q?.type !== 'find') return
    return engine.on((e) => {
      if (e.type === 'pick' && e.structureId) session.answer({ structureId: e.structureId })
    })
  }, [engine, session, view.phase, q?.type])

  // After answering (practice): reveal the correct structure.
  const item = session.getState().items[session.getState().index]
  useEffect(() => {
    if (view.phase !== 'feedback' || !q || !item) return
    const plan = planAnswerReveal(q, store.getState().scene, index, { grade: item.grade, response: item.response })
    applySceneActions(store, plan.actions, effects, 'Yanıt gösterildi')
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per feedback phase
  }, [view.phase, q?.id])

  // Persist results once.
  const results = view.phase === 'finished' ? session.results() : null
  useEffect(() => {
    const r = session.results()
    if (view.phase !== 'finished' || !r || saved.current) return
    saved.current = true
    engine?.setHighlight([], null)
    if (!user) return
    void (async () => {
      for (const u of r.progressUpdates) await user.recordAnswer(u.structureId, u.correct, u.quality, new Date(u.answeredAt))
      await user.addQuizAttempt(session.attempt())
    })()
  }, [view.phase, user, session, engine])

  if (results) {
    return (
      <section aria-labelledby="quiz-results">
        <h2 id="quiz-results">Sonuç: %{results.percent}</h2>
        <p>
          {results.correct} doğru, {results.incorrect} yanlış, {results.skipped} atlandı, {results.unanswered} yanıtsız
          {results.unavailable > 0 && `, ${results.unavailable} soru gösterilemediği için sayılmadı`}.
          {results.finishReason === 'time_up' && ' Süre doldu.'}
        </p>
        {results.bySystem.length > 1 && (
          <ul>
            {results.bySystem.map((r) => (
              <li key={r.key}>
                {r.key === 'unassigned' ? 'Sistemsiz' : (index.bundle.systems.find((s) => s.id === r.key)?.name.tr ?? r.key)}: {r.correct}/
                {r.total} (%{r.percent})
              </li>
            ))}
          </ul>
        )}
        <h3>Sorular</h3>
        <ol>
          {results.items.map((it) => (
            <li key={it.question.id}>
              {it.question.prompt} —{' '}
              {it.status === 'answered' ? (it.grade?.correct ? '✓ doğru' : `✗ yanlış (doğru yanıt: ${it.grade?.expected ?? '—'})`) : it.status}
              <Sources refs={it.question.sources} />
            </li>
          ))}
        </ol>
        <button type="button" className="primary" onClick={onExit}>
          Yeni sınav
        </button>
      </section>
    )
  }

  if (!q) return null
  const submitText = () => {
    session.answer({ text })
    setText('')
  }

  return (
    <section aria-labelledby="quiz-q">
      <p className="small muted">
        Soru {view.position}/{view.total}
        {view.remainingMs !== null && <> · Kalan süre: <span role="timer">{formatMs(view.remainingMs)}</span></>}
        {q.reviewStatus !== 'approved' && <span className="badge warn">Uzman onayı bekliyor</span>}
      </p>
      <h2 id="quiz-q">{q.prompt}</h2>

      {view.phase === 'question' && (
        <>
          {q.options ? (
            <ul className="quiz-options">
              {q.options.map((o) => (
                <li key={o.id}>
                  <button type="button" onClick={() => session.answer({ optionId: o.id })}>
                    {o.text}
                  </button>
                </li>
              ))}
            </ul>
          ) : q.type === 'find' ? (
            <>
              <p>3B modelde yapıya tıklayın.</p>
              <button
                type="button"
                disabled={store.getState().scene.selected.length === 0}
                onClick={() => session.answer({ structureId: store.getState().scene.selected.at(-1) ?? null })}
              >
                Seçili yapıyı yanıt olarak gönder
              </button>
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                submitText()
              }}
            >
              <label htmlFor="quiz-answer">Yanıtınız</label>{' '}
              <input id="quiz-answer" autoComplete="off" value={text} onChange={(e) => setText(e.target.value)} lang={settings.nameLanguage} />{' '}
              <button type="submit" className="primary">
                Yanıtla
              </button>
            </form>
          )}
          <p>
            {view.canSkip && (
              <button type="button" onClick={() => session.skip()}>
                Atla
              </button>
            )}{' '}
            <button type="button" onClick={() => session.finish()}>
              Bitir
            </button>
          </p>
        </>
      )}

      {view.phase === 'feedback' && view.feedback && (
        <div aria-live="assertive">
          <p className={`quiz-feedback ${view.feedback.correct ? 'correct' : 'wrong'}`}>
            {view.feedback.feedback}
          </p>
          <p>{q.explanation}</p>
          <Sources refs={q.sources} />
          <button type="button" className="primary" onClick={() => session.next()} autoFocus>
            {view.position < view.total ? 'Sonraki soru' : 'Sonuçları gör'}
          </button>
        </div>
      )}
      {view.phase === 'feedback' && !view.feedback && (
        <button type="button" className="primary" onClick={() => session.next()}>
          Sonraki soru
        </button>
      )}
    </section>
  )
}

export function QuizPanel({ onActiveChange }: { onActiveChange?: (suppressLabels: boolean) => void }) {
  const { index, user, settings, store } = useServices()
  const [mode, setMode] = useState<Exclude<QuizMode, 'section'>>('name')
  const [count, setCount] = useState(10)
  const [system, setSystem] = useState<SystemId | ''>('')
  const [level, setLevel] = useState<DetailLevel>('basic')
  const [minutes, setMinutes] = useState(20)
  const [report, setReport] = useState<GenerationReport | null>(null)
  const [session, setSession] = useState<QuizSession | null>(null)

  const available = SYSTEM_IDS.filter((id) => index.bundle.systems.some((s) => s.id === id))

  useEffect(() => {
    if (!session) {
      onActiveChange?.(false)
      return
    }
    const update = () => onActiveChange?.(session.view().suppressLabels)
    update()
    const unsub = session.subscribe(update)
    return () => {
      unsub()
      onActiveChange?.(false)
    }
  }, [session, onActiveChange])

  // Scene before the quiz, restored when it ends (the quiz isolates/reveals structures).
  const before = useRef<SceneState | null>(null)
  const exit = () => {
    if (before.current) store.getState().loadScene(before.current, 'Sınav öncesi görünüm')
    before.current = null
    setSession(null)
    setReport(null)
  }

  const start = async () => {
    const progress = user ? await user.listProgress() : []
    const config = {
      mode,
      count,
      level,
      seed: Date.now() % 2147483647,
      lang: settings.nameLanguage,
      onlyApproved: settings.onlyApprovedQuestions,
      ...(system ? { systems: [system] } : {}),
      ...(mode === 'exam' ? { timeLimitSec: minutes * 60 } : {}),
    }
    const r = generateQuiz(index, config, { progress, now: new Date() })
    setReport(r)
    if (r.questions.length === 0) return
    const s = createQuizSession(r.questions, config)
    before.current = store.getState().scene
    s.start()
    setSession(s)
  }

  if (session) {
    return (
      <Runner session={session} onExit={exit} />
    )
  }

  return (
    <section aria-labelledby="quiz-title">
      <h2 id="quiz-title">Sınav ve tekrar</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void start()
        }}
      >
        <fieldset>
          <legend>Mod</legend>
          {(Object.keys(MODE_LABEL) as (keyof typeof MODE_LABEL)[]).map((m) => (
            <label key={m}>
              <input type="radio" name="quiz-mode" value={m} checked={mode === m} onChange={() => setMode(m)} /> {MODE_LABEL[m]}
            </label>
          ))}
        </fieldset>
        <fieldset>
          <legend>Kapsam</legend>
          <label>
            Sistem{' '}
            <select value={system} onChange={(e) => setSystem(e.target.value as SystemId | '')}>
              <option value="">Tümü</option>
              {available.map((id) => (
                <option key={id} value={id}>
                  {index.bundle.systems.find((s) => s.id === id)?.name.tr}
                </option>
              ))}
            </select>
          </label>
          <label>
            Düzey{' '}
            <select value={level} onChange={(e) => setLevel(e.target.value as DetailLevel)}>
              {(Object.keys(DETAIL_LEVEL_LABEL) as DetailLevel[]).map((l) => (
                <option key={l} value={l}>
                  {DETAIL_LEVEL_LABEL[l]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Soru sayısı{' '}
            <input type="number" min={1} max={100} value={count} onChange={(e) => setCount(Math.max(1, Number(e.target.value) || 1))} />
          </label>
          {mode === 'exam' && (
            <label>
              Süre (dk){' '}
              <input type="number" min={1} max={240} value={minutes} onChange={(e) => setMinutes(Math.max(1, Number(e.target.value) || 1))} />
            </label>
          )}
        </fieldset>
        {settings.onlyApprovedQuestions && <p className="small">Yalnızca uzman onaylı içerikten soru üretiliyor (Ayarlar).</p>}
        <button type="submit" className="primary">
          Başlat
        </button>
      </form>

      {report && (report.shortfallReasons.length > 0 || (report.exclusions?.length ?? 0) > 0) && (
        <div role="status" className="small">
          {report.questions.length === 0 && <p>Bu ayarlarla soru üretilemedi.</p>}
          <ul>
            {report.shortfallReasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
            {report.exclusions?.map((x) => (
              <li key={x.reason} className="muted">
                {x.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
