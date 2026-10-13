'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { ArrowUpRight, Crosshair, Gamepad2, Heart, Pause, Play, QrCode, RotateCcw, ShieldAlert, Skull, Target, Trophy, Wifi, X } from 'lucide-react'
import { applyMonsterDamage, canApplyDamage, canEnterGate, CONTROL_LEVELS, createLevelWave, createRunReset, EMPTY_PLAYER_INPUT, getNextLevelIndex, MONSTER_CONFIG, PLAYER_CONFIG, WEAPON_CONFIG } from '@/lib/control-3d/game-rules.mjs'
import type { ControllerConnectionState, EnemyState, GameStatus, GameStatusPacket, PlayerInput } from '@/lib/control-3d/types'
import { playGameSound, unlockGameAudio } from '@/lib/control-3d/audio'
import { useControl3DConnection } from '@/lib/control-3d/use-control-3d-connection'
import { useKeyboardInput } from '@/lib/control-3d/use-keyboard-input'
import type { ShotTrace, WorldEffect } from './GameWorld'
import styles from './control-3d.module.css'

const GameWorld = dynamic(() => import('./GameWorld'), { ssr: false, loading: () => <div className={styles.worldLoading}>Đang chuẩn bị đấu trường…</div> })

type LanAddress = { interfaceName: string; address: string }
type PairingSession = { id: string; gameToken: string; port: number; addresses: LanAddress[] }
type IncomingPacket = { type: string; input?: PlayerInput; reason?: string; status?: GameStatusPacket }

