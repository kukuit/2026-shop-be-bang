'use client'
import DragDropGame from '@/components/games/drag-drop/DragDropGame'
import { DRAG_CONFIG } from '../config'
import styles from './lesson.module.css'
export default function GameClient() { return <div className={styles.lesson}><DragDropGame config={DRAG_CONFIG} /></div> }
