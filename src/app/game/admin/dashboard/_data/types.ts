export type LearningStatus = 'mastered' | 'practicing' | 'needs_practice' | 'no_data'

export interface Student { id: string; name: string; avatar: string; currentGrade: number }
export interface Subject { id: string; name: string }
export interface Game { id: string; name: string; path: string; skillKeys: string[] }
export interface SkillPerformance { attempts: number; correct: number; accuracy: number }
export interface GameEvidence { gameId: string; attempts: number; correct: number; total: number; accuracy: number; bestScore: number; latestScore: number }
export interface Objective { id: string; title: string; score: number; status: LearningStatus; trend: string; skillPerformance: Record<string, SkillPerformance>; games: GameEvidence[] }
export interface Lesson { id: string; order: number; grade: number; subjectId: string; title: string; progress: number; objectives: Objective[] }
export interface RecentActivity { id: string; gameId: string; subjectId: string; lessonId: string; score: number; correct: number; total: number; when: string }
export interface StudentRecord { studentId: string; grade: number; lessons: Lesson[]; recentActivities: RecentActivity[] }
export interface SubjectSummary { subject: Subject; progress: number; total: number; mastered: number; practicing: number; noData: number }
export interface StudentOverview { progress: number; totalObjectives: number; masteredObjectives: number; subjects: SubjectSummary[]; attention: Array<Objective & { lesson: Lesson; subject: Subject }>; strong: Array<Objective & { lesson: Lesson; subject: Subject }>; recentActivities: RecentActivity[] }
