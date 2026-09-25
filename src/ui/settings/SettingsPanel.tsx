/**
 * Settings and local data rights: display/accessibility preferences, name language,
 * question source filter, and export/import/delete of all locally stored user data.
 */
import { useRef, useState } from 'react'
import type { UserSettings } from '../../user/types.ts'
import { useServices } from '../services.tsx'
import { ProgressSection } from './ProgressSection.tsx'

export function SettingsPanel() {
  const { settings, updateSettings, user } = useServices()
  const [status, setStatus] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const set = <K extends keyof UserSettings>(k: K, v: UserSettings[K]) => updateSettings({ [k]: v } as Partial<UserSettings>)

  const exportData = async () => {
    if (!user) return
    const data = await user.exportAll()
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `anatomi-3b-verilerim-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setStatus('Veriler dışa aktarıldı.')
  }

  const importData = async (file: File, mode: 'merge' | 'replace') => {
    if (!user) return
    try {
      const { imported } = await user.importAll(JSON.parse(await file.text()), mode)
      setStatus(`${imported} kayıt içe aktarıldı.`)
    } catch (e) {
      setStatus(`İçe aktarma başarısız: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  const deleteAll = async () => {
    if (!user) return
    if (!window.confirm('Bu tarayıcıdaki tüm notlar, favoriler, ilerleme ve ayarlar silinsin mi? Bu işlem geri alınamaz.')) return
    await user.deleteAll()
    setStatus('Tüm yerel veriler silindi.')
  }

  return (
    <section className="settings-panel" aria-labelledby="settings-title">
      <h2 id="settings-title">Ayarlar</h2>

      <fieldset>
        <legend>Görünüm</legend>
        <label>
          Tema{' '}
          <select value={settings.theme} onChange={(e) => set('theme', e.target.value as UserSettings['theme'])}>
            <option value="system">Sistem</option>
            <option value="light">Açık</option>
            <option value="dark">Koyu</option>
          </select>
        </label>
        <label>
          Yazı boyutu{' '}
          <input
            type="range"
            min={0.85}
            max={1.5}
            step={0.05}
            value={settings.fontScale}
            onChange={(e) => set('fontScale', Number(e.target.value))}
          />{' '}
          %{Math.round(settings.fontScale * 100)}
        </label>
        <label>
          Hareketi azalt{' '}
          <select value={settings.reducedMotion} onChange={(e) => set('reducedMotion', e.target.value as UserSettings['reducedMotion'])}>
            <option value="system">Sistem ayarına uy</option>
            <option value="on">Açık</option>
            <option value="off">Kapalı</option>
          </select>
        </label>
        <label>
          3B kalite{' '}
          <select value={settings.quality} onChange={(e) => set('quality', e.target.value as UserSettings['quality'])}>
            <option value="auto">Otomatik</option>
            <option value="low">Düşük</option>
            <option value="medium">Orta</option>
            <option value="high">Yüksek</option>
          </select>
        </label>
        <label>
          <input type="checkbox" checked={settings.textMode} onChange={(e) => set('textMode', e.target.checked)} /> Metin modu (3B görünüm
          olmadan gezin)
        </label>
      </fieldset>

      <fieldset>
        <legend>Adlandırma</legend>
        <label>
          Birincil ad dili{' '}
          <select value={settings.nameLanguage} onChange={(e) => set('nameLanguage', e.target.value as UserSettings['nameLanguage'])}>
            <option value="tr">Türkçe</option>
            <option value="la">Latince</option>
            <option value="en">İngilizce</option>
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.showSecondaryNames}
            onChange={(e) => set('showSecondaryNames', e.target.checked)}
          />{' '}
          Diğer dillerdeki adları da göster
        </label>
      </fieldset>

      <fieldset>
        <legend>Sorular</legend>
        <label>
          <input
            type="checkbox"
            checked={settings.onlyApprovedQuestions}
            onChange={(e) => set('onlyApprovedQuestions', e.target.checked)}
          />{' '}
          Yalnızca uzman onaylı içerikten soru üret
        </label>
      </fieldset>

      <ProgressSection />

      <fieldset>
        <legend>Verilerim</legend>
        {user ? (
          <>
            <p className="small">
              Misafir modundasınız: notlar, favoriler ve ilerleme yalnızca bu tarayıcıda saklanır. Dışa aktararak yedekleyebilirsiniz.
            </p>
            <button type="button" onClick={exportData}>
              Dışa aktar (JSON)
            </button>
            <button type="button" onClick={() => fileRef.current?.click()}>
              İçe aktar (birleştir)
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void importData(f, 'merge')
                e.target.value = ''
              }}
            />
            <button type="button" className="danger" onClick={deleteAll}>
              Tüm verilerimi sil
            </button>
          </>
        ) : (
          <p className="muted small">Yerel depolama kullanılamıyor (ör. gizli pencere); veriler kaydedilmeyecek.</p>
        )}
        <p role="status" className="small">
          {status}
        </p>
      </fieldset>
    </section>
  )
}
