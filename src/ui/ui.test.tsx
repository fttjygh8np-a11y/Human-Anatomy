// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { assetSchema, structureSchema } from '../core/schema.ts'
import { createContentIndex } from '../data/contentIndex.ts'
import type { ContentBundle } from '../data/types.ts'
import { createSceneStore } from '../state/sceneStore.ts'
import { DEFAULT_SETTINGS } from '../user/types.ts'
import { InfoPanel } from './info/InfoPanel.tsx'
import { QuizPanel } from './quiz/QuizPanel.tsx'
import { ServicesContext, type Services } from './services.tsx'
import { SceneToolbar } from './toolbar/SceneToolbar.tsx'
import { SystemTree } from './tree/StructureTree.tsx'

const now = '2026-09-24'
const s = (id: string, en: string, parentIds: string[] = [], tr?: string) =>
  structureSchema.parse({
    id,
    schemaVersion: 1,
    kind: 'bone',
    names: { en: { value: en, status: 'unverified' }, ...(tr ? { tr: { value: tr, status: 'unverified' } } : {}) },
    systems: ['skeletal'],
    laterality: 'not_applicable',
    parentIds,
    detailLevel: 'basic',
    content: { summary: { status: 'missing' } },
    provenance: { createdBy: 'author:human', createdAt: now, updatedAt: now },
  })

const bundle: ContentBundle = {
  manifest: { schemaVersion: 1, contentVersion: 't', generatedAt: now, counts: {}, files: {} },
  systems: [{ id: 'skeletal', name: { tr: 'İskelet sistemi', en: 'Skeletal system' }, color: '#dddddd', layerOrder: 0 }],
  regions: [],
  structures: [s('ax:group', 'Group', [], 'Grup'), s('ax:part', 'Part', ['ax:group'], 'Parça')],
  relations: [],
  sources: [],
  assets: [
    assetSchema.parse({
      id: 'asset:t',
      file: 'models/t.glb',
      format: 'glb',
      bytes: 0,
      sourceId: 'src:t',
      coordinateFrame: 'anat-gltf-v1',
      representation: 'schematic',
      lod: 'base',
      chunk: 'skeletal/t',
      systems: ['skeletal'],
      label: { tr: 'T', en: 'T' },
      nodes: [{ node: 'n1', structureId: 'ax:part', triangles: 1, bbox: [0, 0, 0, 1, 1, 1], centroid: [0.5, 0.5, 0.5] }],
      provenance: [{ date: now, step: 'test', tool: 'vitest' }],
    }),
  ],
  lessons: [],
  questions: [],
  reviews: [],
  scope: [],
}

function setup() {
  const store = createSceneStore()
  store.getState().setLoadedAssets(['asset:t'])
  const services: Services = {
    index: createContentIndex(bundle),
    store,
    search: null,
    user: null,
    engine: null,
    settings: DEFAULT_SETTINGS,
    updateSettings: () => {},
  }
  render(
    <ServicesContext.Provider value={services}>
      <SceneToolbar />
      <SystemTree />
      <InfoPanel />
      <QuizPanel />
    </ServicesContext.Provider>,
  )
  return store
}

afterEach(cleanup)

describe('UI shell', () => {
  it('expands the system tree and shows the selected structure without inventing content', () => {
    const store = setup()
    expect(screen.getByText(/Bilgi görmek için/)).toBeTruthy()
    fireEvent.click(within(screen.getByRole('tree')).getByText('İskelet sistemi'))
    fireEvent.click(screen.getByText('Grup'))
    expect(store.getState().scene.selected).toEqual(['ax:group'])
    expect(screen.getByRole('heading', { level: 2, name: 'Grup' })).toBeTruthy()
    expect(screen.getByText(/kaynaklı açıklama henüz eklenmedi/)).toBeTruthy()
    // LA name missing -> shown as missing
    expect(screen.getAllByText('Henüz eklenmedi').length).toBeGreaterThan(0)
  })

  it('hides via the info card and undoes with the toolbar', () => {
    const store = setup()
    act(() => store.getState().select(['ax:part']))
    fireEvent.click(screen.getByRole('button', { name: 'Gizle' }))
    expect(store.getState().scene.visibility['ax:part']).toBe('hidden')
    fireEvent.click(screen.getByRole('button', { name: 'Geri al: Gizle' }))
    expect(store.getState().scene.visibility['ax:part']).toBeUndefined()
  })

  it('refuses to generate questions from unsourced names and says why', async () => {
    setup()
    fireEvent.click(screen.getByRole('button', { name: 'Başlat' }))
    expect(await screen.findByText('Bu ayarlarla soru üretilemedi.')).toBeTruthy()
  })
})
