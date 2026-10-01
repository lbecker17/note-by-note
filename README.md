# Note by Note

Singing lessons with live pitch feedback, in your own key.

Open **https://lbecker17.github.io/note-by-note/** in Safari on your iPhone, then tap Share → **Add to Home Screen**.

## What's in it

- **Range test.** Sing a low and a high note. Every lesson then moves into your key.
- **Live pitch lane.** Target notes scroll past a line. Your voice draws over them and each note lights up in its colour as you hit it.
- **Lessons.** Match a note, long holds, steps, scales, leaps, arpeggios, minor, an echo game with new tunes each time, sirens and staccato.
- **Daily warmup.** About three minutes, with a weekly streak.
- **Songs.** Public-domain songs with lyrics and piano: learn them line by line, then sing them through.
- **Results.** Score, average miss in cents, whether you lean flat or sharp, and a "Copy results for Claude" button for coaching.

## Good to know

- Nothing you sing is recorded or sent anywhere. Pitch detection runs on the phone.
- Progress is stored on the device only. A run only counts toward your streak and best scores if the mic heard you for at least a fifth of the singing time.
- Headphones let you hear the guide note while you sing. Without them, you hear each part first, then sing it back.
- Works offline once it has loaded.

Plain HTML, CSS and JavaScript. No build step.
Tests for the tune engine (`js/tune.js`) run with `node --test tests/` (Node 22 or later, nothing to install).
