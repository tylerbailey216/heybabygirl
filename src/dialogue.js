export const dateDialogue = [
  {
    character: 'date',
    speaker: 'Your date',
    text: 'Everyone else called it a night. Did you hear that knock a minute ago?',
    options: [
      { label: 'Stay quiet and listen', music: 'quiet' },
      {
        label: 'Crank the music back up',
        music: 'loud',
        setback: { key: 'entry', value: .65, text: 'I felt the door shudder through the floor. The deadbolt sounded loose.' },
      },
    ],
  },
  {
    character: 'date',
    speaker: 'Your date · From the hallway',
    offscreen: true,
    text: 'If the balcony sticks, the release pin is in the sideboard. Top drawer.',
    options: [
      {
        label: 'Force the latch',
        setback: { key: 'latch', value: 1, text: 'I bent it. Even with the pin, it’ll take one extra second to open.' },
      },
      { label: 'Remember where the pin is' },
    ],
  },
  {
    character: 'date',
    speaker: 'Your date',
    text: 'You look like you’ve seen a ghost. Here, have a sip.',
    options: [
      {
        label: 'Put out the candle first',
        setback: { key: 'darkness', value: .12, text: 'The wick won’t relight. The room looks different without it.' },
      },
      { label: 'Take a sip' },
    ],
  },
]

export const streetDialogue = [
  {
    speaker: 'Street level',
    text: 'Your phone vibrates. The street looks empty.',
    options: [
      { label: 'Check the phone', trap: true },
      { label: 'Leave the phone dark' },
    ],
  },
  {
    character: 'date',
    speaker: 'Your date’s voice · From above',
    text: '“Hey, baby girl. Look at me.”',
    options: [
      { label: 'Answer the voice', setback: 'It answered in his voice. Then the streetlights went out.' },
      { label: 'Look up without answering' },
    ],
  },
]
