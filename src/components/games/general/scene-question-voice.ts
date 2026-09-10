import { getVoiceChannel } from './VoiceChannel'
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
    const channel = getVoiceChannel(scene.sound)
    const updateBlocked = () => current.setBlocked(muted || paused || channel.busy)
    const unsubscribe = channel.subscribe(updateBlocked)
    const onMute = (value: boolean) => { muted = value; updateBlocked() }
    const onPause = (value: boolean) => { paused = value; updateBlocked() }
    const onRestart = () => current.stop()
    scene.game.events.on('game-ui:mute', onMute)
    scene.game.events.on('game-ui:pause', onPause)
    scene.game.events.on('game-ui:restart', onRestart)
    scene.events.once('shutdown', () => {
      unsubscribe()
      current.stop()
      scene.game.events.off('game-ui:mute', onMute)
      scene.game.events.off('game-ui:pause', onPause)
      scene.game.events.off('game-ui:restart', onRestart)
      players.delete(scene)
    })
    updateBlocked()
    players.set(scene, player)
  }
  player.play([question.instructionVoice, question.voice])
}

export function stopQuestionVoice(scene: Phaser.Scene) {
  players.get(scene)?.stop()
}
