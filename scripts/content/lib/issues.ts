/**
 * Validation issues shared by the content pipeline (build, validate, inventory, coverage).
 *
 * Severity:
 *  - error:   the content breaks a rule; build and validate fail.
 *  - warning: suspicious or not release-ready; fails only with `--strict`.
 *
 * Messages are Turkish (shown to content authors); `code` is a stable machine key.
 */
import { z } from 'zod'
import trLocale from 'zod/v4/locales/tr.js'

export type Severity = 'error' | 'warning'

export interface Issue {
  severity: Severity
  code: IssueCode
  message: string
  /** Content file (relative to the repository root) the issue comes from, when known. */
  file?: string
  /** Record id the issue is about, when known. */
  recordId?: string
}

/** Stable issue codes with their Turkish group headings (used in reports). */
export const ISSUE_CODE_LABEL = {
  file_read: 'Dosya okunamadı',
  file_format: 'Dosya biçimi hatalı',
  unknown_file: 'Tanınmayan içerik dosyası',
  schema: 'Şema hatası',
  duplicate_id: 'Yinelenen kimlik',
  overlay_without_id: 'Kimliksiz yapı eki',
  missing_source: 'Tanımsız kaynağa atıf',
  missing_structure: 'Tanımsız yapıya bağlantı',
  missing_region: 'Tanımsız bölgeye bağlantı',
  missing_target: 'Tanımsız inceleme hedefi',
  missing_asset: 'Tanımsız model varlığına bağlantı',
  missing_system_record: 'Sistem kaydı eksik',
  region_tree: 'Bölge ağacı sorunu',
  part_of_cycle: 'Parça-bütün (part-of) döngüsü',
  self_reference: 'Kendine bağlantı',
  laterality: 'Taraf (sağ-sol) tutarsızlığı',
  counterpart: 'Karşı taraf eşleşmesi sorunu',
  generic_link: 'Genel kavram bağlantısı sorunu',
  centroid_side: 'Model konumu ile taraf bilgisi çelişiyor',
  verified_without_source: 'Kaynaksız doğrulama',
  source_locator: 'Kaynak konumu belirtilmemiş',
  weak_text_source: 'Metin için yetersiz kaynak türü',
  expert_approval_without_review: 'İnceleme kaydı olmayan uzman onayı',
  review_without_reviewer: 'İncelemeci belirtilmemiş inceleme kaydı',
  review_role: 'Onay yetkisi olmayan incelemeci',
  review_aspect: 'Hedefe uymayan inceleme boyutu',
  review_state_mismatch: 'İnceleme kaydı ile durum uyuşmuyor',
  review_date: 'Son inceleme tarihi sorunu',
  duplicate_name: 'Yinelenen ad',
  duplicate_relation: 'Yinelenen ilişki',
  cross_side_relation: 'Karşı taraflar arasında ilişki',
  orphan_asset_node: 'Envanterde karşılığı olmayan model düğümü',
  duplicate_node: 'Yinelenen model düğümü',
  license: 'Lisans izni yetersiz',
  license_unverified: 'Lisans birincil kaynaktan doğrulanmamış',
  question: 'Soru tutarsızlığı',
  scope_target: 'Kapsam hedefi sorunu',
  variation_source: 'Kaynaksız varyasyon',
  inventory_input: 'Envanter girdisi sorunu',
  output_check: 'Çıktı denetimi başarısız',
} as const
export type IssueCode = keyof typeof ISSUE_CODE_LABEL

export function error(code: IssueCode, message: string, where: { file?: string; recordId?: string } = {}): Issue {
  return { severity: 'error', code, message, ...where }
}

export function warning(code: IssueCode, message: string, where: { file?: string; recordId?: string } = {}): Issue {
  return { severity: 'warning', code, message, ...where }
}

/** Zod error map that produces Turkish messages (custom schema messages still win). */
export const trErrorMap = trLocale().localeError

/** Parse with Turkish error messages. */
export function safeParseTr<T extends z.ZodType>(schema: T, data: unknown): z.ZodSafeParseResult<z.output<T>> {
  return schema.safeParse(data, { error: trErrorMap })
}

/** One line per zod issue: "names.en.value: Geçersiz değer ...". */
export function formatZodError(err: z.ZodError): string[] {
  return err.issues.map((i) => {
    const path = i.path.length > 0 ? i.path.map((p) => (typeof p === 'number' ? `[${p}]` : String(p))).join('.').replace(/\.\[/g, '[') : '(kayıt)'
    return `${path}: ${i.message}`
  })
}

export interface IssueSummary {
  errors: number
  warnings: number
}

export function summarize(issues: readonly Issue[]): IssueSummary {
  let errors = 0
  let warnings = 0
  for (const i of issues) {
    if (i.severity === 'error') errors++
    else warnings++
  }
  return { errors, warnings }
}

/** Whether a run with these issues should fail. `strict` also fails on warnings. */
export function shouldFail(issues: readonly Issue[], strict: boolean): boolean {
  const s = summarize(issues)
  return s.errors > 0 || (strict && s.warnings > 0)
}

/**
 * Turkish plain-text report grouped by severity and issue code.
 * `limitPerCode` keeps very large imports readable; the JSON output keeps everything.
 */
export function formatIssueReport(issues: readonly Issue[], opts: { limitPerCode?: number } = {}): string {
  const limit = opts.limitPerCode ?? 50
  const lines: string[] = []
  for (const severity of ['error', 'warning'] as const) {
    const list = issues.filter((i) => i.severity === severity)
    if (list.length === 0) continue
    lines.push('')
    lines.push(severity === 'error' ? `HATALAR (${list.length})` : `UYARILAR (${list.length})`)
    const byCode = new Map<IssueCode, Issue[]>()
    for (const i of list) {
      const arr = byCode.get(i.code)
      if (arr) arr.push(i)
      else byCode.set(i.code, [i])
    }
    for (const [code, arr] of byCode) {
      lines.push(`  ■ ${ISSUE_CODE_LABEL[code]} [${code}] — ${arr.length}`)
      for (const i of arr.slice(0, limit)) {
        const where = [i.file, i.recordId].filter(Boolean).join(' › ')
        lines.push(`    - ${where ? `${where}: ` : ''}${i.message}`)
      }
      if (arr.length > limit) lines.push(`    … ve ${arr.length - limit} kayıt daha (tamamı için --json)`)
    }
  }
  return lines.join('\n')
}
