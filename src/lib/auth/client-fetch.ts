'use client'

export async function fetchWithAuthRetry(input: RequestInfo | URL, init?: RequestInit) {
  let response = await fetch(input, init)
  if (response.status !== 401) return response
  const refreshed = await fetch('/api/auth/refresh', { method: 'POST' })
  if (!refreshed.ok) return response
  response = await fetch(input, init)
  return response
}
