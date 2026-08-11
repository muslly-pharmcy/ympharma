import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Thin Web Speech API wrapper for hands-free Arabic voice input.
 * Browser-only: everything is guarded so SSR never touches `window`.
 */

type SpeechRecognitionLike = {
  lang: string
  continuous: boolean
  interimResults: boolean
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: any) => void) | null
  onerror: ((event: any) => void) | null
  onend: (() => void) | null
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null
  const w = window as any
  return w.SpeechRecognition || w.webkitSpeechRecognition || null
}

export interface UseSpeechRecognitionOptions {
  lang?: string
  /** Fired once the user stops speaking with the final transcript. */
  onResult?: (transcript: string) => void
  continuous?: boolean
}

export function useSpeechRecognition({
  lang = 'ar-SA',
  onResult,
  continuous = false,
}: UseSpeechRecognitionOptions = {}) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const onResultRef = useRef(onResult)
  onResultRef.current = onResult

  useEffect(() => {
    setSupported(!!getRecognitionCtor())
    return () => {
      try {
        recognitionRef.current?.abort()
      } catch {
        /* noop */
      }
    }
  }, [])

  const stop = useCallback(() => {
    try {
      recognitionRef.current?.stop()
    } catch {
      /* noop */
    }
    setListening(false)
  }, [])

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor()
    if (!Ctor) {
      setError('المتصفح لا يدعم الإدخال الصوتي')
      return
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort()
      } catch {
        /* noop */
      }
    }
    const recognition = new Ctor()
    recognition.lang = lang
    recognition.continuous = continuous
    recognition.interimResults = true

    recognition.onresult = (event: any) => {
      let interim = ''
      let final = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0]?.transcript ?? ''
        if (event.results[i].isFinal) final += chunk
        else interim += chunk
      }
      setTranscript(final || interim)
      if (final.trim()) onResultRef.current?.(final.trim())
    }
    recognition.onerror = (event: any) => {
      const code = event?.error
      setError(
        code === 'not-allowed'
          ? 'تم رفض إذن الميكروفون'
          : code === 'no-speech'
            ? 'لم يتم التقاط صوت — حاول مجدداً'
            : 'تعذّر الإدخال الصوتي',
      )
      setListening(false)
    }
    recognition.onend = () => setListening(false)

    recognitionRef.current = recognition
    setError(null)
    setTranscript('')
    try {
      recognition.start()
      setListening(true)
    } catch {
      setError('تعذّر بدء الاستماع')
    }
  }, [lang, continuous])

  const toggle = useCallback(() => (listening ? stop() : start()), [listening, start, stop])

  return { supported, listening, transcript, error, start, stop, toggle }
}
