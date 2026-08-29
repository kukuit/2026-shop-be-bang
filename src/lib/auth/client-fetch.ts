'use client'
import { refreshAccessToken } from './client-refresh'

export async function fetchWithAuthRetry(input: RequestInfo | URL, init?: RequestInit) {
  let response = await fetch(input, init)
  if (response.status !== 401) return response
  const refreshed = await refreshAccessToken()
  if (!refreshed.ok) return response
  response = await fetch(input, init)
  return response
}
