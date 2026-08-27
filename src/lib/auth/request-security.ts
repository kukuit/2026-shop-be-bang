import { NextResponse } from 'next/server'

export function rejectCrossSiteMutation(request: Request) {
  if (request.headers.get('sec-fetch-site') === 'cross-site')
    return NextResponse.json({ message: 'Yêu cầu không hợp lệ.' }, { status: 403 })

  const origin = request.headers.get('origin')
  if (origin && origin !== new URL(request.url).origin)
    return NextResponse.json({ message: 'Yêu cầu không hợp lệ.' }, { status: 403 })

  return null
}
