'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, BookOpen, Check, Image as ImageIcon, Volume2 } from 'lucide-react'
import DragDropGame from '@/components/games/drag-drop/DragDropGame'
import { getPlayableVocabularyWords } from '@/lib/vocabulary/filters'
import { createVocabularyDragDropConfig } from '@/lib/vocabulary/drag-drop-adapter'
import { getWeakVocabularyWordIds, readVocabularyProgress, recordVocabularyAnswer, writeVocabularyProgress } from '@/lib/vocabulary/progress'
import { getReviewedVocabularyWords, loadVocabularyWords } from '@/lib/vocabulary/repository'
import { VOCABULARY_TIER_LIMITS, type VocabularyGameMode, type VocabularyProgress, type VocabularySelectionMode, type VocabularyTier, type VocabularyWord } from '@/lib/vocabulary/types'
import frequencyManifest from '@/data/vocabulary/frequency-manifest.json'
import styles from './VocabularyDragDropClient.module.css'

const reviewedWords = getReviewedVocabularyWords()
const tierCards = VOCABULARY_TIER_LIMITS.map((maxRank, index) => ({
  tier: (index + 1) as VocabularyTier,
  minRank: index === 0 ? 1 : VOCABULARY_TIER_LIMITS[index - 1] + 1,
  maxRank,
}))
const modes: Array<{ id: VocabularyGameMode; title: string; description: string; icon: typeof BookOpen }> = [
  { id: 'word-image', title: 'Từ và hình', description: 'Kéo từ tiếng Anh vào hình phù hợp.', icon: ImageIcon },
  { id: 'word-meaning', title: 'Từ và nghĩa', description: 'Ghép từ tiếng Anh với nghĩa tiếng Việt.', icon: BookOpen },
  { id: 'audio-word', title: 'Nghe và chọn từ', description: 'Nghe phát âm rồi kéo đúng từ vào ô loa.', icon: Volume2 },
]

type SessionWordResult = { correct: boolean; wrongAttempts: number }
type SessionResults = Record<string, SessionWordResult>

function getSourceWordCount(tier: VocabularyTier, selectionMode: VocabularySelectionMode) {
  const bands = frequencyManifest.frequencyBands as Record<string, { candidateCount: number }>
  const tiers = selectionMode === 'level-only' ? [tier] : tierCards.filter((item) => item.tier <= tier).map((item) => item.tier)
  return tiers.reduce((sum, currentTier) => sum + (bands[String(currentTier)]?.candidateCount ?? 0), 0)
}

function getWrongQuestionSummary(results: SessionResults, questionCount: number) {
  const values = Object.entries(results)
  const correctPairs = values.filter(([, result]) => result.correct).length
  const missedWordIds = values.filter(([, result]) => result.wrongAttempts > 0).map(([wordId]) => wordId)
  const wrongAttempts = values.reduce((sum, [, result]) => sum + result.wrongAttempts, 0)
  return {
    correctPairs,
    missedPairs: missedWordIds.length,
    wrongAttempts,
    answeredPairs: values.length,
    accuracy: values.length ? Math.round(correctPairs / values.length * 100) : 0,
    missedWordIds,
  }
}

function VocabularySessionSummary({ results, totalQuestions, onSpeak, speechAvailable }: {
  results: SessionResults
  totalQuestions: number
  onSpeak: (text: string) => void
  speechAvailable: boolean
}) {
  const summary = getWrongQuestionSummary(results, totalQuestions)
  const wordsById = new Map(reviewedWords.map((word) => [word.id, word]))
  const missedWords = summary.missedWordIds.map((id) => wordsById.get(id)).filter((word): word is VocabularyWord => Boolean(word))
  return <section className={styles.resultSummary} aria-label="Kết quả từ vựng">
    <div className={styles.resultStats}>
      <span><strong>{summary.correctPairs}/{totalQuestions}</strong><small>Cặp đúng</small></span>
      <span><strong>{summary.missedPairs}</strong><small>Cặp từng kéo sai</small></span>
      <span><strong>{summary.accuracy}%</strong><small>Chính xác</small></span>
    </div>
    <p className={styles.attemptSummary}>Đã làm {summary.answeredPairs}/{totalQuestions} cặp · {summary.wrongAttempts} lượt kéo sai</p>
    {missedWords.length > 0 ? <div className={styles.missedList}>
      <h3>Từ cần ôn</h3>
      <ul>
        {missedWords.map((word) => <li key={word.id}>
          <span><strong>{word.word}</strong><small>{word.meaningVi}</small></span>
          <button type="button" disabled={!speechAvailable} onClick={() => onSpeak(word.word)} aria-label={`Nghe phát âm ${word.word}`}><Volume2 size={20} aria-hidden="true" /></button>
        </li>)}
      </ul>
    </div> : <p className={styles.noMissedWords}>Lượt này không có từ nào bị kéo sai.</p>}
  </section>
}

