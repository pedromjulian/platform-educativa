'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  coursesAPI, materialsAPI, assignmentsAPI, quizzesAPI, downloadFile,
} from '@/lib/api'

interface Course {
  id: number
  name: string
  description?: string
  teacher_id: number
}

interface Material {
  id: number
  name: string
  description?: string
  uploaded_at: string
}

interface Assignment {
  id: number
  title: string
  description?: string
  deadline: string
}

interface Quiz {
  id: number
  title: string
  description?: string
  deadline?: string
}

interface Student {
  id: number
  student_id: number
  student: { id: number; name: string; email: string }
}

interface AssignmentSummary {
  submitted: number
  graded: number
}

interface QuizSummary {
  totalSubmissions: number
  averageScore: number | null
}

type Tab = 'material' | 'actividades' | 'cuestionarios' | 'estudiantes'

export default function CourseDetailPage() {
  const router = useRouter()
  const params = useParams()
  const courseId = Number(params.id)

  const [role, setRole] = useState<string | null>(null)
  const [course, setCourse] = useState<Course | null>(null)
  const [tab, setTab] = useState<Tab>('material')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [materials, setMaterials] = useState<Material[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [quizzes, setQuizzes] = useState<Quiz[]>([])
  const [students, setStudents] = useState<Student[]>([])

  const [assignmentSummaries, setAssignmentSummaries] = useState<Record<number, AssignmentSummary>>({})
  const [quizSummaries, setQuizSummaries] = useState<Record<number, QuizSummary>>({})

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      router.push('/login')
      return
    }
    setRole(localStorage.getItem('role'))
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  const loadAll = async () => {
    setLoading(true)
    setError('')
    try {
      const courseRes = await coursesAPI.getCourse(courseId)
      setCourse(courseRes.data)

      const [materialsRes, assignmentsRes, quizzesRes] = await Promise.all([
        materialsAPI.list(courseId),
        assignmentsAPI.listAssignments(courseId),
        quizzesAPI.list(courseId),
      ])
      setMaterials(materialsRes.data)
      setAssignments(assignmentsRes.data)
      setQuizzes(quizzesRes.data)

      const isTeacher = localStorage.getItem('role') === 'teacher'
      if (isTeacher) {
        const studentsRes = await coursesAPI.listStudents(courseId)
        setStudents(studentsRes.data)

        const assignmentSummaryEntries = await Promise.all(
          (assignmentsRes.data as Assignment[]).map(async (a) => {
            const subsRes = await assignmentsAPI.listSubmissions(courseId, a.id)
            const subs = subsRes.data as { status: string }[]
            return [a.id, { submitted: subs.length, graded: subs.filter((s) => s.status === 'graded').length }] as const
          })
        )
        setAssignmentSummaries(Object.fromEntries(assignmentSummaryEntries))

        const quizSummaryEntries = await Promise.all(
          (quizzesRes.data as Quiz[]).map(async (q) => {
            const statsRes = await quizzesAPI.exportStats(courseId, q.id)
            return [q.id, { totalSubmissions: statsRes.data.total_submissions, averageScore: statsRes.data.average_score }] as const
          })
        )
        setQuizSummaries(Object.fromEntries(quizSummaryEntries))
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'No se pudo cargar el curso')
    } finally {
      setLoading(false)
    }
  }

  const handleDownloadMaterial = async (material: Material) => {
    await downloadFile(materialsAPI.downloadUrl(courseId, material.id), material.name)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-gray-600">Cargando...</div>
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-red-600">{error}</p>
        <button onClick={() => router.push('/dashboard')} className="text-blue-500 underline">
          Volver al dashboard
        </button>
      </div>
    )
  }

  const tabs: { key: Tab; label: string }[] = [
    { key: 'material', label: 'Material' },
    { key: 'actividades', label: 'Actividades' },
    { key: 'cuestionarios', label: 'Cuestionarios' },
    ...(role === 'teacher' ? [{ key: 'estudiantes' as Tab, label: 'Estudiantes' }] : []),
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm p-4 flex justify-between items-center">
        <div>
          <button onClick={() => router.push('/dashboard')} className="text-sm text-blue-500 hover:underline mb-1 block">
            ← Volver al dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-800">{course?.name}</h1>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-8">
        {course?.description && <p className="text-gray-600 mb-6">{course.description}</p>}

        {role === 'teacher' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-sm text-blue-800">
            Panel de solo lectura. Crear/subir/calificar se hace desde Claude Code (<code>cli/README.md</code>).
          </div>
        )}

        <div className="flex gap-2 mb-6 border-b border-gray-300">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 font-medium ${tab === t.key ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'material' && (
          <div>
            {materials.length === 0 ? (
              <p className="text-gray-500 bg-white p-6 rounded-lg">No hay material cargado.</p>
            ) : (
              <div className="space-y-3">
                {materials.map((m) => (
                  <div key={m.id} className="bg-white rounded-lg shadow p-4 flex justify-between items-center">
                    <div>
                      <p className="font-medium text-gray-800">{m.name}</p>
                      {m.description && <p className="text-sm text-gray-500">{m.description}</p>}
                    </div>
                    <button
                      onClick={() => handleDownloadMaterial(m)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded text-sm"
                    >
                      Descargar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'actividades' && (
          <div>
            {assignments.length === 0 ? (
              <p className="text-gray-500 bg-white p-6 rounded-lg">No hay actividades creadas.</p>
            ) : (
              <div className="space-y-3">
                {assignments.map((a) => {
                  const summary = assignmentSummaries[a.id]
                  return (
                    <div
                      key={a.id}
                      onClick={() => router.push(`/courses/${courseId}/assignments/${a.id}`)}
                      className="bg-white rounded-lg shadow p-4 hover:shadow-lg cursor-pointer transition flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium text-gray-800">{a.title}</p>
                        <p className="text-sm text-gray-500">
                          Fecha límite: {new Date(a.deadline).toLocaleString('es-AR')}
                        </p>
                      </div>
                      {role === 'teacher' && summary && (
                        <div className="text-right text-sm text-gray-600">
                          <p>{summary.submitted} / {students.length} entregaron</p>
                          <p>{summary.graded} / {summary.submitted} calificadas</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'cuestionarios' && (
          <div>
            {quizzes.length === 0 ? (
              <p className="text-gray-500 bg-white p-6 rounded-lg">No hay cuestionarios creados.</p>
            ) : (
              <div className="space-y-3">
                {quizzes.map((q) => {
                  const summary = quizSummaries[q.id]
                  return (
                    <div
                      key={q.id}
                      onClick={() => router.push(`/courses/${courseId}/quizzes/${q.id}`)}
                      className="bg-white rounded-lg shadow p-4 hover:shadow-lg cursor-pointer transition flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium text-gray-800">{q.title}</p>
                        {q.description && <p className="text-sm text-gray-500">{q.description}</p>}
                      </div>
                      {role === 'teacher' && summary && (
                        <div className="text-right text-sm text-gray-600">
                          <p>{summary.totalSubmissions} / {students.length} entregaron</p>
                          <p>Promedio: {summary.averageScore !== null ? summary.averageScore.toFixed(2) : '—'} / 10</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {tab === 'estudiantes' && role === 'teacher' && (
          <div>
            {students.length === 0 ? (
              <p className="text-gray-500 bg-white p-6 rounded-lg">No hay estudiantes inscriptos.</p>
            ) : (
              <div className="bg-white rounded-lg shadow divide-y">
                {students.map((s) => (
                  <div key={s.id} className="p-4">
                    <p className="font-medium text-gray-800">{s.student.name}</p>
                    <p className="text-sm text-gray-500">{s.student.email}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
