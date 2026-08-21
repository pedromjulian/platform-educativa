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

export const materialsAPI = {
  list: (courseId: number) => api.get(`/courses/${courseId}/materials`),
  upload: (courseId: number, file: File, name: string, description?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', name)
    if (description) formData.append('description', description)
    return api.post(`/courses/${courseId}/materials`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  delete: (courseId: number, materialId: number) =>
    api.delete(`/courses/${courseId}/materials/${materialId}`),
  downloadUrl: (courseId: number, materialId: number) =>
    `/courses/${courseId}/materials/${materialId}/download`,
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
  listSubmissions: (courseId: number, assignmentId: number) =>
    api.get(`/courses/${courseId}/assignments/${assignmentId}/submissions`),
  downloadSubmissionUrl: (courseId: number, submissionId: number) =>
    `/courses/${courseId}/submissions/${submissionId}/download`,
}

export const gradingAPI = {
  gradeSubmission: (courseId: number, submissionId: number, grade: number, feedback?: string) =>
    api.patch(`/courses/${courseId}/submissions/${submissionId}/grade`, { grade, feedback }),
}

export interface QuizOptionInput {
  text: string
  fraction: number
}

export interface QuizQuestionInput {
  text: string
  options: QuizOptionInput[]
}

export interface QuizCreateInput {
  title: string
  description?: string
  deadline?: string
  questions: QuizQuestionInput[]
}

export interface QuizAnswerInput {
  question_id: number
  selected_option_ids: number[]
}

export const quizzesAPI = {
  list: (courseId: number) => api.get(`/courses/${courseId}/quizzes`),
  create: (courseId: number, payload: QuizCreateInput) =>
    api.post(`/courses/${courseId}/quizzes`, payload),
  getTeacherView: (courseId: number, quizId: number) =>
    api.get(`/courses/${courseId}/quizzes/${quizId}`),
  delete: (courseId: number, quizId: number) =>
    api.delete(`/courses/${courseId}/quizzes/${quizId}`),
  take: (quizId: number) => api.get(`/quizzes/${quizId}/take`),
  submit: (quizId: number, answers: QuizAnswerInput[]) =>
    api.post(`/quizzes/${quizId}/submit`, { answers }),
  getMySubmission: (quizId: number) => api.get(`/quizzes/${quizId}/submission`),
  exportStats: (courseId: number, quizId: number) =>
    api.get(`/courses/${courseId}/quizzes/${quizId}/submissions/export`),
}

export const downloadFile = async (url: string, filename: string) => {
  const res = await api.get(url, { responseType: 'blob' })
  const blobUrl = window.URL.createObjectURL(new Blob([res.data]))
  const link = document.createElement('a')
  link.href = blobUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(blobUrl)
}

export default api
