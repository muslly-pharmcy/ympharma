export interface SeedanceCharacter {
  name: string
  role: string
  visualStyle: string
}

export interface SeedanceShot {
  shotType: string
  cameraMovement: string
  lighting: string
  aspectRatio: string
  durationSeconds: number
}

export interface DramaScriptInput {
  title: string
  genre: string
  logline: string
  characters: SeedanceCharacter[]
  sceneDescription: string
  shots: SeedanceShot[]
}

export interface SeedancePromptOutput {
  stage: string
  frameLockHash: string
  formattedSeedancePrompt: string
}

function frameLock(seed: string): string {
  let h1 = 0x811c9dc5
  let h2 = 0x1000193
  for (let i = 0; i < seed.length; i++) {
    const c = seed.charCodeAt(i)
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0
    h2 = Math.imul(h2 + c, 0x85ebca6b) >>> 0
  }
  return `FL-${h1.toString(16).padStart(8, '0')}${h2.toString(16).padStart(8, '0')}`.toUpperCase()
}

export const SeedanceEngine = {
  generateCinematicPrompt(input: DramaScriptInput): SeedancePromptOutput {
    const shot = input.shots[0]
    const cast = input.characters.length
      ? input.characters
          .map((c) => `${c.name} (${c.role}) — ${c.visualStyle}`)
          .join('; ')
      : 'Single unnamed protagonist, photoreal cinematic styling'

    const lines = [
      `[SCENE] ${input.title}`,
      `[GENRE] ${input.genre}`,
      `[LOGLINE] ${input.logline}`,
      `[CAST] ${cast}`,
      `[ACTION] ${input.sceneDescription}`,
      shot &&
        `[CAMERA] ${shot.shotType}, ${shot.cameraMovement}, ${shot.lighting}`,
      shot && `[FORMAT] ${shot.aspectRatio}, ${shot.durationSeconds}s, 24fps`,
      `[RENDER] Ultra-detailed cinematic film still motion, shallow depth of field, volumetric light, filmic color grade, natural micro-expressions, consistent character identity across frames`,
      `[NEGATIVE] distorted faces, extra limbs, text overlays, watermark, jitter, morphing identity`,
    ].filter(Boolean) as string[]

    const formattedSeedancePrompt = lines.join('\n')

    return {
      stage: 'FRAME_LOCKED_V2',
      frameLockHash: frameLock(
        `${input.title}|${input.genre}|${input.sceneDescription}|${cast}|${shot?.shotType ?? ''}`,
      ),
      formattedSeedancePrompt,
    }
  },
}
