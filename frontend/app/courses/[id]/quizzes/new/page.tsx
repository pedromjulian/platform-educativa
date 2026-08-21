'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { quizzesAPI, QuizQuestionInput, QuizOptionInput } from '@/lib/api'

function emptyOption(): QuizOptionInput {
  return { text: '', fraction: 0 }
}

function emptyQuestion(): QuizQuestionInput {
  return { text: '', options: [emptyOption(), emptyOption()] }
}

export default function NewQuizPage() {
  const router = useRouter()
  const params = useParams()
  const courseId = Number(params.id)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [deadline, setDeadline] = useState('')
  const [questions, setQuestions] = useState<QuizQuestionInput[]>([emptyQuestion()])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const role = localStorage.getItem('role')
    if (!token) {
      router.push('/login')
      return
    }
    if (role !== 'teacher') {
      router.push(`/courses/${courseId}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateQuestionText = (qIdx: number, text: string) => {
    const next = [...questions]
    next[qIdx] = { ...next[qIdx], text }
    setQuestions(next)
  }

  const updateOption = (qIdx: number, oIdx: number, field: 'text' | 'fraction', value: string) => {
    const next = [...questions]
    const options = [...next[qIdx].options]
    options[oIdx] = {
      ...options[oIdx],
      [field]: field === 'fraction' ? parseFloat(value) || 0 : value,
    }
    next[qIdx] = { ...next[qIdx], options }
    setQuestions(next)
  }

  const addQuestion = () => setQuestions([...questions, emptyQuestion()])
  const removeQuestion = (qIdx: number) => setQuestions(questions.filter((_, i) => i !== qIdx))

  const addOption = (qIdx: number) => {
    const next = [...questions]
    next[qIdx] = { ...next[qIdx], options: [...next[qIdx].options, emptyOption()] }
    setQuestions(next)
  }

  const removeOption = (qIdx: number, oIdx: number) => {
    const next = [...questions]
    next[qIdx] = { ...next[qIdx], options: next[qIdx].options.filter((_, i) => i !== oIdx) }
    setQuestions(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (questions.length === 0) {
      setError('Agregá al menos una pregunta')
      return
    }
    for (const q of questions) {
      if (!q.text.trim()) {
        setError('Todas las preguntas necesitan un enunciado')
        return
      }
      if (q.options.length < 2) {
        setError('Cada pregunta necesita al menos 2 opciones')
        return
      }
      if (q.options.some((o) => !o.text.trim())) {
        setError('Todas las opciones necesitan texto')
        return
      }
    }

    setSubmitting(true)
    try {
      await quizzesAPI.create(courseId, {
        title,
        description: description || undefined,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
        questions,
      })
      router.push(`/courses/${courseId}`)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al crear el cuestionario')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm p-4">
        <button onClick={() => router.push(`/courses/${courseId}`)} className="text-sm text-blue-500 hover:underline mb-1 block">
          ← Volver al curso
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Crear Cuestionario</h1>
      </nav>

      <div className="max-w-4xl mx-auto p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6 space-y-3">
            <input
              type="text"
              placeholder="Título del cuestionario"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
            <textarea
              placeholder="Descripción (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              rows={2}
            />
            <div>
              <label className="block text-sm text-gray-600 mb-1">Fecha límite (opcional)</label>
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <p className="text-sm text-gray-500">
            Cada opción tiene una <strong>fracción</strong>: porcentaje que suma o resta a la nota de la pregunta
            si el estudiante la elige. Usá valores positivos para opciones correctas (ej: 33.33 si hay 3 correctas)
            y negativos para incorrectas (ej: -25).
          </p>

          {questions.map((q, qIdx) => (
            <div key={qIdx} className="bg-white rounded-lg shadow p-6 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-800">Pregunta {qIdx + 1}</h3>
                {questions.length > 1 && (
                  <button type="button" onClick={() => removeQuestion(qIdx)} className="text-red-500 text-sm">
                    Quitar pregunta
                  </button>
                )}
              </div>
              <textarea
                placeholder="Enunciado de la pregunta"
                value={q.text}
                onChange={(e) => updateQuestionText(qIdx, e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                rows={2}
                required
              />

              <div className="space-y-2">
                {q.options.map((o, oIdx) => (
                  <div key={oIdx} className="flex gap-2 items-center">
                    <input
                      type="text"
                      placeholder={`Opción ${oIdx + 1}`}
                      value={o.text}
                      onChange={(e) => updateOption(qIdx, oIdx, 'text', e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      required
                    />
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Fracción %"
                      value={o.fraction}
                      onChange={(e) => updateOption(qIdx, oIdx, 'fraction', e.target.value)}
                      className="w-28 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    />
                    {q.options.length > 2 && (
                      <button type="button" onClick={() => removeOption(qIdx, oIdx)} className="text-red-500 text-sm">
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button type="button" onClick={() => addOption(qIdx)} className="text-blue-500 text-sm">
                  + Agregar opción
                </button>
              </div>
            </div>
          ))}

          <button type="button" onClick={addQuestion} className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-2 rounded-lg font-medium">
            + Agregar Pregunta
          </button>

          {error && <p className="text-red-600">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium"
            >
              {submitting ? 'Creando...' : 'Crear Cuestionario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
