'use client'

import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Crosshair, Heart, Play, QrCode, RotateCcw, Sparkles, Trophy, Wifi, X, Zap } from 'lucide-react'
import { useControl3DConnection } from '@/lib/control-3d/use-control-3d-connection'
import { EMPTY_PLAYER_INPUT } from '@/lib/control-3d/game-rules.mjs'
import type { GameStatus, GameStatusPacket, PlayerInput } from '@/lib/control-3d/types'
import type { HuntGameHandle } from './GameCanvas'
import type { HuntDifficulty, HuntMode, HuntSnapshot, RemoteHuntInput, WeaponMode } from './HuntScene'
import { MAX_PLAYER_HEARTS } from './constants'
import styles from './hunt.module.css'

const GameCanvas = dynamic(() => import('./GameCanvas'), { ssr: false, loading: () => <div className={styles.loading}>ĐANG CHUẨN BỊ RỪNG…</div> })
const DEV_TEST = process.env.NODE_ENV !== 'production'
type LanAddress = { interfaceName: string; address: string }
type PairingSession = { id: string; gameToken: string; port: number; addresses: LanAddress[] }

const EMPTY_PLAYER = (playerId: 1 | 2) => ({ playerId, hp: MAX_PLAYER_HEARTS, health: 100, maxHealth: 100, score: 0, kills: 0, ammo: 30, maxAmmo: 30, combo: 0, connected: false, reloadRemaining: 0, abilityCooldowns: [0, 0] as [number, number], weaponMode: null, weaponRemaining: 0, weaponInventory: { cannon: 0, ice: 0 } })
const INITIAL_STATE: HuntSnapshot = {
  status: 'MENU', kills: 0, stage: 1, phase: 'SURVIVAL', bossName: 'Heo rừng khổng lồ', bossHealth: 0, bossMaxHealth: 0, bossHeartsRemaining: 0, difficulty: 'normal', activeEnemies: 0,
  players: [EMPTY_PLAYER(1), EMPTY_PLAYER(2)],
}

