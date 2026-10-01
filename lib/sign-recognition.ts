/**
 * lib/sign-recognition.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Layer 1 — MediaPipe HandLandmarker (21 keypoints, runs in browser WASM)
 * Layer 2 — Custom Random Forest loaded from public/models/model.json
 * Layer 3 — Geometric heuristic fallbacks (open palm, fist, finger count)
 *
 * Runs entirely client-side. No server. No API key needed for detection.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  HandLandmarker,
  FaceLandmarker,
  FilesetResolver,
  type HandLandmarkerResult,
  type FaceLandmarkerResult,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision'

// Suppress internal TFLite C++ informational logs written to stderr from triggering Next.js dev overlay
if (typeof window !== 'undefined') {
  const _origConsoleError = console.error
  console.error = (...args: unknown[]) => {
    const msg = typeof args[0] === 'string' ? args[0] : ''
    if (
      msg.includes('INFO: Created TensorFlow Lite') ||
      msg.includes('XNNPACK delegate') ||
      msg.includes('TensorFlow Lite XNNPACK')
    ) {
      console.info(...args)
      return
    }
    _origConsoleError.apply(console, args)
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type GestureSource = 'model' | 'heuristic'

export const FACE_BLENDSHAPES = [
  'jawOpen',          // index 63
  'browInnerUp',      // index 64
  'browDownLeft',     // index 65
  'browDownRight',    // index 66
  'eyeWideLeft',      // index 67
  'eyeWideRight',     // index 68
  'mouthPucker',      // index 69
  'mouthSmileLeft',   // index 70
  'mouthSmileRight',  // index 71
  'mouthFrownLeft',   // index 72
  'mouthFrownRight',  // index 73
  'cheekPuff',        // index 74
] as const

export type FaceBlendshapeName = (typeof FACE_BLENDSHAPES)[number]

export interface DetectedGesture {
  label: string          // e.g. "chest_pain"
  displayText: string    // e.g. "Chest pain"
  confidence: number     // 0–1
  source: GestureSource
  fingerCount?: number   // populated when source is heuristic finger-count
}

export interface FrameResult {
  gesture: DetectedGesture | null
  candidate: DetectedGesture | null
  landmarks: {
    left: NormalizedLandmark[] | null
    right: NormalizedLandmark[] | null
  }
  handsDetected: 0 | 1 | 2
  pendingConfidence: number   // 0–1 fill for the progress indicator
  faceBlendshapes?: Record<string, number> | null
  hasFace?: boolean
}

// ─── Random Forest Model ─────────────────────────────────────────────────────

interface RFNode {
  feature?: number
  threshold?: number
  left?: RFNode
  right?: RFNode
  leaf?: number
}

interface RFModel {
  type: string
  n_estimators: number
  n_features: number
  feature_names?: string[]
  labels: string[]
  trees: RFNode[]
}

// ─── Internal state ───────────────────────────────────────────────────────────

let _landmarker: HandLandmarker | null = null
let _faceLandmarker: FaceLandmarker | null = null
let _model: RFModel | null = null
let _isInitialising = false

// Debounce & timestamp state
let _holdLabel: string | null = null
let _holdFrames = 0
let _lastTimestamp = -1
const HOLD_FRAMES_REQUIRED = 10   // 10 frames hold requirement (~330ms at 30fps)

// Module-level variable to store previous frame's landmarks (126 elements)
let prevLandmarks: number[] = new Array(126).fill(0)

// Human-readable display names for model labels
const DISPLAY_NAMES: Record<string, string> = {
  chest_pain:     'Chest pain',
  stomach_pain:   'Stomach pain',
  head_pain:      'Headache',
  breathless:     'Difficulty breathing',
  allergy:        'Allergy',
  medicine:       'Need medicine',
  help:           'Need help',
  fever:          'Fever',
  vomit:          'Nausea / Vomiting',
  dizzy:          'Feeling dizzy',
  bleeding:       'Bleeding',
  swelling:       'Swelling',
  nausea:         'Nausea',
  cough:          'Coughing',
  weakness:       'Feeling weak / tired',
  diabetes:       'Diabetes',
  blood_pressure: 'Blood pressure issue',
  water:          'Need water',
  toilet:         'Need toilet',
  sleep:          'Can\'t sleep',
  eat:            'Need to eat',
  no_appetite:    'No appetite',
  itching:        'Itching',
  injury:         'Injury',
  anxiety:        'Anxiety',
  im_ok:          'I\'m okay',
  need_help:      'Need help',
}

// ─── Initialisation ───────────────────────────────────────────────────────────

export async function initRecognizers(): Promise<void> {
  if (_landmarker && _model) return
  if (_isInitialising) return
  _isInitialising = true

  try {
    // Load MediaPipe WASM
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    )

    // Hand Landmarker (21 3D keypoints)
    _landmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 2,                // dual-hand detection for 144-feature model
      minHandDetectionConfidence: 0.6,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    })

    // Face Landmarker (multimodal blendshapes extension)
    try {
      _faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputFaceBlendshapes: true,
      })
      console.log('[ISL] FaceLandmarker loaded for multimodal facial blendshapes')
    } catch (gpuErr) {
      try {
        _faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'CPU',
          },
          runningMode: 'VIDEO',
          numFaces: 1,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
          outputFaceBlendshapes: true,
        })
        console.log('[ISL] FaceLandmarker loaded on CPU fallback')
      } catch (cpuErr) {
        console.warn('[ISL] FaceLandmarker unavailable — falling back silently to hand-only classification:', cpuErr)
        _faceLandmarker = null
      }
    }

    // Load custom Random Forest model
    try {
      const res = await fetch('/models/model.json')
      const contentType = res.headers.get('content-type') || ''
      if (res.ok && (contentType.includes('application/json') || !contentType.includes('text/html'))) {
        const text = await res.text()
        if (text.trim().startsWith('{')) {
          _model = JSON.parse(text) as RFModel
          console.log(
            `[ISL] Custom model loaded: ${_model.n_estimators} trees, ${_model.n_features} features, ${_model.labels.length} signs`
          )
        } else {
          console.warn('[ISL] model.json returned non-JSON content — falling back to heuristics')
        }
      } else {
        console.warn('[ISL] model.json not found — falling back to heuristics only')
      }
    } catch (modelErr) {
      console.warn('[ISL] Could not parse model.json:', modelErr)
    }
  } catch (err) {
    console.error('[ISL] Init error:', err)
  } finally {
    _isInitialising = false
  }
}

export function destroyRecognizers(): void {
  _landmarker?.close()
  _landmarker = null
  _faceLandmarker?.close()
  _faceLandmarker = null
  _model = null
  _holdLabel = null
  _holdFrames = 0
  _lastTimestamp = -1
  prevLandmarks = new Array(126).fill(0)
}

// ─── Two-Hand Landmark Extraction ─────────────────────────────────────────────

export function extractTwoHandLandmarks(result: HandLandmarkerResult): number[] {
  const left = new Array(63).fill(0)
  const right = new Array(63).fill(0)

  const handLandmarks = (result as any).handLandmarks ?? result.landmarks
  const handedness = result.handedness ?? (result as any).handednesses

  if (handLandmarks && handLandmarks.length > 0) {
    handLandmarks.forEach((landmarks: NormalizedLandmark[], idx: number) => {
      const rawCategory = handedness?.[idx]?.[0]?.categoryName
      // Fallback: if categoryName is missing, default single hand to Right, second to Left
      const handLabel = rawCategory ?? (idx === 0 ? 'Right' : 'Left')
      const coords: number[] = []
      landmarks.forEach((lm: NormalizedLandmark) => coords.push(lm.x, lm.y, lm.z))
      if (handLabel === 'Left') {
        left.splice(0, 63, ...coords)
      } else {
        right.splice(0, 63, ...coords)
      }
    })
  }
  return [...left, ...right] // 126 values
}

// ─── Random Forest inference ──────────────────────────────────────────────────

function walkTree(node: RFNode, features: number[]): number {
  if (node.leaf !== undefined) return node.leaf
  return features[node.feature!] <= node.threshold!
    ? walkTree(node.left!, features)
    : walkTree(node.right!, features)
}

function classifyWithModel(featureVector: number[]): DetectedGesture | null {
  if (!_model) return null

  const targetFeatures = _model.n_features ?? 144
  const features = [...featureVector]
  while (features.length < targetFeatures) features.push(0.0)
  if (features.length > targetFeatures) features.length = targetFeatures

  const votes = new Array<number>(_model.labels.length).fill(0)
  for (const tree of _model.trees) {
    votes[walkTree(tree, features)]++
  }

  const maxVotes   = Math.max(...votes)
  const winnerIdx  = votes.indexOf(maxVotes)
  const confidence = maxVotes / _model.n_estimators

  // Confidence threshold: 0.42 (allows gestures with neutral/absent face to be recognized; random noise max is 0.40)
  if (confidence < 0.42) return null

  const label = _model.labels[winnerIdx]
  return {
    label,
    displayText: DISPLAY_NAMES[label] ?? label.replace(/_/g, ' '),
    confidence,
    source: 'model',
  }
}

// ─── Semantic Clinical Gestures & Geometric Helpers (Layer 2.5) ─────────────

export interface FaceReferencePoint {
  x: number
  y: number
  z?: number
}

export interface FaceReferencePoints {
  top: FaceReferencePoint
  nose: FaceReferencePoint
  mouth: FaceReferencePoint
  chin: FaceReferencePoint
  leftCheek: FaceReferencePoint
  rightCheek: FaceReferencePoint
}

export const DEFAULT_FACE_REFERENCE: FaceReferencePoints = {
  top: { x: 0.5, y: 0.18, z: 0 },
  nose: { x: 0.5, y: 0.35, z: 0 },
  mouth: { x: 0.5, y: 0.46, z: 0 },
  chin: { x: 0.5, y: 0.54, z: 0 },
  leftCheek: { x: 0.38, y: 0.38, z: 0 },
  rightCheek: { x: 0.62, y: 0.38, z: 0 },
}

function dist(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function isFingerExtended(lm: NormalizedLandmark[], tip: number, pip: number, mcp: number): boolean {
  const dTip = dist(lm[tip], lm[0])
  const dMcp = dist(lm[mcp], lm[0])
  return lm[tip].y < lm[pip].y && dTip > dMcp
}

export function countExtendedFingers(lm: NormalizedLandmark[]): number {
  let count = 0
  const thumbExt = dist(lm[4], lm[5]) > 0.07 && dist(lm[4], lm[0]) > dist(lm[2], lm[0])
  if (thumbExt) count++
  const pairs: [number, number, number][] = [
    [8, 6, 5],
    [12, 10, 9],
    [16, 14, 13],
    [20, 18, 17],
  ]
  for (const [tip, pip, mcp] of pairs) {
    if (isFingerExtended(lm, tip, pip, mcp)) count++
  }
  return count
}

function isFist(lm: NormalizedLandmark[]): boolean {
  const indexCurled = lm[8].y > lm[6].y - 0.02 || dist(lm[8], lm[0]) < dist(lm[5], lm[0]) * 1.15
  const middleCurled = lm[12].y > lm[10].y - 0.02 || dist(lm[12], lm[0]) < dist(lm[9], lm[0]) * 1.15
  const ringCurled = lm[16].y > lm[14].y - 0.02 || dist(lm[16], lm[0]) < dist(lm[13], lm[0]) * 1.15
  const pinkyCurled = lm[20].y > lm[18].y - 0.02 || dist(lm[20], lm[0]) < dist(lm[17], lm[0]) * 1.15
  return indexCurled && middleCurled && ringCurled && pinkyCurled
}

function isThumbUp(lm: NormalizedLandmark[]): boolean {
  const thumbUp = lm[4].y < lm[3].y && lm[4].y < lm[2].y
  const higherThanOthers = lm[4].y < lm[8].y && lm[4].y < lm[12].y && lm[4].y < lm[16].y
  const othersCurled = isFist(lm)
  return thumbUp && higherThanOthers && othersCurled
}

function isOpenPalm(lm: NormalizedLandmark[]): boolean {
  return countExtendedFingers(lm) >= 4
}

function isIndexPointingUp(lm: NormalizedLandmark[]): boolean {
  const indexUp = lm[8].y < lm[6].y && lm[8].y < lm[5].y
  const middleCurled = lm[12].y > lm[10].y - 0.02
  const ringCurled = lm[16].y > lm[14].y - 0.02
  const pinkyCurled = lm[20].y > lm[18].y - 0.02
  return indexUp && middleCurled && ringCurled && pinkyCurled
}

/**
 * Deterministic Semantic Gesture Matcher for the 9 Clinical Signs:
 * 1. Headache: hands placed on top of head, palms down.
 * 2. Need Help: one hand thumbs up placed on flat palm of other hand.
 * 3. I'm OK: simple thumbs up, single hand.
 * 4. Cough: fist close to mouth.
 * 5. Fever: back of fingers touching cheek.
 * 6. Dizzy: rotating hand with index finger pointing upwards alongside head.
 * 7. Chest Pain: hands / palms on chest widespread.
 * 8. Injury: drifting hand over other forearm.
 * 9. Nausea / Vomiting: fingers pointed towards chest moving up & down.
 */
