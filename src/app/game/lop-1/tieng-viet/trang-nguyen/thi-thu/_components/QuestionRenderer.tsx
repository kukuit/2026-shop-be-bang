'use client'

import type { ExamQuestion, ExamAnswer } from '../_exam/types'
import CategorizeQuestion from './renderers/CategorizeQuestion'
import ClassificationDragDropRenderer from './renderers/ClassificationDragDropRenderer'
import AlphabetOrderQuestion from './renderers/AlphabetOrderQuestion'
import VehicleOrderQuestion from './renderers/VehicleOrderQuestion'
import CountLetterInputQuestion from './renderers/CountLetterInputQuestion'
import DragMatchQuestion from './renderers/DragMatchQuestion'
import HiddenLetterInputQuestion from './renderers/HiddenLetterInputQuestion'
import RotatedLetterInputQuestion from './renderers/RotatedLetterInputQuestion'
import DragToSlotQuestion from './renderers/DragToSlotQuestion'
import DragFillQuestion from './renderers/DragFillQuestion'
import LetterInputQuestion from './renderers/LetterInputQuestion'
import MatchingQuestion from './renderers/MatchingQuestion'
import MultiSelectQuestion from './renderers/MultiSelectQuestion'
import NumberInputQuestion from './renderers/NumberInputQuestion'
import SelectInputQuestion from './renderers/SelectInputQuestion'
import SingleChoiceQuestion from './renderers/SingleChoiceQuestion'
import SortingQuestion from './renderers/SortingQuestion'
import TextInputQuestion from './renderers/TextInputQuestion'
import VideoSelectQuestion from './renderers/VideoSelectQuestion'
import AnimatedSelectQuestion from './renderers/AnimatedSelectQuestion'

export type QuestionRendererProps = {
  question: ExamQuestion
  answer?: ExamAnswer
  disabled: boolean
  playingId: string | null
  audioVolume?: number
  onAudioVolumeChange?(volume: number): void
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
      if (props.question.data?.generator === 'FILL_LETTER_IN_BLANK') return <LetterInputQuestion {...props} />
      return <TextInputQuestion {...props} />
    case 'hidden-letter-input':
      return <HiddenLetterInputQuestion {...props} />
    case 'rotated-letter-input':
      return <RotatedLetterInputQuestion {...props} />
    case 'number-input':
      if (props.question.data?.generator === 'COUNT_TARGET_LETTER') return <CountLetterInputQuestion {...props} />
      return <NumberInputQuestion {...props} />
    case 'matching':
      return <MatchingQuestion {...props} />
    case 'drag-match':
      return <DragMatchQuestion {...props} />
    case 'categorize':
      if (props.question.data?.generator === 'CLASSIFY_NUMBER_AND_LETTER' || props.question.data?.generator === 'CLASSIFY_CATEGORY_PAIRS')
        return <ClassificationDragDropRenderer {...props} />
      return <CategorizeQuestion {...props} />
    case 'sorting':
      if (props.question.data?.generator === 'ORDER_VIETNAMESE_ALPHABET') return <AlphabetOrderQuestion {...props} />
      if (props.question.data?.generator === 'ORDER_VEHICLES') return <VehicleOrderQuestion {...props} />
      return <SortingQuestion {...props} />
    case 'select-input':
      return <SelectInputQuestion {...props} />
    case 'video-select':
      return <VideoSelectQuestion {...props} />
    case 'animated-select':
      return <AnimatedSelectQuestion {...props} />
    case 'drag-to-slot':
      return <DragToSlotQuestion {...props} />
    case 'drag-fill':
      return <DragFillQuestion {...props} />
  }
}
