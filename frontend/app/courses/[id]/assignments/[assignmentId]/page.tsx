'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { assignmentsAPI, downloadFile } from '@/lib/api'

interface Assignment {
  id: number
  title: string
  description?: string
  deadline: string
}

interface Submission {
  id: number
  text_content?: string
  file_path?: string
  submitted_at: string
  status: 'pending' | 'graded'
  is_late: number
  grade?: number
  feedback?: string
}

interface SubmissionDetail extends Submission {
  student: { id: number; name: string; email: string }
}

export default function AssignmentDetailPage() {
  const router = useRouter()
  const params = useParams()
  const courseId = Number(params.id)
  const assignmentId = Number(params.assignmentId)

  const [role, setRole] = useState<string | null>(null)
  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [loading, setLoading] = useState(true)

  const [mySubmission, setMySubmission] = useState<Submission | null>(null)
  const [textContent, setTextContent] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const [submissions, setSubmissions] = useState<SubmissionDetail[]>([])

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
  }, [assignmentId])

  const loadData = async (r: string | null) => {
    setLoading(true)
    try {
      const res = await assignmentsAPI.listAssignments(courseId)
      const found = res.data.find((a: Assignment) => a.id === assignmentId)
      setAssignment(found || null)

      if (r === 'student') {
        try {
          const subRes = await assignmentsAPI.getSubmission(assignmentId)
          setMySubmission(subRes.data)
        } catch {
          setMySubmission(null)
        }
      } else {
        const subsRes = await assignmentsAPI.listSubmissions(courseId, assignmentId)
        setSubmissions(subsRes.data)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')
    setSubmitting(true)
    try {
      const res = await assignmentsAPI.submitAssignment(assignmentId, textContent, file || undefined)
      setMySubmission(res.data)
      setTextContent('')
      setFile(null)
    } catch (err: any) {
      setSubmitError(err.response?.data?.detail || 'Error al entregar')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDownloadMySubmission = async () => {
    if (!mySubmission?.file_path) return
    await downloadFile(assignmentsAPI.downloadSubmissionUrl(courseId, mySubmission.id), 'entrega')
  }

  const handleDownloadStudentFile = async (sub: SubmissionDetail) => {
    if (!sub.file_path) return
    await downloadFile(assignmentsAPI.downloadSubmissionUrl(courseId, sub.id), `entrega_${sub.student.name}`)
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
        <h1 className="text-2xl font-bold text-gray-800">{assignment?.title}</h1>
      </nav>

      <div className="max-w-4xl mx-auto p-8">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          {assignment?.description && <p className="text-gray-700 whitespace-pre-wrap mb-3">{assignment.description}</p>}
          <p className="text-sm text-gray-500">
            Fecha límite: {assignment && new Date(assignment.deadline).toLocaleString('es-AR')}
          </p>
        </div>

        {role === 'student' && (
          <div className="bg-white rounded-lg shadow p-6">
            {mySubmission ? (
              <div>
                <h3 className="font-bold text-gray-800 mb-3">Tu Entrega</h3>
                {mySubmission.text_content && (
                  <p className="text-gray-700 whitespace-pre-wrap mb-3 bg-gray-50 p-3 rounded">{mySubmission.text_content}</p>
                )}
                {mySubmission.file_path && (
                  <button onClick={handleDownloadMySubmission} className="text-blue-500 underline text-sm mb-3 block">
                    Descargar archivo entregado
                  </button>
                )}
                <p className="text-sm text-gray-500">
                  Entregado: {new Date(mySubmission.submitted_at).toLocaleString('es-AR')}
                  {mySubmission.is_late === 1 && <span className="text-red-500"> (tarde)</span>}
                </p>
                {mySubmission.status === 'graded' ? (
                  <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="font-bold text-green-800">Nota: {mySubmission.grade} / 10</p>
                    {mySubmission.feedback && <p className="text-gray-700 mt-2">{mySubmission.feedback}</p>}
                  </div>
                ) : (
                  <p className="mt-4 text-yellow-600">Pendiente de calificación</p>
                )}
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <h3 className="font-bold text-gray-800">Entregar</h3>
                <textarea
                  placeholder="Texto de tu entrega (opcional si subís un archivo)"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows={6}
                />
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm"
                />
                {submitError && <p className="text-red-600 text-sm">{submitError}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium"
                >
                  {submitting ? 'Enviando...' : 'Entregar'}
                </button>
              </form>
            )}
          </div>
        )}

        {role === 'teacher' && (
          <div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-sm text-blue-800">
              Panel de solo lectura. Para calificar, usá Claude Code (<code>cli/README.md</code>).
            </div>
            <h3 className="font-bold text-gray-800 mb-4">Entregas ({submissions.length})</h3>
            {submissions.length === 0 ? (
              <p className="text-gray-500 bg-white p-6 rounded-lg">No hay entregas todavía.</p>
            ) : (
              <div className="space-y-4">
                {submissions.map((sub) => (
                  <div key={sub.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium text-gray-800">{sub.student.name}</p>
                        <p className="text-sm text-gray-500">{sub.student.email}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${sub.status === 'graded' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {sub.status === 'graded' ? 'Calificado' : 'Pendiente'}
                      </span>
                    </div>

                    {sub.text_content && (
                      <p className="text-gray-700 whitespace-pre-wrap bg-gray-50 p-3 rounded my-2 text-sm">{sub.text_content}</p>
                    )}
                    {sub.file_path && (
                      <button onClick={() => handleDownloadStudentFile(sub)} className="text-blue-500 underline text-sm block mb-2">
                        Descargar archivo entregado
                      </button>
                    )}
                    <p className="text-xs text-gray-500 mb-3">
                      Entregado: {new Date(sub.submitted_at).toLocaleString('es-AR')}
                      {sub.is_late === 1 && <span className="text-red-500"> (tarde)</span>}
                    </p>

                    {sub.status === 'graded' ? (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="font-bold text-green-800">Nota: {sub.grade} / 10</p>
                        {sub.feedback && <p className="text-gray-700 text-sm mt-1">{sub.feedback}</p>}
                      </div>
                    ) : (
                      <p className="text-yellow-600 text-sm">Pendiente de calificación</p>
                    )}
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
