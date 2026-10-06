'use client'

import type { ExamQuestion, ExamAnswer } from '../_exam/types'
import CategorizeQuestion from './renderers/CategorizeQuestion'
import DragToSlotQuestion from './renderers/DragToSlotQuestion'
import MatchingQuestion from './renderers/MatchingQuestion'
import MultiSelectQuestion from './renderers/MultiSelectQuestion'
import NumberInputQuestion from './renderers/NumberInputQuestion'
import SelectInputQuestion from './renderers/SelectInputQuestion'
import SingleChoiceQuestion from './renderers/SingleChoiceQuestion'
import SortingQuestion from './renderers/SortingQuestion'
import TextInputQuestion from './renderers/TextInputQuestion'
import VideoSelectQuestion from './renderers/VideoSelectQuestion'

export type QuestionRendererProps = {
  question: ExamQuestion
  answer?: ExamAnswer
  disabled: boolean
  playingId: string | null
  onAnswer(questionId: string, answer: ExamAnswer): void
  onPlayAudio(id: string, src: string | readonly string[]): void
}

export default function QuestionRenderer(props: QuestionRendererProps) {
  switch (props.question.type) {
    case 'single-choice':
    case 'image-choice':
    case 'audio-choice':
      return <SingleChoiceQuestion {...props} />
    case 'multi-select':
      return <MultiSelectQuestion {...props} />
    case 'text-input':
      return <TextInputQuestion {...props} />
    case 'number-input':
      return <NumberInputQuestion {...props} />
    case 'matching':
      return <MatchingQuestion {...props} />
    case 'categorize':
      return <CategorizeQuestion {...props} />
    case 'sorting':
      return <SortingQuestion {...props} />
    case 'select-input':
      return <SelectInputQuestion {...props} />
    case 'video-select':
      return <VideoSelectQuestion {...props} />
    case 'drag-to-slot':
      return <DragToSlotQuestion {...props} />
  }
}
