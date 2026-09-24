import { describe, expect, it } from 'vitest'
import { findCycles } from './integrity.ts'
import { checkWith, checkWithAssets, codes, file, rawAsset, rawStructure } from './test-helpers.ts'

const expert = { name: 'Test Uzman', role: 'anatomy_expert' }
const present = (verification: string, sources: unknown[] = [{ sourceId: 'src:book', locator: 'bölüm 1' }]) => ({ status: 'present', value: 'metin', verification, sources })

/** Right/left pair with a generic concept — a consistent baseline. */
const pair = () =>
  file('structures/pair.json', [
    rawStructure('fma:900000', { laterality: 'paired_generic' }),
    rawStructure('fma:900001', { laterality: 'right', counterpartId: 'fma:900002', genericId: 'fma:900000' }),
    rawStructure('fma:900002', { laterality: 'left', counterpartId: 'fma:900001', genericId: 'fma:900000' }),
  ])

describe('findCycles', () => {
  it('finds each cycle once and ignores unknown nodes', () => {
    const edges = new Map([
      ['a', ['b']],
      ['b', ['c', 'x']],
      ['c', ['a']],
      ['d', ['d']],
    ])
    const cycles = findCycles(['a', 'b', 'c', 'd'], edges)
    expect(cycles).toHaveLength(2)
    expect(cycles.map((c) => c.length).sort()).toEqual([1, 3])
  })
})

