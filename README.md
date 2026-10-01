# Note by Note

Singing lessons with live pitch feedback, in your own key.

Open **https://lbecker17.github.io/note-by-note/** in Safari on your iPhone, then tap Share → **Add to Home Screen**.

## What's in it

- **Three tabs.** Today (the daily warm-up, your week and what's next), Lessons (Start here, Pitch, Breath skills) and Songs.
- **Range test.** Sing a low and a high note, or pick a typical range (Child, Higher voice, Lower voice). The app shows your comfy notes (for example A3 to D5), with no voice-type labels, and every lesson then moves into your key.
- **Live pitch lane.** Target notes scroll past a line. Your voice draws over them and each note lights up in its colour as you hit it.
- **Lessons.** Match a note, long holds, steps, scales, leaps, arpeggios, minor, an echo game with new tunes each time, sirens and staccato.
- **Daily warm-up.** About four minutes: stretch and breathe, small hum slides, a light "oo" pattern, a five-note scale, "today's challenge", a control move that changes by weekday (a steady hold, bouncy "ha", grow and shrink, or a slow slide down), then one big siren to finish. Nothing in it goes near the very top of your range, and the biggest slide comes last. Today shows the days you sang this week, aiming for three.
- **Warm up before songs.** Songs open once you've done today's warm-up, and stay open until midnight. Lessons are always open. The warm-up only counts if the app hears you sing every part, going up and down with the notes. It doesn't need to be in tune.
- **Songs.** Public-domain songs with lyrics and piano: learn them line by line, then sing them through.
- **Results.** Score, notes landed and how much of the time the mic heard you, with tips in plain words ("a little low", "a little high"). Singing the right note in another octave counts, and the lane says "same note, lower" or "same note, higher". Under "For grown-ups", a quiet "Copy results for Claude" link copies the details, in cents, for coaching.

## Good to know

- Nothing you sing is recorded or sent anywhere. Pitch detection runs on the phone.
- Progress is stored on the device only. A run only counts toward your practice days and best scores if the mic heard you for at least a fifth of the singing time.
- Headphones let you hear the guide note while you sing. Without them, you hear each part first, then sing it back. The warm-up always works that way, so sound from the phone's speaker can't count as singing.
- Works offline once it has loaded.
- **The grown-ups' switch.** Settings → For grown-ups → "Warm-up before songs" turns the song lock off or on. Turning it off asks a quick times-table sum, so little ones can't do it by accident. It's a gentle nudge, not a real lock: the app checks that someone sang along, but it can't be certain. Reset progress and the How strict numbers (in cents) live there too. Safari and the Home Screen app keep separate data, so a warm-up done in one doesn't open songs in the other.
- **Warm-ups get the voice ready and make singing feel easier.** No study shows they prevent voice injury. Not shouting, singing at a comfy volume, easy notes, and stopping when the throat feels scratchy or sore matter more.
- **Look after your voice** (from Today, any results sheet, the Songs lock, or Settings) has short voice-care tips for children and a section for grown-ups: what the app can't hear, how much singing is sensible, and when to see a GP.

Plain HTML, CSS and JavaScript. No build step. The look is "warm paper": cream and terracotta, or warm cocoa in dark mode, with the Fraunces and Nunito fonts bundled in `fonts/` (SIL Open Font License, see `fonts/OFL.txt`).
Tests for the tune engine (`js/tune.js`) run with `node --test tests/` (Node 22 or later, nothing to install).