export default function Control3DClient() {
  const [gameStatus, setGameStatus] = useState<GameStatus>('MENU')
  const [levelIndex, setLevelIndex] = useState(0)
  const [health, setHealth] = useState<number>(PLAYER_CONFIG.maxHealth)
  const [score, setScore] = useState(0)
  const [kills, setKills] = useState(0)
  const [enemies, setEnemies] = useState<EnemyState[]>([])
  const [waveTriggered, setWaveTriggered] = useState(false)
  const [magazine, setMagazine] = useState<number>(WEAPON_CONFIG.magazineSize)
  const [reserveAmmo, setReserveAmmo] = useState<number>(WEAPON_CONFIG.reserveAmmo)
  const [reloading, setReloading] = useState(false)
  const [remoteConnected, setRemoteConnected] = useState(false)
  const [pairingSession, setPairingSession] = useState<PairingSession | null>(null)
  const [pairingOpen, setPairingOpen] = useState(false)
  const [selectedAddress, setSelectedAddress] = useState('')
  const [qrImage, setQrImage] = useState('')
  const [pairingError, setPairingError] = useState('')
  const [lanAvailable, setLanAvailable] = useState(false)
  const [banner, setBanner] = useState('')
  const [shots, setShots] = useState<ShotTrace[]>([])
  const [effects, setEffects] = useState<WorldEffect[]>([])
  const [shotVersion, setShotVersion] = useState(0)
  const [highScore, setHighScore] = useState(0)
  const [respawnToken, setRespawnToken] = useState(0)
  const gameStatusRef = useRef<GameStatus>('MENU')
  const healthRef = useRef<number>(PLAYER_CONFIG.maxHealth)
  const scoreRef = useRef(0)
  const killsRef = useRef(0)
  const highScoreRef = useRef(0)
  const levelIndexRef = useRef(0)
  const enemiesRef = useRef<EnemyState[]>([])
  const remoteInputRef = useRef<PlayerInput>({ ...EMPTY_PLAYER_INPUT })
  const remoteConnectedRef = useRef(false)
  const remoteMenuWasDown = useRef(false)
  const magazineRef = useRef<number>(WEAPON_CONFIG.magazineSize)
  const reserveRef = useRef<number>(WEAPON_CONFIG.reserveAmmo)
  const reloadingRef = useRef(false)
  const canShootRef = useRef(true)
  const lastDamageAt = useRef(-Infinity)
  const idCounter = useRef(0)
  const timers = useRef<number[]>([])
  const reloadTimer = useRef<number | null>(null)
  const bannerTimer = useRef<number | null>(null)
  const previousStatus = useRef<GameStatus>('PLAYING')
  const resetInputRef = useRef<() => void>(() => undefined)
  const qrGeneration = useRef(0)
  gameStatusRef.current = gameStatus
  healthRef.current = health
  scoreRef.current = score
  killsRef.current = kills
  highScoreRef.current = Math.max(highScoreRef.current, highScore)
  levelIndexRef.current = levelIndex
  enemiesRef.current = enemies
  remoteConnectedRef.current = remoteConnected
  canShootRef.current = !reloading && magazine > 0 && gameStatus === 'PLAYING'

  const togglePause = useCallback(() => {
    remoteInputRef.current = { ...EMPTY_PLAYER_INPUT }
    setGameStatus((current) => {
      if (current === 'PLAYING' || current === 'LEVEL_CLEAR') {
        previousStatus.current = current
        resetInputRef.current()
        return 'PAUSED'
      }
      if (current === 'PAUSED') {
        resetInputRef.current()
        return previousStatus.current
      }
      return current
    })
  }, [])
  const keyboard = useKeyboardInput(togglePause, !remoteConnected, gameStatus === 'PLAYING' || gameStatus === 'LEVEL_CLEAR')
  const resetKeyboardInput = keyboard.reset
  const requestPointerLock = keyboard.requestPointerLock
  const releasePointerLock = keyboard.releasePointerLock
  resetInputRef.current = resetKeyboardInput

  useEffect(() => {
    if (gameStatus !== 'PLAYING' && gameStatus !== 'LEVEL_CLEAR') releasePointerLock()
  }, [gameStatus, releasePointerLock])

  useEffect(() => {
    const saved = Number(window.localStorage.getItem('control-3d-high-score') || 0)
    if (Number.isFinite(saved)) { highScoreRef.current = Math.max(0, saved); setHighScore(highScoreRef.current) }
    fetch('/__control-3d/lan-info', { cache: 'no-store' }).then((response) => setLanAvailable(response.ok)).catch(() => setLanAvailable(false))
  }, [])

  useEffect(() => () => {
    timers.current.forEach(window.clearTimeout)
    if (reloadTimer.current !== null) window.clearTimeout(reloadTimer.current)
    if (bannerTimer.current !== null) window.clearTimeout(bannerTimer.current)
  }, [])

  useEffect(() => {
    if (!pairingSession?.id) return
    return () => { void fetch(`/__control-3d/sessions/${pairingSession.id}`, { method: 'DELETE', keepalive: true }).catch(() => undefined) }
  }, [pairingSession?.id])

  useEffect(() => {
    const generation = ++qrGeneration.current
    if (!pairingSession || !selectedAddress) { setQrImage(''); return }
    const url = `${window.location.protocol}//${selectedAddress}:${pairingSession.port}/game/control-3d/controller/${pairingSession.id}`
    import('qrcode').then(({ default: QRCode }) => QRCode.toDataURL(url, {
      errorCorrectionLevel: 'M', margin: 2, width: 260,
      color: { dark: '#10243c', light: '#ffffff' },
    })).then((image) => {
      if (generation === qrGeneration.current) setQrImage(image)
    }).catch(() => { if (generation === qrGeneration.current) setPairingError('Không tạo được mã QR. Bé có thể mở link bằng tay.') })
  }, [pairingSession, selectedAddress])

  const statusPacket = useMemo<GameStatusPacket>(() => ({
    level: levelIndex + 1,
    health,
    maxHealth: PLAYER_CONFIG.maxHealth,
    score,
    enemiesRemaining: enemies.length,
    gameStatus,
  }), [levelIndex, health, score, enemies.length, gameStatus])

  const onNetworkPacket = useCallback((packet: IncomingPacket) => {
    if (packet.type === 'INPUT' && packet.input) {
      const menuDown = packet.input.menu === true
      const menuPressed = menuDown && !remoteMenuWasDown.current
      remoteMenuWasDown.current = menuDown
      if (menuPressed) togglePause()
      const pauseInput = menuDown || gameStatusRef.current === 'PAUSED'
      remoteInputRef.current = pauseInput ? { ...EMPTY_PLAYER_INPUT, menu: menuDown } : packet.input
    }
    if (packet.type === 'CONTROLLER_CONNECTED') {
      remoteInputRef.current = { ...EMPTY_PLAYER_INPUT }
      remoteMenuWasDown.current = false
      remoteConnectedRef.current = true
      setRemoteConnected(true)
    }
    if (packet.type === 'CONTROLLER_DISCONNECTED') {
      remoteInputRef.current = { ...EMPTY_PLAYER_INPUT }
      remoteMenuWasDown.current = false
      remoteConnectedRef.current = false
      setRemoteConnected(false)
      if (gameStatusRef.current === 'PLAYING' || gameStatusRef.current === 'LEVEL_CLEAR') {
        previousStatus.current = gameStatusRef.current
        resetKeyboardInput()
        setGameStatus('PAUSED')
      }
    }
  }, [resetKeyboardInput, togglePause])
  const gameConnection = useControl3DConnection({
    enabled: Boolean(pairingSession),
    role: 'game',
    sessionId: pairingSession?.id ?? '',
    gameToken: pairingSession?.gameToken,
    status: statusPacket,
    onPacket: onNetworkPacket,
  })

  const showBanner = useCallback((message: string, duration = 1900) => {
    setBanner(message)
    if (bannerTimer.current !== null) window.clearTimeout(bannerTimer.current)
    bannerTimer.current = window.setTimeout(() => setBanner(''), duration)
  }, [])

  const updateHighScore = useCallback((value: number) => {
    const next = Math.max(highScoreRef.current, value)
    highScoreRef.current = next
    window.localStorage.setItem('control-3d-high-score', String(next))
    setHighScore(next)
  }, [])

  const spawnEffect = useCallback((kind: WorldEffect['kind'], position: [number, number, number], lifetime = 650) => {
    const id = ++idCounter.current
    setEffects((current) => [...current.slice(-7), { id, kind, position }])
    const timer = window.setTimeout(() => setEffects((current) => current.filter((effect) => effect.id !== id)), lifetime)
    timers.current.push(timer)
  }, [])

  const startReload = useCallback(() => {
    if (reloadingRef.current || magazineRef.current >= WEAPON_CONFIG.magazineSize || reserveRef.current <= 0 || gameStatusRef.current !== 'PLAYING') return
    reloadingRef.current = true
    setReloading(true)
    playGameSound('empty', 0.07)
    reloadTimer.current = window.setTimeout(() => {
      const needed = WEAPON_CONFIG.magazineSize - magazineRef.current
      const loaded = Math.min(needed, reserveRef.current)
      magazineRef.current += loaded
      reserveRef.current -= loaded
      setMagazine(magazineRef.current)
      setReserveAmmo(reserveRef.current)
      reloadingRef.current = false
      setReloading(false)
      reloadTimer.current = null
    }, WEAPON_CONFIG.reloadSeconds * 1000)
  }, [])

  const triggerEmptyFire = useCallback(() => {
    if (magazineRef.current <= 0 && reserveRef.current > 0) startReload()
    else playGameSound('empty', 0.05)
  }, [startReload])

  const onShot = useCallback((trace: Omit<ShotTrace, 'id'>) => {
    if (reloadingRef.current || magazineRef.current <= 0) return
    magazineRef.current -= 1
    setMagazine(magazineRef.current)
    setShotVersion((value) => value + 1)
    playGameSound('shoot', 0.075)
    const id = ++idCounter.current
    setShots((current) => [...current.slice(-3), { ...trace, id }])
    const timer = window.setTimeout(() => setShots((current) => current.filter((shot) => shot.id !== id)), 130)
    timers.current.push(timer)
  }, [])

  const triggerWave = useCallback(() => {
    if (gameStatusRef.current !== 'PLAYING' || enemiesRef.current.length > 0) return
    const wave: EnemyState[] = createLevelWave(levelIndexRef.current).map((spawn) => {
      const kind = spawn.kind as EnemyState['kind']
      const maxHealth = MONSTER_CONFIG[kind].health
      return { id: spawn.id, kind, x: spawn.x, z: spawn.z, health: maxHealth, maxHealth }
    })
    enemiesRef.current = wave
    setEnemies(wave)
    setWaveTriggered(true)
    showBanner(`QUÁI VẬT ĐANG TỚI · ${wave.length}`, 1700)
  }, [showBanner])

  const damagePlayer = useCallback((damage: number) => {
    const now = performance.now()
    if (gameStatusRef.current !== 'PLAYING' || !canApplyDamage(now, lastDamageAt.current, PLAYER_CONFIG.invulnerabilitySeconds)) return
    lastDamageAt.current = now
    healthRef.current = Math.max(0, healthRef.current - damage)
    setHealth(healthRef.current)
    playGameSound('player-hit', 0.14)
    if (healthRef.current <= 0) {
      setGameStatus('GAME_OVER')
      updateHighScore(score)
      resetKeyboardInput()
    }
  }, [resetKeyboardInput, score, updateHighScore])

  const damageEnemy = useCallback((enemyId: string, position: [number, number, number]) => {
    const current = enemiesRef.current
    const target = current.find((enemy) => enemy.id === enemyId)
    if (!target) return
    const damage = applyMonsterDamage(target, WEAPON_CONFIG.bulletDamage)
    if (!damage.defeated) {
      const next = current.map((enemy) => enemy.id === enemyId ? { ...enemy, health: damage.health } : enemy)
      enemiesRef.current = next
      setEnemies(next)
      spawnEffect('hit', position, 370)
      playGameSound('hit', 0.065)
      return
    }

    const remaining = current.filter((enemy) => enemy.id !== enemyId)
    enemiesRef.current = remaining
    setEnemies(remaining)
    scoreRef.current += damage.score
    setScore(scoreRef.current)
    updateHighScore(scoreRef.current)
    killsRef.current += 1
    setKills(killsRef.current)
    spawnEffect('death', position, 680)
    playGameSound('death', 0.1)
    if (remaining.length === 0) {
      setGameStatus('LEVEL_CLEAR')
      showBanner('CỔNG ĐÃ MỞ · ĐI TỚI CỔNG!', 3200)
      playGameSound('gate', 0.12)
      spawnEffect('gate', [0, 2, 26], 800)
    }
  }, [showBanner, spawnEffect, updateHighScore])

  const enterGate = useCallback(() => {
    if (!canEnterGate(gameStatusRef.current, enemiesRef.current.length)) return
    playGameSound('level', 0.14)
    if (levelIndexRef.current >= CONTROL_LEVELS.length - 1) {
      setGameStatus('VICTORY')
      showBanner('P1 ĐÃ GIẢI CỨU CỔNG THÀNH!', 5000)
      updateHighScore(score)
      resetKeyboardInput()
      return
    }
    const next = getNextLevelIndex(levelIndexRef.current)
    levelIndexRef.current = next
    enemiesRef.current = []
    setEnemies([])
    setLevelIndex(next)
    setWaveTriggered(false)
    setGameStatus('PLAYING')
    setRespawnToken((value) => value + 1)
    magazineRef.current = WEAPON_CONFIG.magazineSize
    reserveRef.current = Math.min(WEAPON_CONFIG.reserveAmmo, reserveRef.current + 24)
    setMagazine(magazineRef.current)
    setReserveAmmo(reserveRef.current)
    reloadingRef.current = false
    setReloading(false)
    showBanner(`MÀN ${next + 1} · ${CONTROL_LEVELS[next].name}`, 2300)
  }, [resetKeyboardInput, score, showBanner, updateHighScore])

  const resetGame = useCallback((fromBeginning: boolean) => {
    const reset = createRunReset({ restart: fromBeginning, levelIndex: levelIndexRef.current, score: scoreRef.current, kills: killsRef.current, reserveAmmo: reserveRef.current })
    if (reloadTimer.current !== null) window.clearTimeout(reloadTimer.current)
    reloadTimer.current = null
    reloadingRef.current = false
    setReloading(false)
    remoteInputRef.current = { ...EMPTY_PLAYER_INPUT }
    remoteMenuWasDown.current = false
    resetKeyboardInput()
    enemiesRef.current = []
    setEnemies([])
    setWaveTriggered(false)
    setHealth(reset.health)
    healthRef.current = reset.health
    setLevelIndex(reset.levelIndex)
    levelIndexRef.current = reset.levelIndex
    setScore(reset.score)
    scoreRef.current = reset.score
    setKills(reset.kills)
    killsRef.current = reset.kills
    magazineRef.current = reset.magazine
    reserveRef.current = reset.reserveAmmo
    setMagazine(reset.magazine)
    setReserveAmmo(reset.reserveAmmo)
    setShots([])
    setEffects([])
    setBanner('')
    setRespawnToken((value) => value + 1)
    previousStatus.current = 'PLAYING'
    setGameStatus('PLAYING')
    unlockGameAudio()
    playGameSound('level', 0.08)
    if (fromBeginning) showBanner(`MÀN 1 · ${CONTROL_LEVELS[0].name}`, 2300)
    else showBanner(`THỬ LẠI · MÀN ${levelIndexRef.current + 1}`, 1800)
  }, [resetKeyboardInput, showBanner])

  const startGameFromClick = useCallback((fromBeginning: boolean) => {
    resetGame(fromBeginning)
    if (!remoteConnectedRef.current) requestPointerLock()
  }, [requestPointerLock, resetGame])

  const resumeGameFromClick = useCallback(() => {
    setGameStatus(previousStatus.current)
    if (!remoteConnectedRef.current) requestPointerLock()
  }, [requestPointerLock])

  const createPairingSession = useCallback(async () => {
    setPairingError('')
    try {
      const response = await fetch('/__control-3d/sessions', { method: 'POST', cache: 'no-store' })
      if (!response.ok) throw new Error(response.status === 404 ? 'Hãy chạy npm run dev:lan trên máy tính trước.' : `Máy LAN trả về ${response.status}.`)
      const data = await response.json() as PairingSession
      if (!data.addresses?.length) throw new Error('Không tìm thấy IPv4 riêng. Hãy kết nối PC và điện thoại cùng Wi-Fi/LAN.')
      setPairingSession(data)
      setSelectedAddress((current) => data.addresses.some((item) => item.address === current) ? current : data.addresses[0].address)
      setPairingOpen(true)
    } catch (error) {
      setPairingError(error instanceof Error ? error.message : 'Không tạo được phiên điều khiển LAN.')
      setPairingOpen(true)
    }
  }, [])

  const closePairingSession = useCallback(() => {
    setPairingOpen(false)
    setPairingSession(null)
    setQrImage('')
    remoteConnectedRef.current = false
    remoteInputRef.current = { ...EMPTY_PLAYER_INPUT }
    remoteMenuWasDown.current = false
    setRemoteConnected(false)
  }, [])

  const currentLevel = CONTROL_LEVELS[levelIndex]
  const enemyTotal = Object.values(currentLevel.counts).reduce((sum, value) => sum + value, 0)
  const healthPercent = Math.max(0, health / PLAYER_CONFIG.maxHealth * 100)
  const connectionState: ControllerConnectionState = pairingSession ? remoteConnected ? 'connected' : gameConnection.state : lanAvailable ? 'disconnected' : 'disabled'

  return <main className={styles.game} aria-label="P1 3D Shooter">
    <div className={styles.world}><GameWorld
      levelIndex={levelIndex}
      gameStatus={gameStatus}
      respawnToken={respawnToken}
      enemies={enemies}
      localInputRef={keyboard.inputRef}
      remoteInputRef={remoteInputRef}
      remoteConnectedRef={remoteConnectedRef}
      mouseLookRef={keyboard.mouseLookRef}
      aimModeRef={keyboard.aimModeRef}
      canShootRef={canShootRef}
      onWaveTrigger={triggerWave}
      onGateEnter={enterGate}
      onEnemyAttack={damagePlayer}
      onEnemyHit={damageEnemy}
      onShot={onShot}
      onReload={startReload}
      onEmptyFire={triggerEmptyFire}
      onCanvasCreated={keyboard.bindCanvas}
      shots={shots}
      effects={effects}
      shotVersion={shotVersion}
    /></div>

    <header className={styles.hud}>
      <div className={styles.healthPanel}>
        <span className={styles.heartIcon}><Heart size={19} fill="currentColor" /></span>
        <div className={styles.healthText}><strong>{health} <small>/ {PLAYER_CONFIG.maxHealth} HP</small></strong><div className={styles.healthTrack}><i style={{ width: `${healthPercent}%` }} /></div></div>
      </div>
      <div className={styles.levelPanel}><span>MÀN {levelIndex + 1} / {CONTROL_LEVELS.length}</span><strong>{currentLevel.name}</strong></div>
      <div className={styles.scorePanel}><div><Trophy size={17} /> <b>{score}</b><small>ĐIỂM</small></div><div><Skull size={17} /> <b>{waveTriggered ? enemies.length : enemyTotal}</b><small>{waveTriggered ? 'CÒN LẠI' : 'QUÁI'}</small></div></div>
      <div className={styles.headerActions}>
        <span className={`${styles.controllerPill} ${connectionState === 'connected' ? styles.connected : ''}`}><Wifi size={15} />{connectionState === 'connected' ? 'ĐÃ KẾT NỐI' : connectionState === 'connecting' ? 'ĐANG KẾT NỐI' : 'CHƯA KẾT NỐI'}</span>
        <button type="button" className={styles.qrButton} onClick={() => pairingSession ? setPairingOpen((value) => !value) : void createPairingSession()}><QrCode size={17} />{pairingSession ? 'MÃ QR' : 'KẾT NỐI ĐIỆN THOẠI'}</button>
        {(gameStatus === 'PLAYING' || gameStatus === 'LEVEL_CLEAR') && <button type="button" className={styles.pauseButton} onClick={togglePause} aria-label="Tạm dừng"><Pause size={18} /></button>}
      </div>
    </header>

    {gameStatus !== 'MENU' && <div className={styles.weaponHud}>
      <span className={styles.weaponIcon}><Crosshair size={18} /></span>
      <b>{reloading ? 'ĐANG NẠP…' : `${magazine} / ${reserveAmmo}`}</b>
      <button type="button" onClick={startReload} disabled={reloading || magazine === WEAPON_CONFIG.magazineSize || reserveAmmo <= 0}><RotateCcw size={13} /> R NẠP</button>
    </div>}

    {(gameStatus === 'PLAYING' || gameStatus === 'LEVEL_CLEAR') && <div className={styles.crosshair} aria-hidden="true"><i /><i /><b /></div>}
    {banner && <div className={`${styles.banner} ${gameStatus === 'LEVEL_CLEAR' ? styles.bannerOpen : ''}`} role="status"><span>{gameStatus === 'LEVEL_CLEAR' ? <ArrowUpRight size={21} /> : <Target size={19} />}</span>{banner}</div>}
    <div className={styles.instructions}><span><b>W A S D</b> DI CHUYỂN</span><span><b>CHUỘT</b> XOAY CAMERA</span><span><b>GIỮ CHUỘT PHẢI</b> NGẮM</span><span><b>GIỮ CHUỘT TRÁI</b> BẮN</span><span><b>SPACE</b> NHẢY</span><span><b>R</b> NẠP ĐẠN</span><span><b>ESC</b> TẠM DỪNG</span></div>

    {(gameStatus === 'MENU' || gameStatus === 'PAUSED' || gameStatus === 'GAME_OVER' || gameStatus === 'VICTORY') && <div className={styles.overlay}>
      {gameStatus === 'MENU' && <section className={styles.menuCard}>
        <span className={styles.eyebrow}>PLAYER 1 · LOW POLY ADVENTURE</span>
        <h1>RỪNG XANH<br /><em>ĐẠI CHIẾN</em></h1>
        <p>Đi qua 5 vùng đất, đánh bại quái vật và mở cổng thành Boss.</p>
        <div className={styles.menuStats}><span><Heart size={17} /> 100 HP</span><span><Target size={17} /> 5 MÀN</span><span><Gamepad2 size={17} /> BÀN PHÍM / ĐIỆN THOẠI</span></div>
        <button type="button" className={styles.primaryButton} disabled={!keyboard.canvas} onClick={() => startGameFromClick(true)}><Play size={19} fill="currentColor" />{keyboard.canvas ? 'BẮT ĐẦU CHƠI' : 'ĐANG CHUẨN BỊ CAMERA…'}</button>
        <button type="button" className={styles.secondaryButton} onClick={() => pairingSession ? setPairingOpen(true) : void createPairingSession()}><QrCode size={18} /> KẾT NỐI ĐIỆN THOẠI</button>
        <span className={styles.bestScore}>KỶ LỤC CAO NHẤT <b>{highScore}</b></span>
      </section>}
      {gameStatus === 'PAUSED' && <section className={styles.dialogCard}>
        <span className={styles.dialogIcon}><Pause size={24} fill="currentColor" /></span><h2>TẠM DỪNG</h2><p>Điều khiển đã được khóa an toàn.</p>
        <button type="button" className={styles.primaryButton} onClick={resumeGameFromClick}><Play size={18} fill="currentColor" /> TIẾP TỤC</button>
        <button type="button" className={styles.secondaryButton} onClick={() => startGameFromClick(false)}><RotateCcw size={18} /> THỬ LẠI MÀN {levelIndex + 1}</button>
        <button type="button" className={styles.textButton} onClick={() => startGameFromClick(true)}>CHƠI LẠI TỪ ĐẦU</button>
      </section>}
      {gameStatus === 'GAME_OVER' && <section className={styles.dialogCard}>
        <span className={`${styles.dialogIcon} ${styles.danger}`}><ShieldAlert size={26} /></span><h2>HẾT MÁU!</h2><p>P1 đã hạ {kills} quái · {score} điểm</p>
        <button type="button" className={styles.primaryButton} onClick={() => startGameFromClick(false)}><RotateCcw size={18} /> THỬ LẠI MÀN {levelIndex + 1}</button>
        <button type="button" className={styles.secondaryButton} onClick={() => startGameFromClick(true)}>CHƠI LẠI TỪ ĐẦU</button>
        <span className={styles.bestScore}>KỶ LỤC CAO NHẤT <b>{highScore}</b></span>
      </section>}
      {gameStatus === 'VICTORY' && <section className={styles.dialogCard}>
        <span className={`${styles.dialogIcon} ${styles.victory}`}><Trophy size={28} /></span><h2>CHIẾN THẮNG!</h2><p>P1 đã đánh bại Boss và mở cổng thành.</p><div className={styles.resultScore}>{score}<small>ĐIỂM</small></div><p>Quái đã hạ: <b>{kills}</b></p>
        <button type="button" className={styles.primaryButton} onClick={() => startGameFromClick(true)}><RotateCcw size={18} /> CHƠI LẠI TỪ MÀN 1</button>
        <span className={styles.bestScore}>KỶ LỤC CAO NHẤT <b>{highScore}</b></span>
      </section>}
    </div>}

    {pairingOpen && <div className={styles.pairingShade} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPairingOpen(false) }}>
      <section className={styles.pairingCard} role="dialog" aria-modal="true" aria-labelledby="pairing-title">
        <div className={styles.pairingHead}><div><span className={styles.eyebrow}>CHƠI CÙNG ĐIỆN THOẠI</span><h2 id="pairing-title">KẾT NỐI TAY CẦM</h2></div><button type="button" onClick={() => setPairingOpen(false)} aria-label="Đóng"><X size={20} /></button></div>
        {pairingSession && qrImage ? <div className={styles.qrContent}>
          <div className={styles.qrImageWrap}><Image src={qrImage} alt="Mã QR mở tay cầm trên điện thoại" width={176} height={176} unoptimized /></div>
          <div className={styles.qrInstructions}><p>1. Chọn đúng Wi-Fi/LAN đang dùng trên máy tính.</p><p>2. Quét QR bằng camera điện thoại.</p><p>3. Màn hình tay cầm nên xoay ngang.</p><label>Địa chỉ PC<select value={selectedAddress} onChange={(event) => setSelectedAddress(event.target.value)}>{pairingSession.addresses.map((item) => <option key={item.address} value={item.address}>{item.address} · {item.interfaceName}</option>)}</select></label><code>Phiên {pairingSession.id.slice(0, 8).toUpperCase()}</code></div>
        </div> : !pairingSession ? <div className={styles.pairingUnavailable}><Wifi size={30} /><p>{pairingError || 'Tạo phiên riêng cho điện thoại trong mạng nội bộ.'}</p>{!lanAvailable && <code>npm run dev:lan</code>}<button type="button" className={styles.primaryButton} onClick={() => void createPairingSession()}><QrCode size={17} /> TẠO QR MỚI</button></div> : <div className={styles.pairingUnavailable}><p>Đang tạo mã QR…</p></div>}
        {pairingError && pairingSession && <p className={styles.pairingError}>{pairingError}</p>}
        <div className={styles.pairingFooter}><span className={`${styles.connectionLight} ${remoteConnected ? styles.connectionLightOn : ''}`} />{remoteConnected ? 'ĐIỆN THOẠI ĐÃ KẾT NỐI' : connectionState === 'connecting' ? 'ĐANG GHÉP NỐI…' : 'ĐANG CHỜ ĐIỆN THOẠI'}<button type="button" onClick={() => void createPairingSession()}><RotateCcw size={15} /> TẠO MÃ KHÁC</button></div>
      </section>
    </div>}
  </main>
}
