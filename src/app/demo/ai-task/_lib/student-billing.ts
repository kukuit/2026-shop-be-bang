import {
  calculateSessionFee,
  carryStudentBalanceToPeriod,
  studentBillingAnchor,
  vietnamBillingPeriod,
  type Student,
  type TeachingBillingPeriod,
  type TeachingSession,
  type TeachingStudentBillingRow,
} from './teaching-model'

export type StudentOpeningBalanceCalculation = {
  amount: number
  anchorPeriodStartDate: string
  anchorAmount: number
  historicalFeeAmount: number
  historicalPaidAmount: number
  historicalCompletedSessions: number
}

export type StudentBillingCalculation = Omit<TeachingStudentBillingRow, 'overdueUnconfirmedSessions' | 'overdueUnconfirmedItems'> & {
  openingBalanceCalculation: StudentOpeningBalanceCalculation
}

function studentBillingAnchorWithHistory(
  student: Student,
  cutoffDay: number,
  targetPeriod: TeachingBillingPeriod,
  feesByPeriod: Map<string, number>,
  now = new Date(),
) {
  const anchor = studentBillingAnchor(student, cutoffDay, now)
  if (anchor.amount !== 0) return anchor

  const earliestHistoricalPeriod = [
    ...Array.from(feesByPeriod.keys()),
    ...(student.billingPayments || []).map(payment => payment.periodStartDate),
  ].filter(periodStartDate => periodStartDate < targetPeriod.startDate && periodStartDate < anchor.periodStartDate).sort()[0]

  return earliestHistoricalPeriod ? { ...anchor, periodStartDate: earliestHistoricalPeriod } : anchor
}

export function calculateStudentOpeningBalanceAmount(
  student: Student,
  cutoffDay: number,
  targetPeriod: TeachingBillingPeriod,
  feesByPeriod: Map<string, number>,
  now = new Date(),
) {
  const configuredAnchor = studentBillingAnchor(student, cutoffDay, now)
  const anchor = studentBillingAnchorWithHistory(student, cutoffDay, targetPeriod, feesByPeriod, now)
  const anchoredStudent = anchor.periodStartDate === configuredAnchor.periodStartDate
    ? student
    : { ...student, openingBalance: anchor }
  return carryStudentBalanceToPeriod(anchoredStudent, cutoffDay, targetPeriod, feesByPeriod)
}

export function teachingSessionFee(session: TeachingSession) {
  return session.feeAmount ?? calculateSessionFee(session.pricingModeSnapshot, session.unitRateSnapshot ?? session.hourlyRateSnapshot ?? 0, session.actualDurationMinutes ?? 0)
}

export function calculateStudentOpeningBalance(
  student: Student,
  cutoffDay: number,
  targetPeriod: TeachingBillingPeriod,
  completedSessions: TeachingSession[],
  now = new Date(),
): StudentOpeningBalanceCalculation {
  const historicalSessions: { session: TeachingSession; periodStartDate: string; fee: number }[] = []
  const feesByPeriod = new Map<string, number>()

  for (const session of completedSessions) {
    if (session.studentId !== student.id || session.status !== 'COMPLETED' || session.lifecycleStatus === 'SUPERSEDED') continue
    const sessionPeriod = vietnamBillingPeriod(cutoffDay, new Date(session.startAt))
    if (sessionPeriod.startDate >= targetPeriod.startDate) continue
    const fee = teachingSessionFee(session)
    feesByPeriod.set(sessionPeriod.startDate, (feesByPeriod.get(sessionPeriod.startDate) || 0) + fee)
    historicalSessions.push({ session, periodStartDate: sessionPeriod.startDate, fee })
  }

  const anchor = studentBillingAnchorWithHistory(student, cutoffDay, targetPeriod, feesByPeriod, now)
  const sessionsFromAnchor = historicalSessions.filter(item => item.periodStartDate >= anchor.periodStartDate)
  const historicalFeeAmount = sessionsFromAnchor.reduce((sum, item) => sum + item.fee, 0)
  const historicalCompletedSessions = sessionsFromAnchor.length
  const historicalPaidAmount = (student.billingPayments || [])
    .filter(payment => payment.periodStartDate >= anchor.periodStartDate && payment.periodStartDate < targetPeriod.startDate)
    .reduce((sum, payment) => sum + payment.amount, 0)

  return {
    amount: calculateStudentOpeningBalanceAmount(student, cutoffDay, targetPeriod, feesByPeriod, now),
    anchorPeriodStartDate: anchor.periodStartDate,
    anchorAmount: anchor.amount,
    historicalFeeAmount,
    historicalPaidAmount,
    historicalCompletedSessions,
  }
}

export function calculateStudentBilling(
  student: Student,
  cutoffDay: number,
  period: TeachingBillingPeriod,
  sessions: TeachingSession[],
  now = new Date(),
): StudentBillingCalculation {
  const openingBalanceCalculation = calculateStudentOpeningBalance(student, cutoffDay, period, sessions, now)
  const currentSessions = sessions.filter(session => {
    if (session.studentId !== student.id || session.status !== 'COMPLETED' || session.lifecycleStatus === 'SUPERSEDED') return false
    return vietnamBillingPeriod(cutoffDay, new Date(session.startAt)).startDate === period.startDate
  })
  const actualDurationMinutes = currentSessions.reduce((sum, session) => sum + (session.actualDurationMinutes ?? 0), 0)
  const feeAmount = currentSessions.reduce((sum, session) => sum + teachingSessionFee(session), 0)
  const billingModes = Array.from(new Set(currentSessions.map(session => session.pricingModeSnapshot)))
  const paidAmount = (student.billingPayments || [])
    .filter(payment => payment.periodStartDate === period.startDate)
    .reduce((sum, payment) => sum + payment.amount, 0)
  const openingBalanceAmount = openingBalanceCalculation.amount
  const amountDue = openingBalanceAmount + feeAmount

  return {
    studentId: student.id,
    completedSessions: currentSessions.length,
    actualDurationMinutes,
    perSessionCompletedSessions: currentSessions.filter(session => session.pricingModeSnapshot === 'PER_SESSION').length,
    perHourDurationMinutes: currentSessions.filter(session => session.pricingModeSnapshot === 'PER_HOUR').reduce((sum, session) => sum + (session.actualDurationMinutes ?? 0), 0),
    billingModes,
    feeAmount,
    openingBalanceAmount,
    paidAmount,
    amountDue,
    remainingAmount: amountDue - paidAmount,
    openingBalanceCalculation,
  }
}