export default function VocabularyDragDropClient() {
  const [tier, setTier] = useState<VocabularyTier>(9)
  const [selectionMode, setSelectionMode] = useState<VocabularySelectionMode>('cumulative')
  const [gameMode, setGameMode] = useState<VocabularyGameMode>('word-meaning')
  const [progress, setProgress] = useState<VocabularyProgress>(() => ({ version: 1, words: {} }))
  const [speechAvailable, setSpeechAvailable] = useState(false)
  const [activeConfig, setActiveConfig] = useState<ReturnType<typeof createVocabularyDragDropConfig> | null>(null)
  const [preparing, setPreparing] = useState(false)
  const [error, setError] = useState('')
  const [sessionQuestionCount, setSessionQuestionCount] = useState(0)
  const [sessionResults, setSessionResults] = useState<SessionResults>({})
  const progressRef = useRef(progress)
  const sessionResultsRef = useRef<SessionResults>({})
  const sessionQuestionCountRef = useRef(0)

  useEffect(() => {
    const saved = readVocabularyProgress()
    progressRef.current = saved
    setProgress(saved)
    setSpeechAvailable('speechSynthesis' in window)
  }, [])

  const weakWordIds = useMemo(() => getWeakVocabularyWordIds(progress), [progress])
  const weakWordSet = useMemo(() => new Set(weakWordIds), [weakWordIds])
  const modeSummary = useMemo(() => getPlayableVocabularyWords(
    reviewedWords,
    tier,
    selectionMode,
    gameMode,
    speechAvailable,
    weakWordIds,
  ), [gameMode, selectionMode, speechAvailable, tier, weakWordIds])
  const weakInSelection = modeSummary.words.filter((word) => weakWordSet.has(word.id)).length
  const weakFirstAvailable = weakWordIds.length > 0
  const selectedWeakWords = useMemo(() => selectionMode === 'weak-first'
    ? weakWordIds.filter((id) => modeSummary.words.some((word) => word.id === id))
    : [], [modeSummary.words, selectionMode, weakWordIds])

  const handleVocabularyAnswer = useCallback((result: { targetId: string; correct: boolean }) => {
    const nextProgress = recordVocabularyAnswer(progressRef.current, result.targetId, result.correct)
    progressRef.current = nextProgress
    writeVocabularyProgress(nextProgress)
    setProgress(nextProgress)

    const previous = sessionResultsRef.current[result.targetId] ?? { correct: false, wrongAttempts: 0 }
    const nextResults = {
      ...sessionResultsRef.current,
      [result.targetId]: {
        correct: previous.correct || result.correct,
        wrongAttempts: previous.wrongAttempts + Number(!result.correct),
      },
    }
    sessionResultsRef.current = nextResults
    setSessionResults(nextResults)
  }, [])

  const changeActivity = useCallback(() => {
    setActiveConfig(null)
    setError('')
  }, [])

  const renderCompletion = useCallback((playText: (text: string) => void) => <VocabularySessionSummary
    results={sessionResultsRef.current}
    totalQuestions={sessionQuestionCountRef.current}
    onSpeak={playText}
    speechAvailable={speechAvailable}
  />, [speechAvailable])

  const startGame = useCallback(async () => {
    if (!modeSummary.availableQuestionCount) {
      setError('Chế độ này chưa có đủ từ đã biên tập để tạo câu hỏi hợp lệ.')
      return
    }
    setPreparing(true)
    setError('')
    try {
      const weakSelection = selectionMode === 'weak-first' && selectedWeakWords.length > 0
      const effectiveSelectionMode = selectionMode === 'weak-first' && !weakSelection ? 'cumulative' : selectionMode
      const words = await loadVocabularyWords({ tier, selectionMode: effectiveSelectionMode })
      const questionCount = Math.min(10, modeSummary.availableQuestionCount)
      sessionResultsRef.current = {}
      setSessionResults({})
      sessionQuestionCountRef.current = questionCount
      setSessionQuestionCount(questionCount)
      const config = createVocabularyDragDropConfig({
        words,
        gameMode,
        questionCount,
        weakWordIds: weakSelection ? selectedWeakWords : [],
        getLastPlayedAt: () => Object.fromEntries(Object.entries(progressRef.current.words).map(([wordId, item]) => [wordId, item.lastPlayedAt])),
        speechSynthesisAvailable: speechAvailable,
        onAnswer: handleVocabularyAnswer,
        completionContent: renderCompletion,
        onChangeActivity: changeActivity,
      })
      setActiveConfig(config)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể chuẩn bị câu hỏi từ vựng.')
    } finally {
      setPreparing(false)
    }
  }, [changeActivity, gameMode, handleVocabularyAnswer, modeSummary.availableQuestionCount, renderCompletion, selectedWeakWords, selectionMode, speechAvailable, tier])

  if (activeConfig) return <DragDropGame config={activeConfig} />

  const bands = frequencyManifest.frequencyBands as Record<string, { candidateCount: number }>
  const publishedTotal = reviewedWords.length
  const sourceTotal = Number(frequencyManifest.importedCandidateCount ?? 0)
  const targetTotal = Number(frequencyManifest.targetRankCount ?? 3000)
  const excludedTotal = Number(frequencyManifest.excludedPositionCount ?? 0)

  return <main className={styles.page}>
    <div className={styles.shell}>
      <a className={styles.backLink} href="/game"><ArrowLeft size={18} aria-hidden="true" /> Trò chơi học tập</a>
      <header className={styles.header}>
        <span className={styles.eyebrow}>LUYỆN TỪ VỰNG TIẾNG ANH</span>
        <h1>Vocabulary 3000</h1>
        <p>Chọn phạm vi từ và cách luyện. Mỗi lượt có tối đa 10 cặp; một màn hình hiển thị tối đa 3 cặp.</p>
        <div className={styles.sourceSummary}>
          <span><strong>{sourceTotal.toLocaleString('vi-VN')}</strong> từ có hạng trong {targetTotal.toLocaleString('vi-VN')} vị trí đầu</span>
          <span><strong>{publishedTotal}</strong> từ đã có nghĩa tiếng Việt</span>
          <span><strong>{excludedTotal}</strong> vị trí bị loại khỏi danh sách từ</span>
        </div>
        <p className={styles.sourceNote}>Hạng tần suất từ FrequencyWords, dữ liệu OpenSubtitles 2018. Các từ chưa được biên tập sẽ không xuất hiện trong câu hỏi.</p>
      </header>

      <section className={styles.section} aria-labelledby="selection-mode-heading">
        <div className={styles.sectionHeading}>
          <span className={styles.stepNumber}>1</span>
          <div><h2 id="selection-mode-heading">Cách chọn từ</h2><p>Ôn trong phạm vi đã chọn hoặc tập trung vào từ từng trả lời sai.</p></div>
        </div>
        <div className={styles.modeChoices}>
          <button type="button" aria-pressed={selectionMode === 'cumulative'} className={`${styles.modeChoice} ${selectionMode === 'cumulative' ? styles.selected : ''}`} onClick={() => setSelectionMode('cumulative')}>
            <strong>Ôn tất cả trong Top</strong><span>Từ hạng 1 đến hết cấp đã chọn.</span>
          </button>
          <button type="button" aria-pressed={selectionMode === 'level-only'} className={`${styles.modeChoice} ${selectionMode === 'level-only' ? styles.selected : ''}`} onClick={() => setSelectionMode('level-only')}>
            <strong>Chỉ từ mới của cấp</strong><span>Chỉ lấy khoảng hạng của cấp này.</span>
          </button>
          <button type="button" aria-pressed={selectionMode === 'weak-first'} disabled={!weakFirstAvailable} className={`${styles.modeChoice} ${selectionMode === 'weak-first' ? styles.selected : ''}`} onClick={() => setSelectionMode('weak-first')}>
            <strong>Ưu tiên từ từng sai</strong><span>{weakFirstAvailable ? `${weakWordIds.length} từ có lịch sử cần ôn.` : 'Mở sau khi có lịch sử trả lời sai.'}</span>
          </button>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="tier-heading">
        <div className={styles.sectionHeading}>
          <span className={styles.stepNumber}>2</span>
          <div><h2 id="tier-heading">Chọn cấp tần suất</h2><p>Số câu hiển thị theo từ đã biên tập và có thể dùng trong chế độ đang chọn.</p></div>
        </div>
        <div className={styles.tierGrid}>
          {tierCards.map((item) => {
            const sourceCount = getSourceWordCount(item.tier, selectionMode)
            const available = getPlayableVocabularyWords(reviewedWords, item.tier, selectionMode, gameMode, speechAvailable, weakWordIds)
            const range = item.tier === 1 ? '1–50' : `${item.minRank.toLocaleString('vi-VN')}–${item.maxRank.toLocaleString('vi-VN')}`
            const candidateCount = selectionMode === 'level-only'
              ? bands[String(item.tier)]?.candidateCount ?? 0
              : tierCards.filter((entry) => entry.tier <= item.tier).reduce((sum, entry) => sum + (bands[String(entry.tier)]?.candidateCount ?? 0), 0)
            return <button type="button" key={item.tier} aria-pressed={tier === item.tier} className={`${styles.tierCard} ${tier === item.tier ? styles.selectedTier : ''}`} onClick={() => setTier(item.tier)}>
              <span className={styles.tierNumber}>Cấp {item.tier}</span>
              <strong>Top {item.maxRank.toLocaleString('vi-VN')}</strong>
              <span className={styles.rankRange}>Hạng {range}</span>
              <span className={styles.tierAvailability}>{available.playableWordCount} từ chơi được · {available.availableQuestionCount}/10 cặp</span>
              <span className={styles.tierSource}>{candidateCount.toLocaleString('vi-VN')} từ trong nguồn · {sourceCount.toLocaleString('vi-VN')} được chọn</span>
            </button>
          })}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="game-mode-heading">
        <div className={styles.sectionHeading}>
          <span className={styles.stepNumber}>3</span>
          <div><h2 id="game-mode-heading">Chọn cách ghép</h2><p>Mỗi kiểu ghép cần ít nhất 3 từ cùng nhóm; kiểu chưa đủ dữ liệu sẽ tạm khóa.</p></div>
        </div>
        <div className={styles.gameModes}>
          {modes.map(({ id, title, description, icon: Icon }) => {
            const available = getPlayableVocabularyWords(reviewedWords, tier, selectionMode, id, speechAvailable, weakWordIds)
            const disabled = available.availableQuestionCount === 0 || (id === 'audio-word' && !speechAvailable)
            return <button type="button" key={id} disabled={disabled} aria-pressed={gameMode === id} className={`${styles.gameMode} ${gameMode === id ? styles.selected : ''} ${disabled ? styles.disabled : ''}`} onClick={() => setGameMode(id)}>
              <Icon size={25} aria-hidden="true" />
              <span><strong>{title}</strong><small>{description}</small><small className={styles.modeCount}>{available.playableWordCount} từ · {available.availableQuestionCount}/10 cặp khả dụng</small></span>
              {gameMode === id && !disabled && <Check className={styles.modeCheck} size={20} aria-hidden="true" />}
            </button>
          })}
        </div>
        {gameMode === 'audio-word' && speechAvailable && <p className={styles.inlineNote}>Chưa có file MP3 từ vựng trong kho này; nút loa dùng speechSynthesis với ngôn ngữ en-US trên thiết bị.</p>}
        {gameMode === 'word-image' && modeSummary.availableQuestionCount === 0 && <p className={styles.inlineNote}>Chưa có ảnh từ vựng được cấp phép trong kho, nên chế độ ghép hình đang khóa. Hãy chọn “Từ và nghĩa” hoặc “Nghe và chọn từ” để chơi với dữ liệu hiện có.</p>}
        {gameMode === 'word-meaning' && modeSummary.availableQuestionCount === 0 && <p className={styles.inlineNote}>Cấp này chưa có đủ 3 từ đã biên tập cùng nhóm để tạo câu hỏi. Hãy chọn “Cộng dồn” hoặc tăng lên Top 300 trở lên.</p>}
        {gameMode === 'audio-word' && modeSummary.availableQuestionCount === 0 && speechAvailable && <p className={styles.inlineNote}>Cấp này chưa có đủ 3 từ đã biên tập cùng nhóm để tạo câu hỏi. Hãy chọn “Cộng dồn” hoặc tăng lên Top 300 trở lên.</p>}
        {gameMode === 'audio-word' && modeSummary.availableQuestionCount === 0 && !speechAvailable && <p className={styles.inlineNote}>Thiết bị chưa hỗ trợ đọc tiếng Anh và kho chưa có MP3. Hãy dùng “Từ và nghĩa” hoặc bật hỗ trợ speechSynthesis trên trình duyệt.</p>}
      </section>

      <section className={styles.playBar}>
        <div>
          <strong>{modeSummary.availableQuestionCount} cặp tối đa trong lượt</strong>
          <span>{modeSummary.playableWordCount} từ đã biên tập có thể dùng · {weakInSelection} từ từng sai trong phạm vi này</span>
          {selectionMode === 'weak-first' && !selectedWeakWords.length && <small>Chưa có từ sai phù hợp trong cấp này; khi bắt đầu sẽ tự ôn tất cả từ trong Top đã chọn.</small>}
        </div>
        <button type="button" className={styles.playButton} onClick={startGame} disabled={preparing || modeSummary.availableQuestionCount === 0}>
          {preparing ? 'Đang chuẩn bị…' : 'Bắt đầu chơi'}
        </button>
      </section>
      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  </main>
}