describe('checkIntegrity', () => {
  it('accepts consistent content', () => {
    const { issues } = checkWith(pair())
    expect(issues).toEqual([])
  })

  it('reports missing parents, self references and part-of cycles', () => {
    const { issues } = checkWith(
      file('structures/x.json', [
        rawStructure('ax:a', { parentIds: ['ax:b'] }),
        rawStructure('ax:b', { parentIds: ['ax:a'] }),
        rawStructure('ax:c', { parentIds: ['ax:missing', 'ax:c'] }),
        rawStructure('ax:d'),
        rawStructure('ax:e'),
      ]),
      file('relations/r.json', [
        { id: 'rel:1', type: 'part_of', from: 'ax:d', to: 'ax:e', sources: [{ sourceId: 'src:book' }], verification: 'unverified', provenance: 'author:human' },
        { id: 'rel:2', type: 'part_of', from: 'ax:e', to: 'ax:d', sources: [{ sourceId: 'src:book' }], verification: 'unverified', provenance: 'author:human' },
      ]),
    )
    expect(codes(issues, 'error').sort()).toEqual(['missing_structure', 'part_of_cycle', 'part_of_cycle', 'self_reference'])
  })

  it('checks counterpart and generic links for laterality consistency', () => {
    const { issues } = checkWith(
      file('structures/x.json', [
        rawStructure('ax:g', { laterality: 'midline' }),
        rawStructure('ax:r1', { laterality: 'right', counterpartId: 'ax:r2' }),
        rawStructure('ax:r2', { laterality: 'right', counterpartId: 'ax:r1' }),
        rawStructure('ax:r3', { laterality: 'right', counterpartId: 'ax:l3', genericId: 'ax:g' }),
        rawStructure('ax:l3', { laterality: 'left' }),
        rawStructure('ax:m', { laterality: 'midline', counterpartId: 'ax:l3' }),
      ]),
    )
    const errors = codes(issues, 'error')
    expect(errors.filter((c) => c === 'counterpart').length).toBeGreaterThanOrEqual(3)
    expect(errors).toContain('generic_link')
    expect(codes(issues, 'warning')).toContain('counterpart') // missing back-link on ax:l3
  })

  it('rejects a sided structure that is part of the opposite side', () => {
    const { issues } = checkWith(
      file('structures/x.json', [rawStructure('ax:left-parent', { laterality: 'left' }), rawStructure('ax:right-child', { laterality: 'right', parentIds: ['ax:left-parent'] })]),
    )
    expect(codes(issues, 'error')).toEqual(['laterality'])
  })

  it('requires sources for verified names and known source ids everywhere', () => {
    const { issues } = checkWith(
      file('structures/x.json', [
        rawStructure('ax:a', { names: { en: { value: 'a', status: 'verified', sources: [] }, tr: { value: 'a', status: 'unverified', sources: [{ sourceId: 'src:nope' }] } } }),
      ]),
    )
    expect(codes(issues, 'error').sort()).toEqual(['missing_source', 'verified_without_source'])
  })

  it('distinguishes verification states of content fields', () => {
    const { issues } = checkWith(
      file('structures/x.json', [
        rawStructure('ax:a', {
          content: {
            summary: present('source_checked', [{ sourceId: 'src:book' }]),
            description: present('expert_approved'),
            location: present('unverified', [{ sourceId: 'src:terms' }]),
            function: { status: 'not_applicable' },
            origin: { status: 'missing' },
          },
        }),
      ]),
    )
    expect(codes(issues, 'error')).toEqual(['expert_approval_without_review'])
    expect(codes(issues, 'warning').sort()).toEqual(['source_locator', 'weak_text_source'])
  })

  it('accepts expert approval only with a matching review record by an anatomy expert', () => {
    const struct = file('structures/x.json', [rawStructure('ax:a', { content: { summary: present('expert_approved') }, review: { text: 'approved' }, lastReviewedAt: '2026-09-20' })])
    const ok = checkWith(struct, file('reviews/r.json', [{ id: 'rev:1', target: { type: 'structure', id: 'ax:a' }, aspect: 'text', status: 'approved', reviewer: expert, date: '2026-09-20' }]))
    expect(ok.issues).toEqual([])

    const editor = checkWith(
      struct,
      file('reviews/r.json', [{ id: 'rev:1', target: { type: 'structure', id: 'ax:a' }, aspect: 'text', status: 'approved', reviewer: { name: 'Editör', role: 'editor' }, date: '2026-09-20' }]),
    )
    expect(codes(editor.issues, 'error').sort()).toEqual(['expert_approval_without_review', 'expert_approval_without_review', 'review_role'])

    const superseded = checkWith(
      struct,
      file('reviews/r.json', [
        { id: 'rev:1', target: { type: 'structure', id: 'ax:a' }, aspect: 'text', status: 'approved', reviewer: expert, date: '2026-09-20' },
        { id: 'rev:2', target: { type: 'structure', id: 'ax:a' }, aspect: 'text', status: 'needs_revision', reviewer: expert, date: '2026-09-22' },
      ]),
    )
    expect(codes(superseded.issues, 'error')).toContain('expert_approval_without_review')
  })

  it('rejects reviewer-less and misdirected review records', () => {
    const { issues } = checkWith(
      pair(),
      file('reviews/r.json', [
        { id: 'rev:1', target: { type: 'structure', id: 'fma:900001' }, aspect: 'labels', status: 'expert_review_pending', date: '2026-09-20' },
        { id: 'rev:2', target: { type: 'structure', id: 'fma:900001' }, aspect: 'question', status: 'draft', date: '2026-09-20' },
        { id: 'rev:3', target: { type: 'lesson', id: 'lesson:none' }, aspect: 'lesson', status: 'draft', date: '2026-09-20' },
      ]),
    )
    expect(codes(issues, 'error').sort()).toEqual(['missing_target', 'review_aspect', 'review_without_reviewer'])
    expect(codes(issues, 'warning')).toContain('review_state_mismatch')
  })

  it('requires a review record for needs_revision and approved states on every target type', () => {
    const rel = { id: 'rel:1', type: 'adjacent_to', from: 'fma:900001', to: 'fma:900000', sources: [{ sourceId: 'src:book' }], verification: 'unverified', provenance: 'author:human' }
    const bare = checkWith(pair(), file('relations/r.json', [{ ...rel, review: 'needs_revision' }, { ...rel, id: 'rel:2', type: 'contains', review: 'approved' }]))
    expect(codes(bare.issues, 'error').sort()).toEqual(['expert_approval_without_review', 'review_state_mismatch'])
    const recorded = checkWith(
      pair(),
      file('relations/r.json', [{ ...rel, review: 'needs_revision' }]),
      file('reviews/r.json', [{ id: 'rev:1', target: { type: 'relation', id: 'rel:1' }, aspect: 'relations', status: 'needs_revision', reviewer: expert, date: '2026-09-20', notes: 'Yön ters.' }]),
    )
    expect(recorded.issues).toEqual([])
  })

  it('warns about duplicate names and suspicious relations', () => {
    const rel = (id: string, type: string, from: string, to: string) => ({ id, type, from, to, sources: [{ sourceId: 'src:book' }], verification: 'unverified', provenance: 'author:human' })
    const { issues } = checkWith(
      pair(),
      file('structures/dup.json', [rawStructure('ax:x', { names: { en: { value: 'Test  FMA:900001', status: 'unverified', sources: [] } } })]),
      file('relations/r.json', [
        rel('rel:1', 'innervated_by', 'fma:900001', 'fma:900002'),
        rel('rel:2', 'innervated_by', 'fma:900001', 'fma:900002'),
        rel('rel:3', 'adjacent_to', 'fma:900001', 'fma:900001'),
        rel('rel:4', 'adjacent_to', 'fma:900001', 'ax:nope'),
      ]),
    )
    expect(codes(issues, 'error').sort()).toEqual(['missing_structure', 'self_reference'])
    expect(codes(issues, 'warning').sort()).toEqual(['cross_side_relation', 'cross_side_relation', 'duplicate_name', 'duplicate_relation'])
  })

  it('cross-checks model assets: orphans, licenses, sides', () => {
    const noRedistribution = file('sources/closed.json', {
      id: 'src:closed',
      type: 'model_library',
      citation: 'x',
      shortLabel: 'x',
      license: { id: 'x', allowsUse: true, allowsModification: true, allowsRedistribution: false },
    })
    // Right instance at +X (= subject's left) is a side mix-up.
    const wrongSides = rawAsset('asset:a', [
      { node: 'n1', structureId: 'fma:900001', x: 0.2 },
      { node: 'n2', structureId: 'fma:900002', x: -0.2 },
      { node: 'n3', structureId: 'fma:999999' },
      { node: 'n3', structureId: 'fma:900000' },
    ])
    const { issues } = checkWithAssets([wrongSides, rawAsset('asset:b', [], { sourceId: 'src:closed' })], pair(), noRedistribution)
    expect(codes(issues, 'error').sort()).toEqual(['centroid_side', 'duplicate_node', 'license'])
    expect(codes(issues, 'warning').sort()).toEqual(['license_unverified', 'license_unverified', 'orphan_asset_node'])

    const correct = rawAsset('asset:a', [
      { node: 'n1', structureId: 'fma:900001', x: -0.2 },
      { node: 'n2', structureId: 'fma:900002', x: 0.2 },
    ])
    expect(codes(checkWithAssets([correct], pair()).issues, 'error')).toEqual([])
  })

  it('never approves geometry without an expert geometry review of the asset', () => {
    const approved = rawAsset('asset:a', [{ node: 'n1', structureId: 'fma:900001', x: -0.2 }], { review: { geometry: 'approved' } })
    expect(codes(checkWithAssets([approved], pair()).issues, 'error')).toEqual(['expert_approval_without_review'])
    const review = file('reviews/r.json', [{ id: 'rev:g', target: { type: 'asset', id: 'asset:a' }, aspect: 'geometry', status: 'approved', reviewer: expert, date: '2026-09-20' }])
    expect(codes(checkWithAssets([approved], pair(), review).issues, 'error')).toEqual([])
  })

  it('checks lessons, questions and scope targets', () => {
    const { issues } = checkWith(
      pair(),
      file('questions/q.json', [
        {
          id: 'q:1',
          type: 'mcq',
          level: 'basic',
          prompt: 'Test?',
          options: [{ id: 'a', text: 'A', structureId: 'fma:900001' }],
          answer: { optionId: 'b' },
          explanation: 'x',
          requiresVisible: ['ax:nope'],
          sources: [{ sourceId: 'src:book' }],
          provenance: 'author:human',
        },
      ]),
      file('scope/s.json', [
        { id: 'hedef:1', structureId: 'fma:900003', system: 'skeletal', region: 'arm', kind: 'bone', level: 'basic', name: { en: 'x' }, laterality: 'paired_generic', basis: [{ sourceId: 'src:terms' }] },
        { id: 'hedef:2', system: 'skeletal', region: 'nowhere', kind: 'bone', level: 'basic', name: { en: 'y' }, laterality: 'paired_generic', basis: [{ sourceId: 'src:terms' }] },
        { id: 'fma:900001', system: 'muscular', region: 'arm', kind: 'bone', level: 'basic', name: { en: 'z' }, laterality: 'right', basis: [{ sourceId: 'src:terms' }] },
      ]),
    )
    expect(codes(issues, 'error').sort()).toEqual(['missing_region', 'missing_structure', 'question', 'question'])
    expect(codes(issues, 'warning').sort()).toEqual(['scope_target', 'scope_target'])
  })
})
