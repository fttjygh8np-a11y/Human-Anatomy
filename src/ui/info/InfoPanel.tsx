/**
 * Structure info card: names (TR/LA/EN) with verification state, classification, review
 * status, sourced content fields (missing content is shown as missing, never invented),
 * relation groups that can be highlighted in 3D, scene actions and cited sources.
 */
import { useEffect, useState } from 'react'
import type { NameEntry, SourceRef, Structure, StructureContentField } from '../../core/schema.ts'
import { STRUCTURE_CONTENT_FIELDS } from '../../core/schema.ts'
import {
  DETAIL_LEVEL_LABEL,
  FIELD_STATE_LABEL,
  LATERALITY_LABEL,
  RELATION_GROUPS,
  RELATION_LABEL,
  REVIEW_ASPECT_LABEL,
  REVIEW_STATUS_LABEL,
  STRUCTURE_KIND_LABEL,
} from '../../i18n/labels.ts'
import { HIDDEN_REASON_LABEL, resolveVisibility } from '../../state/visibility.ts'
import { useScene, useServices } from '../services.tsx'

export const CONTENT_FIELD_LABEL: Record<StructureContentField, string> = {
  summary: 'Kısa açıklama',
  description: 'Ayrıntılı açıklama',
  location: 'Konum',
  parts: 'Bölümleri',
  relationsText: 'Komşuluklar ve bağlantılar',
  function: 'İşlev',
  origin: 'Başlangıç (origo)',
  insertion: 'Sonlanış (insersiyo)',
  action: 'Hareket / etki',
  jointType: 'Eklem tipi',
  movements: 'Hareketler',
  clinicalNotes: 'Klinik anatomi notları',
  variations: 'Varyasyonlar',
}

function SourceList({ refs }: { refs: SourceRef[] }) {
  const { index } = useServices()
  if (refs.length === 0) return null
  return (
    <span className="source-refs">
      {refs.map((r, i) => {
        const src = index.getSource(r.sourceId)
        const text = `${src?.shortLabel ?? r.sourceId}${r.locator ? `, ${r.locator}` : ''}`
        return (
          <cite key={`${r.sourceId}-${i}`} title={src?.citation}>
            {src?.url ? (
              <a href={src.url} target="_blank" rel="noreferrer noopener">
                {text}
              </a>
            ) : (
              text
            )}
          </cite>
        )
      })}
    </span>
  )
}

function NameLine({ lang, entry }: { lang: string; entry: NameEntry | undefined }) {
  return (
    <div className="name-line">
      <span className="lang-tag">{lang}</span>
      {entry ? (
        <>
          <span lang={lang.toLowerCase()}>{entry.value}</span>
          <span className={`badge ${entry.status === 'verified' ? 'ok' : 'warn'}`}>
            {entry.status === 'verified' ? 'Doğrulandı' : FIELD_STATE_LABEL.unverified}
          </span>
          <SourceList refs={entry.sources} />
        </>
      ) : (
        <span className="muted">{FIELD_STATE_LABEL.missing}</span>
      )}
    </div>
  )
}

function ContentFields({ s }: { s: Structure }) {
  const present = STRUCTURE_CONTENT_FIELDS.filter((f) => s.content[f]?.status === 'present')
  const missing = STRUCTURE_CONTENT_FIELDS.filter((f) => s.content[f]?.status === 'missing')
  if (present.length === 0) {
    return <p className="muted">Bu yapı için kaynaklı açıklama henüz eklenmedi.</p>
  }
  return (
    <dl className="content-fields">
      {present.map((f) => {
        const field = s.content[f]
        if (field?.status !== 'present') return null
        return (
          <div key={f}>
            <dt>
              {CONTENT_FIELD_LABEL[f]}{' '}
              <span className={`badge ${field.verification === 'expert_approved' ? 'ok' : 'warn'}`}>
                {FIELD_STATE_LABEL[field.verification]}
              </span>
            </dt>
            <dd>
              {Array.isArray(field.value) ? (
                <ul>
                  {field.value.map((v, i) => (
                    <li key={i}>{v}</li>
                  ))}
                </ul>
              ) : (
                <p>{field.value}</p>
              )}
              {field.variantNote && <p className="note">Varyasyon: {field.variantNote}</p>}
              <SourceList refs={field.sources} />
            </dd>
          </div>
        )
      })}
      {missing.length > 0 && (
        <p className="muted small">Henüz eklenmedi: {missing.map((f) => CONTENT_FIELD_LABEL[f]).join(', ')}</p>
      )}
    </dl>
  )
}

