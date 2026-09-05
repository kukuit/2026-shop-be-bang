import type Phaser from 'phaser'
import { QuestionVoicePlayer } from './QuestionVoicePlayer'

const players = new WeakMap<Phaser.Scene, QuestionVoicePlayer>()

export function playQuestionVoice(scene: Phaser.Scene, question: { instructionVoice?: string; voice?: string }) {
  let player = players.get(scene)
  if (!player) {
    player = new QuestionVoicePlayer()
    const current = player
    let muted = scene.sound.mute
    let paused = false
    const onMute = (value: boolean) => { muted = value; current.setBlocked(muted || paused) }
    const onPause = (value: boolean) => { paused = value; current.setBlocked(muted || paused) }
    const onRestart = () => current.stop()
    scene.game.events.on('game-ui:mute', onMute)
    scene.game.events.on('game-ui:pause', onPause)
    scene.game.events.on('game-ui:restart', onRestart)
    scene.events.once('shutdown', () => {
      current.stop()
      scene.game.events.off('game-ui:mute', onMute)
      scene.game.events.off('game-ui:pause', onPause)
      scene.game.events.off('game-ui:restart', onRestart)
      players.delete(scene)
    })
    current.setBlocked(muted)
    players.set(scene, player)
  }
  player.play([question.instructionVoice, question.voice])
}

export function stopQuestionVoice(scene: Phaser.Scene) {
  players.get(scene)?.stop()
}
