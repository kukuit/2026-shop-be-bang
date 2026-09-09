import styles from './LessonMap.module.css'
export default function ClassProgress({ completed, total, label, unitLabel }: { completed: number; total: number; label: string; unitLabel: string }) {
 const percent = total > 0 ? Math.round(completed / total * 100) : 0
 return <div className={styles.progress}><p>{label}</p><div><strong>{completed} / {total} {unitLabel}</strong><span>{percent}%</span></div><progress value={completed} max={Math.max(1, total)} aria-label={label} /></div>
}
