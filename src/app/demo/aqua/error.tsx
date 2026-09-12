'use client'
export default function ErrorPage({ reset }: { reset: () => void }) { return <div className="demo-empty"><h2>Không thể tải màn hình này</h2><button onClick={reset}>Thử lại</button></div> }
