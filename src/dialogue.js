export const dateDialogue = [
  {
    character: 'date',
    speaker: 'Your date',
    text: 'I was going to ask if you wanted to stay for dessert.',
    options: [
      { label: 'Ask what he made' },
      {
        label: 'Turn the music up',
        setback: { key: 'entry', value: 2, text: 'The music drowned out the first knocks. You’ll have two fewer seconds before the breach.' },
      },
    ],
  },
  {
    character: 'date',
    speaker: 'Your date',
    text: 'You hear that? I thought we were the only ones out here.',
    options: [
      {
        label: 'Open the front door',
        setback: { key: 'entry', value: 2, text: 'Something yanked the door before I could shut it. The damaged deadbolt costs you two seconds.' },
      },
      { label: 'Stay quiet and listen' },
    ],
  },
  {
    character: 'date',
    speaker: 'Your date · From the hallway',
    offscreen: true,
    text: 'If that balcony sticks, the release pin is in the sideboard. Top drawer.',
    options: [
      { label: 'Remember where the pin is' },
      {
        label: 'Try forcing the latch',
        setback: { key: 'latch', value: 1, text: 'I bent the latch. Even with the pin, it’ll take one extra second to open.' },
      },
    ],
  },
  {
    character: 'heroine',
    speaker: 'You · Thinking',
    text: 'The power cut. He’s gone. I can barely see the front door.',
    options: [
      {
        label: 'Blow out the candle',
        setback: { key: 'darkness', value: .12, text: 'The wick won’t relight. The apartment will be darker during this run.' },
      },
      { label: 'Leave it lit and get up' },
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