function RelationGroups({ s }: { s: Structure }) {
  const { index, engine, store, settings } = useServices()
  const [active, setActive] = useState<string | null>(null)

  // Clear temporary emphasis when the card unmounts (the card is keyed by structure id).
  useEffect(() => () => engine?.setHighlight([], null), [engine])

  const groups = RELATION_GROUPS.map((g) => ({ ...g, views: index.relationsOf(s.id, g.types) })).filter(
    (g) => g.views.length > 0,
  )
  const kids = index.childrenOf(s.id)
  // Sided instances of a generic concept are not its parts.
  const instances = kids.filter((c) => c.genericId === s.id)
  const children = kids.filter((c) => c.genericId !== s.id)
  if (groups.length === 0 && kids.length === 0) {
    return <p className="muted">Bu yapı için kaynaklı ilişki kaydı henüz yok.</p>
  }

  const toggle = (id: string, ids: string[]) => {
    const next = active === id ? null : id
    setActive(next)
    engine?.setHighlight(next ? ids : [], next ? 'relation' : null)
  }
  const open = (id: string) => store.getState().select([id])

  return (
    <div className="relation-groups">
      {instances.length > 0 && (
        <section>
          <h4>
            Sağ ve sol örnekleri{' '}
            <button type="button" className="link-btn" aria-pressed={active === 'instances'} onClick={() => toggle('instances', instances.map((c) => c.id))}>
              3B'de vurgula
            </button>
          </h4>
          <ul>
            {instances.map((c) => (
              <li key={c.id}>
                <button type="button" className="link-btn" onClick={() => open(c.id)}>
                  {index.displayName(c.id, settings.nameLanguage)}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {children.length > 0 && (
        <section>
          <h4>
            Parçaları{' '}
            <button type="button" className="link-btn" aria-pressed={active === 'parts'} onClick={() => toggle('parts', children.map((c) => c.id))}>
              3B'de vurgula
            </button>
          </h4>
          <ul>
            {children.map((c) => (
              <li key={c.id}>
                <button type="button" className="link-btn" onClick={() => open(c.id)}>
                  {index.displayName(c.id, settings.nameLanguage)}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {groups.map((g) => (
        <section key={g.id}>
          <h4>
            {g.label}{' '}
            <button type="button" className="link-btn" aria-pressed={active === g.id} onClick={() => toggle(g.id, g.views.map((v) => v.otherId))}>
              3B'de vurgula
            </button>
          </h4>
          <ul>
            {g.views.map((v) => (
              <li key={`${v.relation.id}-${v.direction}`}>
                <span className="muted small">{RELATION_LABEL[v.relation.type][v.direction]}: </span>
                <button type="button" className="link-btn" onClick={() => open(v.otherId)}>
                  {index.displayName(v.otherId, settings.nameLanguage)}
                </button>
                {v.relation.qualifier && <span className="small"> ({v.relation.qualifier})</span>}
                {v.relation.isVariant && <span className="badge warn">Varyasyon</span>}
                <span className={`badge ${v.relation.verification === 'expert_approved' ? 'ok' : 'warn'}`}>
                  {FIELD_STATE_LABEL[v.relation.verification]}
                </span>
                <SourceList refs={v.relation.sources} />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function Actions({ s }: { s: Structure }) {
  const { index, store, engine, user } = useServices()
  const scene = useScene((st) => st.scene)
  const [fav, setFav] = useState(false)
  const vis = resolveVisibility(s.id, scene, index)
  const api = store.getState()

  useEffect(() => {
    let alive = true
    user?.isFavorite(s.id).then((v) => alive && setFav(v))
    user?.recordView(s.id).catch(() => {})
    return () => {
      alive = false
    }
  }, [s.id, user])

  const hasModel = vis.mode !== 'absent'
  return (
    <div className="actions" role="group" aria-label="Yapı işlemleri">
      <button type="button" disabled={!hasModel} onClick={() => engine?.focusStructures([s.id])}>
        Odakla
      </button>
      <button type="button" disabled={!hasModel} onClick={() => api.isolate([s.id])}>
        İzole et
      </button>
      {vis.mode === 'hidden' ? (
        <button type="button" onClick={() => api.reveal([s.id])}>
          Göster
        </button>
      ) : (
        <button type="button" disabled={!hasModel} onClick={() => api.setVisibility([s.id], 'hidden')}>
          Gizle
        </button>
      )}
      <button type="button" disabled={!hasModel} onClick={() => api.setVisibility([s.id], vis.mode === 'ghost' ? 'visible' : 'ghost')}>
        {vis.mode === 'ghost' ? 'Opak yap' : 'Saydamlaştır'}
      </button>
      <button type="button" disabled={!hasModel} onClick={() => api.dissect([s.id])}>
        Diseksiyonla kaldır
      </button>
      {user && (
        <button type="button" aria-pressed={fav} onClick={() => user.toggleFavorite(s.id).then(setFav)}>
          {fav ? '★ Favoride' : '☆ Favorilere ekle'}
        </button>
      )}
      {vis.reason && <p className="muted small">{HIDDEN_REASON_LABEL[vis.reason]}</p>}
    </div>
  )
}

export function InfoPanel() {
  const { index, settings } = useServices()
  const selected = useScene((st) => st.scene.selected)
  const id = selected[selected.length - 1]
  const s = id ? index.getStructure(id) : undefined

  if (!s) {
    return (
      <section className="info-panel" aria-label="Yapı bilgisi">
        <p className="muted">Bilgi görmek için modelde, ağaçta veya aramada bir yapı seçin.</p>
      </section>
    )
  }

  const reviews = index.reviewsFor(s.id)
  const title = index.displayName(s.id, settings.nameLanguage)
  return (
    <section className="info-panel" aria-labelledby="info-title" aria-live="polite">
      <h2 id="info-title">{title}</h2>
      {selected.length > 1 && <p className="muted small">{selected.length} yapı seçili; sonuncusu gösteriliyor.</p>}
      <div className="names">
        <NameLine lang="TR" entry={s.names.tr} />
        <NameLine lang="LA" entry={s.names.la} />
        <NameLine lang="EN" entry={s.names.en} />
        {s.synonyms.length > 0 && (
          <p className="small">
            Eş anlamlılar: {s.synonyms.map((x) => `${x.value} (${x.lang.toUpperCase()})`).join(', ')}
          </p>
        )}
      </div>

      <dl className="facts">
        <dt>Tür</dt>
        <dd>{STRUCTURE_KIND_LABEL[s.kind]}</dd>
        <dt>Sistem</dt>
        <dd>{s.systems.map((x) => index.bundle.systems.find((r) => r.id === x)?.name.tr ?? x).join(', ')}</dd>
        {s.regions.length > 0 && (
          <>
            <dt>Bölge</dt>
            <dd>{s.regions.map((x) => index.bundle.regions.find((r) => r.id === x)?.name.tr ?? x).join(', ')}</dd>
          </>
        )}
        <dt>Taraf</dt>
        <dd>{LATERALITY_LABEL[s.laterality]}</dd>
        <dt>Düzey</dt>
        <dd>{DETAIL_LEVEL_LABEL[s.detailLevel]}</dd>
        {s.sex !== 'both' && (
          <>
            <dt>Cinsiyet</dt>
            <dd>{s.sex === 'female' ? 'Kadın' : 'Erkek'}</dd>
          </>
        )}
      </dl>

      <Actions s={s} />

      <h3>Açıklama</h3>
      <ContentFields s={s} />

      <h3>İlişkiler</h3>
      <RelationGroups key={s.id} s={s} />

      <h3>İnceleme durumu</h3>
      <ul className="review-state">
        {(Object.keys(s.review) as (keyof typeof s.review)[]).map((aspect) => (
          <li key={aspect}>
            {REVIEW_ASPECT_LABEL[aspect]}:{' '}
            <span className={`badge ${s.review[aspect] === 'approved' ? 'ok' : 'warn'}`}>
              {REVIEW_STATUS_LABEL[s.review[aspect]]}
            </span>
          </li>
        ))}
      </ul>
      {reviews.length > 0 && (
        <details>
          <summary>İnceleme kayıtları ({reviews.length})</summary>
          <ul>
            {reviews.map((r) => (
              <li key={r.id}>
                {r.date} · {REVIEW_ASPECT_LABEL[r.aspect]} · {REVIEW_STATUS_LABEL[r.status]}
                {r.reviewer && ` · ${r.reviewer.name}`}
                {r.notes && ` — ${r.notes}`}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}
