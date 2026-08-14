export class ScoreSystem {
  private value = 0

  correct() {
    this.value += 10
    return this.value
  }

  wrong() {
    const previousValue = this.value
    this.value = Math.max(0, this.value - 2)
    return {
      score: this.value,
      deducted: this.value < previousValue,
    }
  }

  reset() {
    this.value = 0
  }

  get current() {
    return this.value
  }
}
