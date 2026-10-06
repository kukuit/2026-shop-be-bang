'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, UserRound } from 'lucide-react'
import { useAuth } from '@/components/auth/AuthProvider'
import styles from './exam.module.css'

export default function ExamHeader() {
  const { user } = useAuth()
  const displayName = user?.displayName.trim() || 'Huỳnh Lê Tiểu Băng'
  const initial = Array.from(displayName.normalize('NFC'))[0]?.toLocaleUpperCase('vi-VN') ?? 'H'

  return <header className={styles.header}>
    <div className={styles.headerInner}>
      <Link href="/game/lop-1/tieng-viet" className={styles.backButton}>
        <ArrowLeft size={16} strokeWidth={2.2} />
        <span>Quay lại</span>
      </Link>
      <div className={styles.eventTitle}>
        <span>Sân chơi Trạng Nguyên Tiếng Việt khối 1 năm học 2026 - 2027</span>
        <strong>Vòng 1</strong>
      </div>
      <div className={styles.userInfo}>
        <span className={styles.avatar} aria-hidden="true">
          {user?.avatar
            ? <Image src={user.avatar} alt="" width={36} height={36} unoptimized />
            : user
              ? initial
              : <UserRound size={19} strokeWidth={1.8} />}
        </span>
        <span className={styles.userDetails}>
          <strong title={displayName}>{displayName}</strong>
          <small>SBD:964337833</small>
        </span>
      </div>
    </div>
  </header>
}
