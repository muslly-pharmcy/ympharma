import React, { useState } from 'react'
import {
  SeedanceEngine,
  type DramaScriptInput,
  type SeedancePromptOutput,
} from '@/lib/ai/seedance-engine'

const fieldClass =
  'w-full p-2.5 rounded bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500'

export const SeedanceStudio: React.FC = () => {
  const [title, setTitle] = useState('')
  const [genre, setGenre] = useState('Business Drama')
  const [logline, setLogline] = useState('')
  const [sceneDescription, setSceneDescription] = useState('')
  const [characterName, setCharacterName] = useState('')
  const [characterRole, setCharacterRole] = useState('')
  const [characterStyle, setCharacterStyle] = useState('')
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const [output, setOutput] = useState<SeedancePromptOutput | null>(null)

  const handleGenerate = () => {
    if (!title.trim() || !sceneDescription.trim()) {
      setError('يرجى كتابة عنوان المشهد والوصف على الأقل.')
      return
    }
    setError('')

    const inputData: DramaScriptInput = {
      title,
      genre,
      logline: logline || 'مشهد درامي سينمائي عالي الدقة',
      characters: characterName
        ? [
            {
              name: characterName,
              role: characterRole || 'Hero',
              visualStyle: characterStyle || 'Cinematic Style',
            },
          ]
        : [],
      sceneDescription,
      shots: [
        {
          shotType: 'Low Angle Cinematic',
          cameraMovement: 'Push In',
          lighting: 'Cinematic Rim Light',
          aspectRatio: '9:16',
          durationSeconds: 5,
        },
      ],
    }

    setOutput(SeedanceEngine.generateCinematicPrompt(inputData))
    setCopied(false)
  }

  return (
    <div dir="rtl" className="max-w-3xl mx-auto p-5 md:p-8 rounded-2xl bg-slate-900 border border-slate-800 text-slate-100">
      <h1 className="text-2xl font-bold text-amber-400">🎬 SEEDANCE DRAMA STUDIO V2.0</h1>
      <p className="text-sm text-slate-400 mt-1 mb-6">
        محرك توليد الأوامر السينمائية المتقدمة لمنصة Seedance AI
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-1">عنوان المشهد</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: وصول الرئيس التنفيذي"
            className={fieldClass}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1">نوع الدراما (Genre)</label>
            <input value={genre} onChange={(e) => setGenre(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-1">الملخص السريع (Logline)</label>
            <input
              value={logline}
              onChange={(e) => setLogline(e.target.value)}
              placeholder="مثال: مواجهة حاسمة في اجتماع الشركة"
              className={fieldClass}
            />
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
          <h2 className="text-sm font-bold text-slate-200 mb-3">تفاصيل الشخصية الرئيسية</h2>
          <div className="grid md:grid-cols-3 gap-3">
            <input
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              placeholder="الاسم"
              className="p-2 rounded bg-slate-800 border border-slate-700 text-sm text-white placeholder:text-slate-500"
            />
            <input
              value={characterRole}
              onChange={(e) => setCharacterRole(e.target.value)}
              placeholder="الدور"
              className="p-2 rounded bg-slate-800 border border-slate-700 text-sm text-white placeholder:text-slate-500"
            />
            <input
              value={characterStyle}
              onChange={(e) => setCharacterStyle(e.target.value)}
              placeholder="الأسلوب البصري"
              className="p-2 rounded bg-slate-800 border border-slate-700 text-sm text-white placeholder:text-slate-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-300 mb-1">وصف المشهد السينمائي</label>
          <textarea
            value={sceneDescription}
            onChange={(e) => setSceneDescription(e.target.value)}
            rows={5}
            placeholder="صف حركة الكاميرا، انفعال الشخصية، والإضاءة المطلوبة..."
            className={fieldClass}
          />
        </div>

        {error && (
          <p className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded p-2">{error}</p>
        )}

        <button
          onClick={handleGenerate}
          className="w-full py-3 bg-amber-500 hover:bg-amber-600 font-bold text-slate-950 rounded-lg transition duration-200 shadow-lg"
        >
          ⚡ توليد الأمر السينمائي المعتمد (Generate Seedance Prompt)
        </button>
      </div>

      {output && (
        <div className="mt-8 p-4 bg-black/60 rounded-lg border border-amber-500/30">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-mono text-amber-400">STATUS: {output.stage} | LOCKED</span>
            <span className="text-xs font-mono text-slate-500">{output.frameLockHash}</span>
          </div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            الأمر النهائي الموجه لـ Seedance AI:
          </label>
          <pre
            dir="ltr"
            className="p-3 bg-slate-950 rounded text-green-400 text-xs font-mono whitespace-pre-wrap overflow-x-auto border border-slate-800 text-left"
          >
            {output.formattedSeedancePrompt}
          </pre>
          <button
            onClick={() => {
              navigator.clipboard.writeText(output.formattedSeedancePrompt)
              setCopied(true)
            }}
            className="mt-3 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs text-amber-400 rounded border border-slate-600 transition"
          >
            {copied ? '✅ تم النسخ' : '📋 نسخ الأمر'}
          </button>
        </div>
      )}
    </div>
  )
}

export default SeedanceStudio
