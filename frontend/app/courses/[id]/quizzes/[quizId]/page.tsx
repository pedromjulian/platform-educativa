'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { quizzesAPI, QuizAnswerInput } from '@/lib/api'

interface OptionTeacher {
  id: number
  text: string
  fraction: number
  order: number
}

interface QuestionTeacher {
  id: number
  text: string
  order: number
  options: OptionTeacher[]
}

interface QuizTeacher {
  id: number
  title: string
  description?: string
  questions: QuestionTeacher[]
}

interface OptionStat {
  option_id: number
  text: string
  fraction: number
  times_selected: number
}

interface QuestionStat {
  question_id: number
  text: string
  options: OptionStat[]
}

interface StatsResponse {
  total_submissions: number
  average_score: number | null
  question_stats: QuestionStat[]
}

interface OptionStudent {
  id: number
  text: string
  order: number
}

interface QuestionStudent {
  id: number
  text: string
  order: number
  options: OptionStudent[]
}

interface QuizStudent {
  id: number
  title: string
  description?: string
  questions: QuestionStudent[]
}

interface SubmissionResult {
  score: number
  breakdown: { question_id: number; score: number }[]
}

export default function QuizDetailPage() {
  const router = useRouter()
  const params = useParams()
  const courseId = Number(params.id)
  const quizId = Number(params.quizId)

  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const [teacherQuiz, setTeacherQuiz] = useState<QuizTeacher | null>(null)
  const [stats, setStats] = useState<StatsResponse | null>(null)

  const [studentQuiz, setStudentQuiz] = useState<QuizStudent | null>(null)
  const [answers, setAnswers] = useState<Record<number, number[]>>({})
  const [alreadyDone, setAlreadyDone] = useState(false)
  const [existingScore, setExistingScore] = useState<number | null>(null)
  const [result, setResult] = useState<SubmissionResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    const r = localStorage.getItem('role')
    setRole(r)
    loadData(r)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quizId])

  const loadData = async (r: string | null) => {
    setLoading(true)
    try {
      if (r === 'teacher') {
        const [quizRes, statsRes] = await Promise.all([
          quizzesAPI.getTeacherView(courseId, quizId),
          quizzesAPI.exportStats(courseId, quizId),
        ])
        setTeacherQuiz(quizRes.data)
        setStats(statsRes.data)
      } else {
        try {
          const subRes = await quizzesAPI.getMySubmission(quizId)
          setAlreadyDone(true)
          setExistingScore(subRes.data.score)
        } catch {
          const quizRes = await quizzesAPI.take(quizId)
          setStudentQuiz(quizRes.data)
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const toggleOption = (questionId: number, optionId: number) => {
    const current = answers[questionId] || []
    const next = current.includes(optionId)
      ? current.filter((id) => id !== optionId)
      : [...current, optionId]
    setAnswers({ ...answers, [questionId]: next })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const payload: QuizAnswerInput[] = Object.entries(answers).map(([qId, optIds]) => ({
        question_id: Number(qId),
        selected_option_ids: optIds,
      }))
      const res = await quizzesAPI.submit(quizId, payload)
      setResult(res.data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al enviar respuestas')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-600">Cargando...</div>
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm p-4">
        <button onClick={() => router.push(`/courses/${courseId}`)} className="text-sm text-blue-500 hover:underline mb-1 block">
          ← Volver al curso
        </button>
        <h1 className="text-2xl font-bold text-gray-800">
          {teacherQuiz?.title || studentQuiz?.title}
        </h1>
      </nav>

      <div className="max-w-4xl mx-auto p-8">
        {role === 'teacher' && teacherQuiz && stats && (
          <div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-sm text-blue-800">
              Panel de solo lectura. Para editar/eliminar, usá Claude Code (<code>cli/README.md</code>).
            </div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <p className="text-gray-700">Entregas: {stats.total_submissions}</p>
              <p className="text-gray-700">
                Nota promedio: {stats.average_score !== null ? stats.average_score.toFixed(2) : '—'} / 10
              </p>
            </div>

            <div className="space-y-4">
              {teacherQuiz.questions.map((q, qIdx) => {
                const qStat = stats.question_stats.find((s) => s.question_id === q.id)
                return (
                  <div key={q.id} className="bg-white rounded-lg shadow p-6">
                    <p className="font-medium text-gray-800 mb-3">{qIdx + 1}. {q.text}</p>
                    <div className="space-y-2">
                      {q.options.map((o) => {
                        const oStat = qStat?.options.find((os) => os.option_id === o.id)
                        return (
                          <div
                            key={o.id}
                            className={`flex justify-between items-center px-3 py-2 rounded text-sm ${
                              o.fraction > 0 ? 'bg-green-50' : 'bg-red-50'
                            }`}
                          >
                            <span>{o.fraction > 0 ? '✓' : '✗'} {o.text}</span>
                            <span className="text-gray-500 whitespace-nowrap ml-4">
                              {o.fraction}% · elegida {oStat?.times_selected ?? 0}x
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {role === 'student' && alreadyDone && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <p className="font-bold text-green-800 text-lg">Ya completaste este cuestionario</p>
            <p className="text-gray-700 mt-2">Nota: {existingScore} / 10</p>
          </div>
        )}

        {role === 'student' && result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <p className="font-bold text-green-800 text-lg">¡Cuestionario enviado!</p>
            <p className="text-gray-700 mt-2">Nota final: {result.score} / 10</p>
            <div className="mt-4 space-y-1">
              {result.breakdown.map((b, i) => (
                <p key={b.question_id} className="text-sm text-gray-600">
                  Pregunta {i + 1}: {(b.score * 10).toFixed(2)} / 10
                </p>
              ))}
            </div>
          </div>
        )}

        {role === 'student' && !alreadyDone && !result && studentQuiz && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {studentQuiz.description && <p className="text-gray-600 mb-4">{studentQuiz.description}</p>}
            {studentQuiz.questions.map((q, qIdx) => (
              <div key={q.id} className="bg-white rounded-lg shadow p-6">
                <p className="font-medium text-gray-800 mb-3">{qIdx + 1}. {q.text}</p>
                <div className="space-y-2">
                  {q.options.map((o) => (
                    <label key={o.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(answers[q.id] || []).includes(o.id)}
                        onChange={() => toggleOption(q.id, o.id)}
                      />
                      {o.text}
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {error && <p className="text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium"
            >
              {submitting ? 'Enviando...' : 'Enviar Respuestas'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