export default function Control2DClient() {
  const [snapshot, setSnapshot] = useState(INITIAL_STATE)
  const [selectedDifficulty, setSelectedDifficulty] = useState<HuntDifficulty>('normal')
  const [selectedMode, setSelectedMode] = useState<HuntMode>('SURVIVAL')
  const [gameReady, setGameReady] = useState(false)
  const [controllerConnected, setControllerConnected] = useState<[boolean, boolean]>([false, false])
  const [controllerInputs, setControllerInputs] = useState<[RemoteHuntInput | null, RemoteHuntInput | null]>([null, null])
  const [pairingSession, setPairingSession] = useState<PairingSession | null>(null)
  const [selectedAddress, setSelectedAddress] = useState('')
  const [qrCodes, setQrCodes] = useState<[string, string]>(['', ''])
  const [pairingOpen, setPairingOpen] = useState(false)
  const [pairingError, setPairingError] = useState('')
  const [lanReady, setLanReady] = useState(false)
  const handleRef = useRef<HuntGameHandle | null>(null)
  const remoteSkillPressed = useRef<[[boolean, boolean], [boolean, boolean]]>([[false, false], [false, false]])
  const remoteWeaponPressed = useRef<[[boolean, boolean], [boolean, boolean]]>([[false, false], [false, false]])
  const qrGeneration = useRef(0)

  const onPacket = useCallback((packet: { type: string; playerId?: 1 | 2; input?: PlayerInput; reason?: string }) => {
    if ((packet.type === 'CONTROLLER_CONNECTED' || packet.type === 'CONTROLLER_DISCONNECTED') && packet.playerId) {
      const connected = packet.type === 'CONTROLLER_CONNECTED'
      const index = packet.playerId - 1
      setControllerConnected((current) => current.map((value, i) => i === index ? connected : value) as [boolean, boolean])
      if (!connected) {
        remoteSkillPressed.current[index] = [false, false]
        remoteWeaponPressed.current[index] = [false, false]
        setControllerInputs((current) => current.map((value, i) => i === index ? null : value) as [RemoteHuntInput | null, RemoteHuntInput | null])
      }
      else setControllerInputs((current) => current.map((value, i) => i === index ? value ?? { aimX: 0, aimY: 0, fire: false } : value) as [RemoteHuntInput | null, RemoteHuntInput | null])
    }
    if (packet.type === 'INPUT' && packet.playerId && packet.input) {
      const index = packet.playerId - 1
      const skills: [boolean, boolean] = [packet.input.skillQ, packet.input.skillE]
      skills.forEach((pressed, ability) => {
        if (pressed && !remoteSkillPressed.current[index][ability]) handleRef.current?.useAbility(packet.playerId!, ability as 0 | 1)
      })
      remoteSkillPressed.current[index] = skills
      const weapons: [boolean, boolean] = [packet.input.weaponCannon === true, packet.input.weaponIce === true]
      weapons.forEach((pressed, weapon) => {
        if (pressed && !remoteWeaponPressed.current[index][weapon]) handleRef.current?.activateWeapon(packet.playerId!, weapon === 0 ? 'cannon' : 'ice')
      })
      remoteWeaponPressed.current[index] = weapons
      setControllerInputs((current) => current.map((value, i) => i === index ? { aimX: packet.input!.aimX, aimY: packet.input!.aimY, fire: packet.input!.fire } : value) as [RemoteHuntInput | null, RemoteHuntInput | null])
    }
  }, [])

  const gameStatus: GameStatus = snapshot.status === 'PLAYING' ? 'PLAYING'
    : snapshot.status === 'PAUSED' ? 'PAUSED'
      : snapshot.status === 'WON' ? 'VICTORY'
        : snapshot.status === 'LOST' ? 'GAME_OVER' : 'MENU'
  const statusPacket = useMemo<GameStatusPacket>(() => ({
    level: snapshot.stage,
    health: Math.max(...snapshot.players.map((player) => player.hp > 0 ? ((player.hp - 1) * player.maxHealth + player.health) / MAX_PLAYER_HEARTS : 0)),
    maxHealth: 100,
    score: snapshot.players.reduce((sum, player) => sum + player.score, 0),
    enemiesRemaining: snapshot.activeEnemies,
    gameStatus,
    players: snapshot.players.map((player) => ({ hp: player.hp, maxHp: MAX_PLAYER_HEARTS, health: player.health, maxHealth: player.maxHealth, ammo: player.ammo, maxAmmo: player.maxAmmo, weaponMode: player.weaponMode, weaponRemaining: player.weaponRemaining, weaponInventory: player.weaponInventory })),
  }), [snapshot, gameStatus])

  const gameConnection = useControl3DConnection({
    enabled: Boolean(pairingSession),
    role: 'game',
    sessionId: pairingSession?.id ?? '',
    gameToken: pairingSession?.gameToken,
    status: statusPacket,
    onPacket,
  })

  useEffect(() => {
    fetch('/__control-3d/lan-info', { cache: 'no-store' }).then((response) => setLanReady(response.ok)).catch(() => setLanReady(false))
  }, [])

  const pairingSessionId = pairingSession?.id
  useEffect(() => {
    if (!pairingSessionId) return
    return () => { void fetch(`/__control-3d/sessions/${pairingSessionId}`, { method: 'DELETE', keepalive: true }).catch(() => undefined) }
  }, [pairingSessionId])

  useEffect(() => {
    const generation = ++qrGeneration.current
    if (!pairingSession || !selectedAddress) { setQrCodes(['', '']); return }
    import('qrcode').then(({ default: QRCode }) => Promise.all([1, 2].map((playerId) => {
      const url = `${window.location.protocol}//${selectedAddress}:${pairingSession.port}/game/control-2d-2players/controller/${pairingSession.id}?player=${playerId}`
      return QRCode.toDataURL(url, { errorCorrectionLevel: 'M', margin: 2, width: 240, color: { dark: playerId === 1 ? '#153c67' : '#651c43', light: '#ffffff' } })
    }))).then((codes) => {
      if (generation === qrGeneration.current) setQrCodes(codes as [string, string])
    }).catch(() => {
      if (generation === qrGeneration.current) setPairingError('Không tạo được QR. Hãy thử tạo phiên mới.')
    })
  }, [pairingSession, selectedAddress])

  const pairingPausedGame = useRef(false)
  const openPairing = useCallback(() => {
    if (snapshot.status === 'PLAYING' && !pairingPausedGame.current) {
      handleRef.current?.pauseRun()
      pairingPausedGame.current = true
    }
    setPairingOpen(true)
  }, [snapshot.status])

  const closePairing = useCallback(() => {
    setPairingOpen(false)
    if (pairingPausedGame.current) {
      pairingPausedGame.current = false
      handleRef.current?.resumeRun()
    }
  }, [])

  const createPairingSession = useCallback(async () => {
    openPairing()
    setPairingError('')
    try {
      const response = await fetch('/__control-3d/sessions', {
        method: 'POST', cache: 'no-store', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ gameType: 'control-2d-2players' }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(response.status === 404 ? 'Hãy chạy game bằng npm run dev:lan để bật ghép nối LAN.' : payload.error || 'Không tạo được phiên kết nối.')
      const next = payload as PairingSession
      setPairingSession(next)
      setSelectedAddress(next.addresses[0]?.address ?? '')
      setControllerConnected([false, false])
      setControllerInputs([null, null])
    } catch (error) {
      setPairingError(error instanceof Error ? error.message : 'Không kết nối được máy chủ LAN.')
    }
  }, [openPairing])

  const startRun = useCallback(() => {
    if (!handleRef.current) return
    handleRef.current.startRun(selectedDifficulty, selectedMode)
  }, [selectedDifficulty, selectedMode])

  const advanceStage = useCallback(() => { void handleRef.current?.advanceStage() }, [])

  const togglePause = useCallback(() => {
    if (snapshot.status === 'PLAYING') handleRef.current?.pauseRun()
    else if (snapshot.status === 'PAUSED') handleRef.current?.resumeRun()
  }, [snapshot.status])

  const isPlaying = snapshot.status === 'PLAYING'
  const isPaused = snapshot.status === 'PAUSED'
  const hasBothPlayers = controllerConnected[0] && controllerConnected[1]
  const canStart = gameReady && (hasBothPlayers || DEV_TEST)

  return <main className={styles.game} aria-label="Rừng săn quái hai người chơi">
    <GameCanvas controllerInputs={controllerInputs} onState={setSnapshot} onReady={() => setGameReady(true)} handleRef={handleRef} />
    <div className={styles.vignette} />

    <header className={styles.hud}>
      <PlayerHud player={snapshot.players[0]} color="blue" connected={controllerConnected[0]} />
      <div className={styles.centerHud}>
        <div className={styles.titleSign}><span>RỪNG SĂN QUÁI</span><b>Màn {snapshot.stage}</b></div>
      </div>
      <PlayerHud player={snapshot.players[1]} color="pink" connected={controllerConnected[1]} />
      <div className={styles.headerActions}>
        <button className={styles.iconButton} onClick={() => pairingSession ? openPairing() : void createPairingSession()} aria-label="Mở mã QR"><QrCode size={20} /></button>
      </div>
    </header>

    {isPlaying && snapshot.bossHeartsRemaining > 0 && <div className={styles.bossRewardNotice} aria-live="polite">BẮN TRÚNG {snapshot.bossHeartsRemaining} TIM ĐỂ QUA MÀN</div>}

    <div className={styles.bottomHud}>
      <div className={`${styles.playerBottom} ${styles.playerBottomBlue}`}>
        <AmmoHud player={snapshot.players[0]} color="blue" />
        <WeaponButtons playerId={1} player={snapshot.players[0]} active={isPlaying} onActivate={(weapon) => handleRef.current?.activateWeapon(1, weapon)} />
        <button className={`${styles.ability} ${styles.flame}`} onClick={() => handleRef.current?.useAbility(1, 0)} disabled={!isPlaying || snapshot.players[0].abilityCooldowns[0] > 0} aria-label="Dùng kỹ năng lửa Q">
          <span><Zap size={27} fill="currentColor" /></span><kbd>Q</kbd>{snapshot.players[0].abilityCooldowns[0] > 0 && <small>{Math.ceil(snapshot.players[0].abilityCooldowns[0] / 1000)}</small>}
        </button>
      </div>
      <div className={`${styles.playerBottom} ${styles.playerBottomPink}`}>
        <button className={`${styles.ability} ${styles.ice}`} onClick={() => handleRef.current?.useAbility(2, 1)} disabled={!isPlaying || snapshot.players[1].abilityCooldowns[1] > 0} aria-label="Dùng kỹ năng băng E">
          <span><Sparkles size={27} /></span><kbd>E</kbd>{snapshot.players[1].abilityCooldowns[1] > 0 && <small>{Math.ceil(snapshot.players[1].abilityCooldowns[1] / 1000)}</small>}
        </button>
        <WeaponButtons playerId={2} player={snapshot.players[1]} active={isPlaying} onActivate={(weapon) => handleRef.current?.activateWeapon(2, weapon)} />
        <AmmoHud player={snapshot.players[1]} color="pink" />
      </div>
    </div>

    {(snapshot.status === 'MENU' || isPaused || snapshot.status === 'WON' || snapshot.status === 'LOST') && <div className={styles.overlay}>
      {snapshot.status === 'MENU' && <section className={`${styles.card} ${styles.menuCard}`}>
        <span className={styles.eyebrow}>CO-OP ARCADE · 2 NGƯỜI</span>
        <h1>RỪNG SĂN <em>QUÁI</em></h1>
        <p>Bắn quái 2 phút 30 giây rồi hạ boss. Quái có 3% rơi tim; từ màn 2, quái có thể rơi pháo hoặc súng băng, mỗi loại 1%. Hạ boss rơi 2 tim, nhặt đủ để qua màn.</p>
        <div className={styles.menuStats}><span><Heart size={16} /> 6 tim mỗi người</span><span><Crosshair size={16} /> Ngắm riêng</span></div>
        <div className={styles.difficultyPicker} aria-label="Chọn độ khó">
          {([['easy', 'DỄ', 'Quái ít máu'], ['normal', 'VỪA', 'Sức mạnh cân bằng'], ['hard', 'KHÓ', 'Quái nhiều máu']] as const).map(([difficulty, label, description]) => <button type="button" key={difficulty} className={selectedDifficulty === difficulty ? styles.difficultySelected : ''} onClick={() => setSelectedDifficulty(difficulty)} aria-pressed={selectedDifficulty === difficulty}><b>{label}</b><small>{description}</small></button>)}
        </div>
        {DEV_TEST && <div className={styles.modePicker} aria-label="Chọn chế độ thử">
          <button type="button" className={selectedMode === 'SURVIVAL' ? styles.modeSelected : ''} onClick={() => setSelectedMode('SURVIVAL')} aria-pressed={selectedMode === 'SURVIVAL'}><b>SINH TỒN</b><small>Chơi đủ thời gian rồi đánh boss</small></button>
          <button type="button" className={selectedMode === 'BOSS_TEST' ? styles.modeSelected : ''} onClick={() => setSelectedMode('BOSS_TEST')} aria-pressed={selectedMode === 'BOSS_TEST'}><b>BOSS TEST</b><small>Vào boss ngay, hạ boss để qua màn</small></button>
        </div>}
        <div className={styles.connectionChoices}>
          <span className={controllerConnected[0] ? styles.online : ''}><i /> P1 {controllerConnected[0] ? 'ĐÃ KẾT NỐI' : 'CHỜ ĐIỆN THOẠI'}</span>
          <span className={controllerConnected[1] ? styles.onlinePink : ''}><i /> P2 {controllerConnected[1] ? 'ĐÃ KẾT NỐI' : 'CHỜ ĐIỆN THOẠI'}</span>
        </div>
        <button type="button" className={styles.primaryButton} disabled={!canStart} onClick={startRun}><Play size={19} fill="currentColor" /> BẮT ĐẦU CHƠI</button>
        <button type="button" className={styles.secondaryButton} onClick={() => pairingSession ? openPairing() : void createPairingSession()}><QrCode size={18} /> KẾT NỐI HAI ĐIỆN THOẠI</button>
        {DEV_TEST && <button type="button" className={styles.devButton} onClick={startRun}>DEV TEST · CHƠI TRÊN PC</button>}
        <small className={styles.startHint}>{hasBothPlayers ? 'Đủ hai người chơi — sẵn sàng vào rừng!' : DEV_TEST ? 'Kết nối điện thoại hoặc thử bằng chuột và bàn phím.' : 'Quét đủ hai mã QR để bắt đầu.'}</small>
        {pairingError && !pairingOpen && <small className={styles.pairingError}>{pairingError}</small>}
      </section>}
      {isPaused && <section className={`${styles.card} ${styles.resultCard}`}><span className={styles.eyebrow}>TẠM DỪNG</span><h2>DỪNG CHÂN MỘT CHÚT</h2><button className={styles.primaryButton} onClick={togglePause}><Play size={18} fill="currentColor" /> TIẾP TỤC</button><button className={styles.secondaryButton} onClick={() => { handleRef.current?.startRun() }}><RotateCcw size={17} /> CHƠI LẠI MÀN</button></section>}
      {(snapshot.status === 'WON' || snapshot.status === 'LOST') && <section className={`${styles.card} ${styles.resultCard}`}>
        <div className={`${styles.resultIcon} ${snapshot.status === 'WON' ? styles.resultWon : styles.resultLost}`}>{snapshot.status === 'WON' ? <Trophy size={28} /> : <Heart size={28} />}</div>
        <span className={styles.eyebrow}>MÀN {snapshot.stage} · KẾT QUẢ</span><h2>{snapshot.status === 'WON' ? `${snapshot.bossName.toLocaleUpperCase('vi-VN')} ĐÃ BỊ HẠ!` : 'CẢ ĐỘI ĐÃ KIỆT SỨC!'}</h2>
        <p>{snapshot.status === 'WON' ? `Boss màn ${snapshot.stage + 1} đang chờ trong rừng.` : 'Hãy chọn độ khó và thử lại nhé.'}</p>
        <div className={styles.resultScores}>{snapshot.players.map((player) => <div key={player.playerId} className={player.playerId === 1 ? styles.scoreBlue : styles.scorePink}><b>P{player.playerId}</b><strong>{player.score.toLocaleString('vi-VN')}</strong><small>{player.kills} quái hạ</small></div>)}</div>
        {snapshot.status === 'WON' ? <button className={styles.primaryButton} onClick={advanceStage}><Play size={18} fill="currentColor" /> VÀO MÀN {snapshot.stage + 1}</button> : <button className={styles.primaryButton} onClick={startRun}><RotateCcw size={18} /> CHƠI LẠI</button>}
      </section>}
    </div>}

    {pairingOpen && <div className={styles.pairingShade} onMouseDown={(event) => { if (event.target === event.currentTarget) closePairing() }}>
      <section className={styles.pairingCard} role="dialog" aria-modal="true" aria-labelledby="pairing-title">
        <div className={styles.pairingHead}><div><span className={styles.eyebrow}>CHƠI CÙNG BẠN · MẠNG LAN</span><h2 id="pairing-title">KẾT NỐI HAI TAY CẦM</h2></div><button type="button" onClick={closePairing} aria-label="Đóng"><X size={20} /></button></div>
        {!pairingSession ? <div className={styles.pairingUnavailable}><Wifi size={29} /><p>{pairingError || 'Tạo phiên riêng để hiện mã QR cho hai người chơi.'}</p>{!lanReady && <code>npm run dev:lan</code>}<button className={styles.primaryButton} onClick={() => void createPairingSession()}><QrCode size={17} /> TẠO PHIÊN LAN</button></div> : <>
          <p className={styles.pairingIntro}>Hai điện thoại cần dùng cùng Wi-Fi với máy tính. Mỗi người quét đúng mã của mình.</p>
          <div className={styles.qrGrid}>{([1, 2] as const).map((playerId) => <div className={`${styles.qrPlayer} ${playerId === 1 ? styles.qrBlue : styles.qrPink}`} key={playerId}>
            <div className={styles.qrPlayerHead}><strong>P{playerId}</strong><span className={controllerConnected[playerId - 1] ? styles.onlineText : ''}>{controllerConnected[playerId - 1] ? 'ĐÃ KẾT NỐI' : 'ĐANG CHỜ'}</span></div>
            {qrCodes[playerId - 1] ? <Image src={qrCodes[playerId - 1]} alt={`QR kết nối người chơi P${playerId}`} width={154} height={154} unoptimized /> : <div className={styles.qrPlaceholder}>Đang tạo mã…</div>}
            <small>Quét để mở tay cầm P{playerId}</small>
          </div>)}</div>
          {pairingSession.addresses.length > 1 && <label className={styles.addressSelect}>Địa chỉ PC<select value={selectedAddress} onChange={(event) => setSelectedAddress(event.target.value)}>{pairingSession.addresses.map((item) => <option key={item.address} value={item.address}>{item.address} · {item.interfaceName}</option>)}</select></label>}
          {pairingSession.addresses.length === 0 && <p className={styles.pairingError}>Không tìm thấy địa chỉ Wi-Fi/LAN riêng trên máy tính.</p>}
          <div className={styles.pairingSteps}><span>1 · Kết nối cùng Wi-Fi</span><span>2 · Quét mã P1 và P2</span><span>3 · Nhấn BẮT ĐẦU</span></div>
        </>}
        {pairingError && pairingSession && <p className={styles.pairingError}>{pairingError}</p>}
        <div className={styles.qrInstructions}>
          <span><b>Chuột</b> ngắm · <b>Giữ chuột trái</b> bắn P1</span>
          <span><b>Mũi tên</b> ngắm P1 · <b>I J K L</b> ngắm P2 · <b>Enter</b> bắn P2</span>
          <span><b>Q</b> lửa · <b>E</b> đóng băng</span>
          <span>Súng rơi từ màn 2: bắn để nhặt · <b>Z / X</b> cho P1 · <b>N / M</b> cho P2</span>
        </div>
        <div className={styles.pairingFooter}><span className={`${styles.connectionLight} ${hasBothPlayers ? styles.connectionLightOn : ''}`} />{hasBothPlayers ? 'HAI TAY CẦM ĐÃ SẴN SÀNG' : `${Number(controllerConnected[0]) + Number(controllerConnected[1])}/2 ĐIỆN THOẠI ĐÃ KẾT NỐI`}{pairingSession && <button onClick={() => void createPairingSession()}><RotateCcw size={14} /> TẠO MÃ KHÁC</button>}{snapshot.status === 'MENU' && hasBothPlayers && <button className={styles.modalStart} onClick={() => { closePairing(); startRun() }}><Play size={14} fill="currentColor" /> BẮT ĐẦU</button>}</div>
      </section>
    </div>}
  </main>
}

function PlayerHud({ player, color, connected }: { player: HuntSnapshot['players'][number]; color: 'blue' | 'pink'; connected: boolean }) {
  const panelClass = color === 'blue' ? styles.playerBlue : styles.playerPink
  return <div className={`${styles.playerHud} ${panelClass}`}>
    <div className={styles.avatar}><span>{color === 'blue' ? '🧢' : '🎀'}</span></div>
    <div className={styles.playerInfo}><div className={styles.nameLine}><strong><i className={`${styles.connectionDot} ${connected ? styles.connectionDotOn : ''}`} aria-label={connected ? 'Đã kết nối' : 'Chưa kết nối'} />P{player.playerId}</strong><div className={styles.hearts}>{Array.from({ length: MAX_PLAYER_HEARTS }, (_, heart) => <Heart key={heart} size={24} fill={heart < player.hp ? 'currentColor' : 'transparent'} />)}</div></div>
      <div className={styles.healthTrack}><i style={{ width: `${Math.max(0, player.health / player.maxHealth * 100)}%` }} /></div>
      <div className={styles.scoreLine}><span>Điểm: <b>{player.score.toLocaleString('vi-VN')}</b></span>{player.combo > 1 && <em>Combo x{player.combo}</em>}</div>
    </div>
  </div>
}

function AmmoHud({ player, color }: { player: HuntSnapshot['players'][number]; color: 'blue' | 'pink' }) {
  return <div className={`${styles.ammoHud} ${color === 'blue' ? styles.ammoBlue : styles.ammoPink}`}>
    <div className={styles.bulletStack}>{Array.from({ length: 4 }, (_, index) => <i key={index} className={index < Math.ceil(player.ammo / 8) ? '' : styles.bulletEmpty} />)}</div>
    <strong>{player.reloadRemaining > 0 ? 'NẠP…' : `${player.ammo}/${player.maxAmmo}`}</strong>
    {player.reloadRemaining > 0 && <small>{(player.reloadRemaining / 1000).toFixed(1)}s</small>}
  </div>
}

function WeaponButtons({ playerId, player, active, onActivate }: { playerId: 1 | 2; player: HuntSnapshot['players'][number]; active: boolean; onActivate: (weapon: WeaponMode) => void }) {
  return <div className={styles.weaponChoices}>
    {([['cannon', '/games/control-2d-2players/weapon-cannon.png', 'PHÁO'], ['ice', '/games/control-2d-2players/weapon-ice.png', 'BĂNG']] as const).map(([weapon, src, label]) => <button type="button" key={weapon} className={`${styles.weaponButton} ${player.weaponMode === weapon ? styles.weaponActive : ''}`} disabled={!active || player.hp <= 0 || player.weaponMode !== null || player.weaponInventory[weapon] <= 0} onClick={() => onActivate(weapon)} title={weapon === 'cannon' ? 'Pháo đạn lớn, bắn nhanh trong 10 giây' : 'Đạn băng gây sát thương gấp đôi trong 10 giây'} aria-label={`P${playerId}: dùng súng ${label.toLocaleLowerCase('vi-VN')} trong 10 giây, còn ${player.weaponInventory[weapon]} lượt`}>
      <Image src={src} alt="" width={44} height={36} />
      <span>{player.weaponMode === weapon ? `${Math.ceil(player.weaponRemaining / 1000)}s` : `${label} ×${player.weaponInventory[weapon]}`}</span>
    </button>)}
  </div>
}

