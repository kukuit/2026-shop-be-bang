import {
  games,
  records as fallbackRecords,
  students as fallbackStudents,
  subjects,
} from './dashboard.mock'
import type { Lesson, Student, StudentOverview, StudentRecord, SubjectSummary } from './types'

export const createDashboardService = (
  records: StudentRecord[] = fallbackRecords,
  students: Student[] = fallbackStudents
) => ({
  getStudents: () => students,
  getGames: () => games,
  getSubjects: () => subjects,
  getLessons(studentId: string, grade: number, subjectId: string): Lesson[] {
    return (
      records
        .find((record) => record.studentId === studentId && record.grade === grade)
        ?.lessons.filter((lesson) => lesson.subjectId === subjectId) ?? []
    )
  },
  getLessonPerformance(studentId: string, grade: number, subjectId: string, lessonId: string) {
    return this.getLessons(studentId, grade, subjectId).find((lesson) => lesson.id === lessonId)
  },
  getObjectivePerformance(studentId: string, objectiveId: string) {
    return records
      .find((record) => record.studentId === studentId)
      ?.lessons.flatMap((lesson) => lesson.objectives)
      .find((objective) => objective.id === objectiveId)
  },
  getSubjectProgress(studentId: string, grade: number, subjectId: string): SubjectSummary {
    const lessons = this.getLessons(studentId, grade, subjectId)
    const objectives = lessons.flatMap((lesson) => lesson.objectives)
    const subject = subjects.find((item) => item.id === subjectId) ?? {
      id: subjectId,
      name: subjectId,
    }
    const active = objectives.filter((item) => item.status !== 'no_data')
    return {
      subject,
      progress: active.length
        ? Math.round(active.reduce((sum, item) => sum + item.score, 0) / active.length)
        : 0,
      total: objectives.length,
      mastered: objectives.filter((item) => item.status === 'mastered').length,
      practicing: objectives.filter(
        (item) => item.status === 'practicing' || item.status === 'needs_practice'
      ).length,
      noData: objectives.filter((item) => item.status === 'no_data').length,
    }
  },
  getStudentOverview(studentId: string, grade: number): StudentOverview {
    const record = records.find((item) => item.studentId === studentId && item.grade === grade)
    const lessons = record?.lessons ?? []
    const all = lessons.flatMap((lesson) =>
      lesson.objectives.map((objective) => ({
        ...objective,
        lesson,
        subject: subjects.find((subject) => subject.id === lesson.subjectId) ?? subjects[0],
      }))
    )
    const active = all.filter((item) => item.status !== 'no_data')
    const masteredObjectives = all.filter((item) => item.status === 'mastered').length
    return {
      progress: active.length
        ? Math.round(active.reduce((sum, item) => sum + item.score, 0) / active.length)
        : 0,
      totalObjectives: all.length,
      masteredObjectives,
      subjects: subjects.map((subject) => this.getSubjectProgress(studentId, grade, subject.id)),
      attention: all
        .filter((item) => item.status === 'needs_practice' || item.status === 'practicing')
        .sort((a, b) => a.score - b.score)
        .slice(0, 3),
      strong: all
        .filter((item) => item.status === 'mastered')
        .sort((a, b) => b.score - a.score)
        .slice(0, 3),
      recentActivities: record?.recentActivities ?? [],
    }
  },
})

export const dashboardService = createDashboardService()
