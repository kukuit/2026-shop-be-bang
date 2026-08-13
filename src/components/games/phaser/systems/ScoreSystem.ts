export class ScoreSystem {
  private value = 0

  correct() {
    this.value += 10
    return this.value
  }

  wrong() {
    this.value = Math.max(0, this.value - 2)
    return this.value
  }

  get current() {
    return this.value
  }
}
