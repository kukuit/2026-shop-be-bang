'use client'

import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/components/auth/AuthProvider'
import { progressKeys } from '@/lib/game-progress/queries'
import { isSubjectId } from '@/lib/game-progress/config'

export default function ProgressCacheSync() {
  const client = useQueryClient()
  const { user } = useAuth()
  const previousUser = useRef(user?.id)
  useEffect(() => {
    if (previousUser.current && previousUser.current !== user?.id) {
      const owner = previousUser.current
      client.removeQueries({ predicate: query => query.queryKey[0] === 'game' && query.queryKey[1] === 'me' && query.queryKey[3] === owner })
    }
    previousUser.current = user?.id
  }, [user?.id, client])
  useEffect(() => {
    const saved = (event: Event) => {
      const detail = (event as CustomEvent).detail
      if (!user || detail?.userId !== user.id || !isSubjectId(detail.subjectId)) return
      void client.invalidateQueries({ queryKey: progressKeys.subject(user.id, detail.grade, detail.subjectId), exact: true })
      void client.invalidateQueries({ queryKey: progressKeys.goals(user.id, detail.lessonId), exact: true })
      // Session rows are immutable. Drop the list cache so the next visit starts with one fresh page.
      client.removeQueries({ queryKey: progressKeys.sessions(user.id), exact: true, type: 'inactive' })
    }
    window.addEventListener('game-progress:saved', saved)
    return () => window.removeEventListener('game-progress:saved', saved)
  }, [client, user])
  return null
}