export function detectSemanticGesture(
  left: NormalizedLandmark[] | null,
  right: NormalizedLandmark[] | null,
  deltas: number[],
  face: FaceReferencePoints
): DetectedGesture | null {
  const hasLeft = Boolean(left && left.length > 0 && left.some(p => p.x !== 0 || p.y !== 0))
  const hasRight = Boolean(right && right.length > 0 && right.some(p => p.x !== 0 || p.y !== 0))
  const handsCount = (hasLeft ? 1 : 0) + (hasRight ? 1 : 0)

  if (handsCount === 0) return null

  const primaryHand = right ?? left!

  // 1. HEADACHE: Both hands on top of head, palms down
  if (hasLeft && hasRight) {
    const wristsNearTop = left![0].y < 0.35 && right![0].y < 0.35
    const nearHeadCenter = Math.abs(left![0].x - right![0].x) < 0.55
    if (wristsNearTop && nearHeadCenter) {
      return {
        label: 'head_pain',
        displayText: 'Headache',
        confidence: 0.94,
        source: 'heuristic',
      }
    }
  } else if (primaryHand) {
    const onCrown = primaryHand[0].y < 0.26 && primaryHand[12].y < 0.22 &&
      Math.abs(primaryHand[0].x - face.top.x) < 0.16 && !isIndexPointingUp(primaryHand)
    if (onCrown) {
      return {
        label: 'head_pain',
        displayText: 'Headache',
        confidence: 0.90,
        source: 'heuristic',
      }
    }
  }

  // 2. NEED HELP: One hand Thumbs Up placed on flat palm of other hand
  if (hasLeft && hasRight) {
    const leftThumbUp = isThumbUp(left!)
    const rightThumbUp = isThumbUp(right!)
    const leftOpen = isOpenPalm(left!) || countExtendedFingers(left!) >= 3
    const rightOpen = isOpenPalm(right!) || countExtendedFingers(right!) >= 3

    const helpPair = (leftThumbUp && rightOpen) || (rightThumbUp && leftOpen)
    const wristsClose = dist(left![0], right![0]) < 0.38
    const palmsClose = dist(left![9], right![9]) < 0.32

    if (helpPair && (wristsClose || palmsClose)) {
      return {
        label: 'help',
        displayText: 'Need help',
        confidence: 0.95,
        source: 'heuristic',
      }
    }
  }

  // 3. I'M OKAY: Simple single-hand Thumbs Up
  if (handsCount === 1 || (hasLeft && hasRight && dist(left![0], right![0]) > 0.40)) {
    const thumbUpHand = (hasRight && isThumbUp(right!)) ? right! : ((hasLeft && isThumbUp(left!)) ? left! : null)
    if (thumbUpHand) {
      const notAtMouth = Math.abs(thumbUpHand[0].y - face.mouth.y) > 0.10
      const notAtHead = thumbUpHand[0].y > 0.28
      if (notAtMouth && notAtHead) {
        return {
          label: 'im_ok',
          displayText: "I'm okay",
          confidence: 0.95,
          source: 'heuristic',
        }
      }
    }
  }

  // 4. DIZZY: Rotating hand with index finger pointed upward alongside head
  for (const hand of [right, left]) {
    if (!hand) continue
    if (isIndexPointingUp(hand)) {
      const atTempleHeight = hand[0].y >= 0.10 && hand[0].y <= 0.44
      const alongsideHead = Math.abs(hand[0].x - face.nose.x) > 0.12 && hand[0].y < face.chin.y
      if (atTempleHeight && alongsideHead) {
        return {
          label: 'dizzy',
          displayText: 'Feeling dizzy',
          confidence: 0.92,
          source: 'heuristic',
        }
      }
    }
  }

  // 5. COUGH: Fist close to mouth
  for (const hand of [right, left]) {
    if (!hand) continue
    if (isFist(hand) && !isThumbUp(hand)) {
      const nearMouth = Math.abs(hand[0].x - face.mouth.x) < 0.12 && Math.abs(hand[0].y - face.mouth.y) < 0.09
      if (nearMouth) {
        return {
          label: 'cough',
          displayText: 'Coughing',
          confidence: 0.92,
          source: 'heuristic',
        }
      }
    }
  }

  // 6. FEVER: Touching the cheek with back of fingers
  for (const hand of [right, left]) {
    if (!hand) continue
    if (!isThumbUp(hand) && !isIndexPointingUp(hand)) {
      const atCheek = (dist(hand[0], face.leftCheek) < 0.14 || dist(hand[0], face.rightCheek) < 0.14 ||
        (Math.abs(hand[0].x - face.mouth.x) > 0.10 && hand[0].y >= 0.24 && hand[0].y <= 0.50))
      if (atCheek) {
        return {
          label: 'fever',
          displayText: 'Fever',
          confidence: 0.90,
          source: 'heuristic',
        }
      }
    }
  }

  // 7. INJURY: Drifting / stroking one hand over the other forearm
  if (hasLeft && hasRight) {
    const bothAtMidHeight = left![0].y >= 0.48 && right![0].y >= 0.48
    const overlappingY = Math.abs(left![0].y - right![0].y) < 0.22
    const overlappingX = Math.abs(left![0].x - right![0].x) < 0.35
    const neitherThumbUp = !isThumbUp(left!) && !isThumbUp(right!)
    const hasDriftingMotion = Math.abs(deltas[0]) > 0.007 || Math.abs(deltas[2]) > 0.007
    if (bothAtMidHeight && overlappingY && overlappingX && neitherThumbUp && hasDriftingMotion) {
      return {
        label: 'injury',
        displayText: 'Injury',
        confidence: 0.88,
        source: 'heuristic',
      }
    }
  }

  // 8. NAUSEA / VOMITING: Fingers pointed towards chest moving up & down
  for (const hand of [right, left]) {
    if (!hand) continue
    const atChestOrStomach = hand[0].y >= 0.48 && hand[0].y <= 0.88
    const verticalMotion = Math.abs(deltas[1]) > 0.010 || Math.abs(deltas[3]) > 0.010
    if (atChestOrStomach && verticalMotion) {
      return {
        label: 'vomit',
        displayText: 'Nausea / Vomiting',
        confidence: 0.88,
        source: 'heuristic',
      }
    }
  }

  // 9. CHEST PAIN: Hands / palms placed widespread on chest
  if (hasLeft && hasRight) {
    const leftOpen = isOpenPalm(left!)
    const rightOpen = isOpenPalm(right!)
    const bothAtChest = left![0].y >= 0.48 && right![0].y >= 0.48
    const handsSpread = Math.abs(left![0].x - right![0].x) > 0.16
    if (leftOpen && rightOpen && bothAtChest && handsSpread) {
      return {
        label: 'chest_pain',
        displayText: 'Chest pain',
        confidence: 0.92,
        source: 'heuristic',
      }
    }
  }
  if (primaryHand && isOpenPalm(primaryHand)) {
    const atChest = primaryHand[0].y >= 0.50 && primaryHand[0].y <= 0.88
    const centeredX = Math.abs(primaryHand[0].x - face.nose.x) < 0.22
    if (atChest && centeredX) {
      return {
        label: 'chest_pain',
        displayText: 'Chest pain',
        confidence: 0.88,
        source: 'heuristic',
      }
    }
  }

  return null
}

