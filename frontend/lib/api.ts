import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export const authAPI = {
  register: (email: string, password: string, name: string, role: 'teacher' | 'student') =>
    api.post('/auth/register', { email, password, name, role }),

  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
}

export const coursesAPI = {
  listCourses: () => api.get('/courses/'),
  getCourse: (courseId: number) => api.get(`/courses/${courseId}`),
  createCourse: (name: string, description?: string) =>
    api.post('/courses/', { name, description }),
  updateCourse: (courseId: number, name: string, description?: string) =>
    api.put(`/courses/${courseId}`, { name, description }),
  deleteCourse: (courseId: number) => api.delete(`/courses/${courseId}`),
  enrollCourse: (courseId: number) => api.post(`/courses/${courseId}/enroll`),
  listStudents: (courseId: number) => api.get(`/courses/${courseId}/students`),
}

export const assignmentsAPI = {
  listAssignments: (courseId: number) =>
    api.get(`/courses/${courseId}/assignments`),
  createAssignment: (courseId: number, title: string, description?: string, deadline?: string) =>
    api.post(`/courses/${courseId}/assignments`, { title, description, deadline }),
  submitAssignment: (assignmentId: number, textContent?: string, file?: File) => {
    const formData = new FormData()
    if (textContent) formData.append('text_content', textContent)
    if (file) formData.append('file', file)
    return api.post(`/assignments/${assignmentId}/submit`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  getSubmission: (assignmentId: number) =>
    api.get(`/assignments/${assignmentId}/submission`),
}

export default api
