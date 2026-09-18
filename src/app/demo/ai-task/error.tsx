'use client'
export default function ErrorPage({ reset }: { reset(): void }) { return <div role="alert" className="demo-panel demo-padded"><p>Không tải được AI Task. Hãy thử lại.</p><button onClick={reset}>Thử lại</button></div> }