function classifyWithHeuristics(lm: NormalizedLandmark[]): DetectedGesture | null {
  const fingerCount = countExtendedFingers(lm)

  // Open palm (4–5 fingers extended) → help
  if (fingerCount >= 4) {
    return {
      label: 'help',
      displayText: 'Need help',
      confidence: 0.80,
      source: 'heuristic',
    }
  }

  // Fist (0–1 fingers) → pain
  if (fingerCount <= 1) {
    return {
      label: 'chest_pain',
      displayText: 'Pain',
      confidence: 0.72,
      source: 'heuristic',
    }
  }

  return null
}

// ─── Main public API ──────────────────────────────────────────────────────────

/**
 * Call this once per animation frame.
 * Returns the gesture only after it has been held for HOLD_FRAMES_REQUIRED (15) frames.
 * Note: landmarks now contains { left: NormalizedLandmark[] | null, right: NormalizedLandmark[] | null }
 * handsDetected: 0 | 1 | 2
 * pendingConfidence (0–1) is always returned so the UI can show a progress ring.
 * If face detection fails or is missing, falls back silently to hand-only features.
 */
export function classifyFrame(
  video: HTMLVideoElement,
  timestampMs: number,
  providedBlendshapes?: Record<string, number> | null
): FrameResult {
  if (!_landmarker || video.readyState < 2) {
    return {
      gesture: null,
      candidate: null,
      landmarks: { left: null, right: null },
      handsDetected: 0,
      pendingConfidence: 0,
      faceBlendshapes: null,
      hasFace: false,
    }
  }

  // Ensure strictly monotonically increasing timestamp for MediaPipe tasks
  const safeTimestamp = Math.max(timestampMs, _lastTimestamp + 1)
  _lastTimestamp = safeTimestamp

  // 1. Detect Hand landmarks
  let handResult: HandLandmarkerResult
  try {
    handResult = _landmarker.detectForVideo(video, safeTimestamp)
  } catch {
    return {
      gesture: null,
      candidate: null,
      landmarks: { left: null, right: null },
      handsDetected: 0,
      pendingConfidence: 0,
      faceBlendshapes: null,
      hasFace: false,
    }
  }

  // 2. Detect Face blendshapes and face reference points if not explicitly provided
  let faceBlendshapes: Record<string, number> | null = providedBlendshapes ?? null
  let faceReference: FaceReferencePoints = DEFAULT_FACE_REFERENCE
  if (providedBlendshapes === undefined && _faceLandmarker) {
    try {
      const faceResult = _faceLandmarker.detectForVideo(video, safeTimestamp)
      const categories = faceResult.faceBlendshapes?.[0]?.categories
      if (categories && categories.length > 0) {
        faceBlendshapes = {}
        for (const cat of categories) {
          faceBlendshapes[cat.categoryName] = cat.score
        }
      }
      if (faceResult.faceLandmarks && faceResult.faceLandmarks.length > 0 && faceResult.faceLandmarks[0].length >= 455) {
        const lms = faceResult.faceLandmarks[0]
        faceReference = {
          top: lms[10] ?? DEFAULT_FACE_REFERENCE.top,
          nose: lms[1] ?? DEFAULT_FACE_REFERENCE.nose,
          mouth: lms[13] ?? DEFAULT_FACE_REFERENCE.mouth,
          chin: lms[152] ?? DEFAULT_FACE_REFERENCE.chin,
          leftCheek: lms[234] ?? DEFAULT_FACE_REFERENCE.leftCheek,
          rightCheek: lms[454] ?? DEFAULT_FACE_REFERENCE.rightCheek,
        }
      }
    } catch {
      faceBlendshapes = null
    }
  }
  const hasFace = Boolean(faceBlendshapes)

  const handLandmarks = (handResult as any).handLandmarks ?? handResult.landmarks
  const handedness = handResult.handedness ?? (handResult as any).handednesses

  let leftLandmarks: NormalizedLandmark[] | null = null
  let rightLandmarks: NormalizedLandmark[] | null = null

  if (handLandmarks && handLandmarks.length > 0) {
    handLandmarks.forEach((landmarks: NormalizedLandmark[], idx: number) => {
      const rawCategory = handedness?.[idx]?.[0]?.categoryName
      const handLabel = rawCategory ?? (idx === 0 ? 'Right' : 'Left')
      if (handLabel === 'Left') {
        if (!leftLandmarks) leftLandmarks = landmarks
        else rightLandmarks = landmarks
      } else {
        if (!rightLandmarks) rightLandmarks = landmarks
        else leftLandmarks = landmarks
      }
    })
  }

  if (handLandmarks && handLandmarks.length > 0 && !leftLandmarks && !rightLandmarks) {
    rightLandmarks = handLandmarks[0]
    if (handLandmarks.length > 1) leftLandmarks = handLandmarks[1]
  }

  const handsDetected: 0 | 1 | 2 =
    leftLandmarks && rightLandmarks ? 2 : (leftLandmarks || rightLandmarks ? 1 : 0)

  if (handsDetected === 0) {
    _holdLabel = null
    _holdFrames = 0
    prevLandmarks = new Array(126).fill(0)
    return {
      gesture: null,
      candidate: null,
      landmarks: { left: null, right: null },
      handsDetected: 0,
      pendingConfidence: 0,
      faceBlendshapes,
      hasFace,
    }
  }

  // 3. Extract two-hand 126 coordinates
  const current126 = extractTwoHandLandmarks(handResult)

  // 4. Compute motion deltas (zero out if hand is absent in either frame)
  let delta_wx_L = current126[0] - prevLandmarks[0]
  let delta_wy_L = current126[1] - prevLandmarks[1]
  let delta_wx_R = current126[63] - prevLandmarks[63]
  let delta_wy_R = current126[64] - prevLandmarks[64]
  let delta_ix_R = current126[117] - prevLandmarks[117]
  let delta_iy_R = current126[118] - prevLandmarks[118]

  if (current126[0] === 0 || prevLandmarks[0] === 0) {
    delta_wx_L = 0
    delta_wy_L = 0
  }
  if (current126[63] === 0 || prevLandmarks[63] === 0) {
    delta_wx_R = 0
    delta_wy_R = 0
    delta_ix_R = 0
    delta_iy_R = 0
  }

  const deltas = [delta_wx_L, delta_wy_L, delta_wx_R, delta_wy_R, delta_ix_R, delta_iy_R]
  prevLandmarks = current126 // update for next frame

  // 5. Try Semantic Clinical Gestures First (Deterministic Priority Layer)
  let candidate = detectSemanticGesture(
    leftLandmarks,
    rightLandmarks,
    deltas,
    faceReference
  )

  // 6. If no explicit clinical sign matched, feed featureVector to Random Forest classifier
  if (!candidate) {
    const faceBlendshapes12 = FACE_BLENDSHAPES.map(
      key => faceBlendshapes?.[key] ?? 0.0
    )
    const featureVector = [...current126, ...deltas, ...faceBlendshapes12]
    candidate = classifyWithModel(featureVector)
  }

  // 7. Fallback heuristics if model not loaded
  const primaryHand = rightLandmarks ?? leftLandmarks
  if (!candidate && !_model && primaryHand) {
    candidate = classifyWithHeuristics(primaryHand)
  }

  if (!candidate) {
    _holdLabel = null
    _holdFrames = 0
    return {
      gesture: null,
      candidate: null,
      landmarks: { left: leftLandmarks, right: rightLandmarks },
      handsDetected,
      pendingConfidence: 0,
      faceBlendshapes,
      hasFace,
    }
  }

  // Debounce: must hold the same label for N frames
  if (candidate.label === _holdLabel) {
    _holdFrames++
  } else {
    _holdLabel = candidate.label
    _holdFrames = 1
  }

  const pendingConfidence = Math.min(_holdFrames / HOLD_FRAMES_REQUIRED, 1)

  if (_holdFrames < HOLD_FRAMES_REQUIRED) {
    return {
      gesture: null,
      candidate,
      landmarks: { left: leftLandmarks, right: rightLandmarks },
      handsDetected,
      pendingConfidence,
      faceBlendshapes,
      hasFace,
    }
  }

  // Confirmed — reset so the same sign doesn't re-fire immediately
  _holdFrames = 0

  return {
    gesture: candidate,
    candidate,
    landmarks: { left: leftLandmarks, right: rightLandmarks },
    handsDetected,
    pendingConfidence: 1,
    faceBlendshapes,
    hasFace,
  }
}

/**
 * Returns raw landmarks for the canvas drawing layer without running classification.
 * Useful if you want to draw the skeleton on every frame regardless of hold state.
 */
export function getHandLandmarks(
  video: HTMLVideoElement,
  timestampMs: number
): NormalizedLandmark[] | null {
  if (!_landmarker || video.readyState < 2) return null
  try {
    const result = _landmarker.detectForVideo(video, timestampMs)
    return result.landmarks?.[0] ?? null
  } catch {
    return null
  }
}

/**
 * Returns raw face blendshapes if available on the current frame.
 * Silently returns null if face is not detected or FaceLandmarker is unavailable.
 */
export function getFaceBlendshapes(
  video: HTMLVideoElement,
  timestampMs: number
): Record<string, number> | null {
  if (!_faceLandmarker || video.readyState < 2) return null
  try {
    const result = _faceLandmarker.detectForVideo(video, timestampMs)
    const categories = result.faceBlendshapes?.[0]?.categories
    if (!categories || categories.length === 0) return null
    const record: Record<string, number> = {}
    for (const cat of categories) {
      record[cat.categoryName] = cat.score
    }
    return record
  } catch {
    return null
  }
}
