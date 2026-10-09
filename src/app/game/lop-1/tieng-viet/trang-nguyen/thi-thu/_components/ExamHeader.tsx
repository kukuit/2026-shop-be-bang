'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, UserRound } from 'lucide-react'
import AuthMenu from '@/components/auth/AuthMenu'
import { useAuth } from '@/components/auth/AuthProvider'
import styles from './exam.module.css'

export default function ExamHeader({ onBack, backHref = '/', backDisabled = false }: { onBack?: () => void; backHref?: string; backDisabled?: boolean }) {
  const { user, loading } = useAuth()
  const displayName = loading ? '' : user?.displayName.trim() || 'Đăng nhập'
  const initial = Array.from(user?.displayName.normalize('NFC') ?? '')[0]?.toLocaleUpperCase('vi-VN') ?? 'H'

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        {onBack ? (
          <button type="button" onClick={onBack} disabled={backDisabled} className={styles.backButton} aria-label="Quay lại">
            <ArrowLeft size={16} strokeWidth={2.2} />
            <span>Quay lại</span>
          </button>
        ) : (
          <Link href={backHref} className={styles.backButton}>
            <ArrowLeft size={16} strokeWidth={2.2} />
            <span>Quay lại</span>
          </Link>
        )}
        <div className={styles.eventTitle}>
          <span>Trạng Nguyên Tiếng Việt<br />Khối 1 (2026 - 2027)</span>
        </div>
        <AuthMenu
          game
          menuAlign="right"
          containerClassName={`${styles.accountMenuRoot} ${user ? '' : styles.accountMenuRootGuest}`}
          triggerClassName={styles.accountMenuButton}
          trigger={<>
            <span className={styles.avatar} aria-hidden="true">
              {user?.avatar ? (
                <Image src={user.avatar} alt="" width={36} height={36} unoptimized />
              ) : user ? (
                initial
              ) : (
                <UserRound size={19} strokeWidth={1.8} />
              )}
            </span>
            <span className={styles.userDetails}>
              <strong title={user?.displayName}>{displayName}</strong>
            </span>
          </>}
        />
      </div>
    </header>
  )
}
