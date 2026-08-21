'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { coursesAPI } from '@/lib/api'

interface Course {
  id: number
  name: string
  description?: string
  teacher_id?: number
  created_at?: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState<string | null>(null)
  const [newCourseName, setNewCourseName] = useState('')
  const [newCourseDesc, setNewCourseDesc] = useState('')

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userRole = localStorage.getItem('role')
    if (!token) {
      router.push('/login')
      return
    }
    setRole(userRole)
    loadCourses()
  }, [router])

  const loadCourses = async () => {
    try {
      const res = await coursesAPI.listCourses()
      setCourses(res.data)
    } catch (err) {
      console.error('Error loading courses:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await coursesAPI.createCourse(newCourseName, newCourseDesc)
      setNewCourseName('')
      setNewCourseDesc('')
      loadCourses()
    } catch (err) {
      console.error('Error creating course:', err)
    }
  }

  const handleLogout = () => {
    localStorage.clear()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-sm p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Platform Educativa</h1>
        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
        >
          Cerrar Sesión
        </button>
      </nav>

      <div className="max-w-6xl mx-auto p-8">
        {role === 'teacher' && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Crear Nuevo Curso</h2>
            <form onSubmit={handleCreateCourse} className="space-y-4">
              <input
                type="text"
                placeholder="Nombre del curso"
                value={newCourseName}
                onChange={(e) => setNewCourseName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                required
              />
              <textarea
                placeholder="Descripción (opcional)"
                value={newCourseDesc}
                onChange={(e) => setNewCourseDesc(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                rows={3}
              />
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium"
              >
                Crear Curso
              </button>
            </form>
          </div>
        )}

        <div>
          <h2 className="text-2xl font-bold mb-6 text-gray-800">
            {role === 'teacher' ? 'Mis Cursos' : 'Cursos Inscritos'}
          </h2>

          {loading ? (
            <div className="text-center text-gray-600">Cargando cursos...</div>
          ) : courses.length === 0 ? (
            <div className="text-center text-gray-600 bg-white p-8 rounded-lg">
              {role === 'teacher' ? 'No has creado cursos aún.' : 'No estás inscrito en ningún curso.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => (
                <div
                  key={course.id}
                  onClick={() => router.push(`/courses/${course.id}`)}
                  className="bg-white rounded-lg shadow p-6 hover:shadow-lg cursor-pointer transition"
                >
                  <h3 className="text-xl font-bold text-gray-800 mb-2">{course.name}</h3>
                  <p className="text-gray-600 mb-4">{course.description || 'Sin descripción'}</p>
                  <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-medium">
                    Ver Curso
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
