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

  const [materialFile, setMaterialFile] = useState<File | null>(null)
  const [materialName, setMaterialName] = useState('')
  const [materialDesc, setMaterialDesc] = useState('')

  const [assignmentTitle, setAssignmentTitle] = useState('')
  const [assignmentDesc, setAssignmentDesc] = useState('')
  const [assignmentDeadline, setAssignmentDeadline] = useState('')

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

      if (localStorage.getItem('role') === 'teacher') {
        const studentsRes = await coursesAPI.listStudents(courseId)
        setStudents(studentsRes.data)
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'No se pudo cargar el curso')
    } finally {
      setLoading(false)
    }
  }

  const handleUploadMaterial = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!materialFile) return
    try {
      await materialsAPI.upload(courseId, materialFile, materialName || materialFile.name, materialDesc)
      setMaterialFile(null)
      setMaterialName('')
      setMaterialDesc('')
      const res = await materialsAPI.list(courseId)
      setMaterials(res.data)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al subir material')
    }
  }

  const handleDeleteMaterial = async (materialId: number) => {
    if (!confirm('¿Eliminar este material?')) return
    await materialsAPI.delete(courseId, materialId)
    const res = await materialsAPI.list(courseId)
    setMaterials(res.data)
  }

  const handleDownloadMaterial = async (material: Material) => {
    await downloadFile(materialsAPI.downloadUrl(courseId, material.id), material.name)
  }

  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await assignmentsAPI.createAssignment(
        courseId, assignmentTitle, assignmentDesc,
        new Date(assignmentDeadline).toISOString()
      )
      setAssignmentTitle('')
      setAssignmentDesc('')
      setAssignmentDeadline('')
      const res = await assignmentsAPI.listAssignments(courseId)
      setAssignments(res.data)
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Error al crear actividad')
    }
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
            {role === 'teacher' && (
              <form onSubmit={handleUploadMaterial} className="bg-white rounded-lg shadow p-6 mb-6 space-y-3">
                <h3 className="font-bold text-gray-800">Subir Material</h3>
                <input
                  type="file"
                  onChange={(e) => setMaterialFile(e.target.files?.[0] || null)}
                  className="block w-full text-sm"
                  required
                />
                <input
                  type="text"
                  placeholder="Nombre"
                  value={materialName}
                  onChange={(e) => setMaterialName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <input
                  type="text"
                  placeholder="Descripción (opcional)"
                  value={materialDesc}
                  onChange={(e) => setMaterialDesc(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                />
                <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium">
                  Subir
                </button>
              </form>
            )}

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
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownloadMaterial(m)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded text-sm"
                      >
                        Descargar
                      </button>
                      {role === 'teacher' && (
                        <button
                          onClick={() => handleDeleteMaterial(m.id)}
                          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded text-sm"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'actividades' && (
          <div>
            {role === 'teacher' && (
              <form onSubmit={handleCreateAssignment} className="bg-white rounded-lg shadow p-6 mb-6 space-y-3">
                <h3 className="font-bold text-gray-800">Crear Actividad</h3>
                <input
                  type="text"
                  placeholder="Título"
                  value={assignmentTitle}
                  onChange={(e) => setAssignmentTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  required
                />
                <textarea
                  placeholder="Descripción / consigna"
                  value={assignmentDesc}
                  onChange={(e) => setAssignmentDesc(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows={3}
                />
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Fecha límite</label>
                  <input
                    type="datetime-local"
                    value={assignmentDeadline}
                    onChange={(e) => setAssignmentDeadline(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                <button type="submit" className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium">
                  Crear Actividad
                </button>
              </form>
            )}

            {assignments.length === 0 ? (
              <p className="text-gray-500 bg-white p-6 rounded-lg">No hay actividades creadas.</p>
            ) : (
              <div className="space-y-3">
                {assignments.map((a) => (
                  <div
                    key={a.id}
                    onClick={() => router.push(`/courses/${courseId}/assignments/${a.id}`)}
                    className="bg-white rounded-lg shadow p-4 hover:shadow-lg cursor-pointer transition"
                  >
                    <p className="font-medium text-gray-800">{a.title}</p>
                    <p className="text-sm text-gray-500">
                      Fecha límite: {new Date(a.deadline).toLocaleString('es-AR')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'cuestionarios' && (
          <div>
            {role === 'teacher' && (
              <button
                onClick={() => router.push(`/courses/${courseId}/quizzes/new`)}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium mb-6"
              >
                Crear Cuestionario
              </button>
            )}

            {quizzes.length === 0 ? (
              <p className="text-gray-500 bg-white p-6 rounded-lg">No hay cuestionarios creados.</p>
            ) : (
              <div className="space-y-3">
                {quizzes.map((q) => (
                  <div
                    key={q.id}
                    onClick={() => router.push(`/courses/${courseId}/quizzes/${q.id}`)}
                    className="bg-white rounded-lg shadow p-4 hover:shadow-lg cursor-pointer transition"
                  >
                    <p className="font-medium text-gray-800">{q.title}</p>
                    {q.description && <p className="text-sm text-gray-500">{q.description}</p>}
                  </div>
                ))}
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
