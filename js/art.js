// Note by Note: artwork for the warm-paper redesign (final spec, Appendix C).
// Paste-ready ES module. Every SVG is inline, token-coloured (currentColor or var(--…)),
// aria-hidden, and has no ids, so it works anywhere in the page and in both themes.
// Generated from the approved warm-paper mock plus the final spec's additions; attributes are
// de-duplicated (the HTML parser keeps only the first copy of a repeated attribute).

export const ICON = {
  today: `<svg viewBox="0 0 24 24" aria-hidden="true"><path class="fill" d="M6.5 16.5a5.5 5.5 0 0 1 11 0Z" stroke="none"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M6.5 16.5a5.5 5.5 0 0 1 11 0M2.5 16.8h19M12 4.2v2.4M4.9 8.2l1.7 1.5M19.1 8.2l-1.7 1.5M6 20.2h12.2"/></svg>`,
  lessons: `<svg viewBox="0 0 24 24" aria-hidden="true"><path class="fill" d="M3 5.8c3-1.4 6-1.2 9 .9 3-2.1 6-2.3 9-.9v12.6c-3-1.3-6-1.1-9 .9-3-2-6-2.2-9-.9Z" stroke="none"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3 5.8c3-1.4 6-1.2 9 .9 3-2.1 6-2.3 9-.9v12.6c-3-1.3-6-1.1-9 .9-3-2-6-2.2-9-.9ZM12 6.7v12.6"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M15 10.2c1.2-.5 2.4-.6 3.5-.4M15 13.4c1.2-.5 2.4-.6 3.5-.4"/></svg>`,
  songs: `<svg viewBox="0 0 24 24" aria-hidden="true"><ellipse class="fill" cx="7" cy="17.6" rx="3" ry="2.4" stroke="none"/><ellipse class="fill" cx="17.2" cy="15.8" rx="3" ry="2.4" stroke="none"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9.9 17.4V6.3l10.2-2.1v11.4M9.9 9.8l10.2-2.1"/><ellipse fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" cx="7" cy="17.6" rx="3" ry="2.4" transform="rotate(-14 7 17.6)"/><ellipse fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" cx="17.2" cy="15.8" rx="3" ry="2.4" transform="rotate(-14 17.2 15.8)"/></svg>`,
  gear: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M19.4 13.5a7.7 7.7 0 0 0 0-3l2-1.5-2-3.4-2.3.9a7.6 7.6 0 0 0-2.6-1.5L14.1 2.6h-4.2l-.4 2.4a7.6 7.6 0 0 0-2.6 1.5l-2.3-.9-2 3.4 2 1.5a7.7 7.7 0 0 0 0 3l-2 1.5 2 3.4 2.3-.9a7.6 7.6 0 0 0 2.6 1.5l.4 2.4h4.2l.4-2.4a7.6 7.6 0 0 0 2.6-1.5l2.3.9 2-3.4-2-1.5Z"/></svg>`,
  lock: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" x="5" y="10.5" width="14" height="10" rx="3"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M8.3 10.5V8a3.7 3.7 0 0 1 7.4 0v2.5"/><circle cx="12" cy="15.5" r="1.4" fill="currentColor"/></svg>`,
  unlock: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" x="5" y="10.5" width="14" height="10" rx="3"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M8.3 10.5V8a3.7 3.7 0 0 1 7.1-1.4"/><circle cx="12" cy="15.5" r="1.4" fill="currentColor"/></svg>`,
  play: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.6v12.8a1 1 0 0 0 1.5.9l10-6.4a1 1 0 0 0 0-1.8l-10-6.4A1 1 0 0 0 8 5.6Z" fill="currentColor"/></svg>`,
  stop: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6.5" y="6.5" width="11" height="11" rx="2.5" fill="currentColor"/></svg>`,
  close: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg>`,
  phones: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" x="3" y="14" width="4.5" height="6.5" rx="1.8"/><rect fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" x="16.5" y="14" width="4.5" height="6.5" rx="1.8"/></svg>`,
  arrow: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M5 12h13M13 6.5l5.5 5.5-5.5 5.5"/></svg>`,
  check: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M5.5 12.5l4.2 4.2 8.8-9.2"/></svg>`,
  star: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.2l2.6 5.5 6 .8-4.4 4.1 1.1 5.9L12 16.6l-5.3 2.9 1.1-5.9-4.4-4.1 6-.8Z" fill="currentColor" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>`,
  wave: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M2 13c2 0 2-6 4-6s2 10 4 10 2-12 4-12 2 9 4 9 2-4 4-4"/></svg>`,
  heart: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 19.5s-7.5-4.3-7.5-9.6A4.2 4.2 0 0 1 12 7.6a4.2 4.2 0 0 1 7.5 2.3c0 5.3-7.5 9.6-7.5 9.6Z"/></svg>`,
  stretch: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" cx="12" cy="5" r="2.2"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 8.5v6.5M12 10.2 7 5.8M12 10.2l5-4.4M12 15l-3 5.5M12 15l3 5.5"/></svg>`,
  hum: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3 16c2.4 0 3.2-7 6-7s3.2 7 6 7 3.4-5 6-5"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 19.8h6"/></svg>`,
  oodown: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="5.5" r="2.1" fill="currentColor"/><circle cx="10" cy="9.5" r="2.1" fill="currentColor"/><circle cx="15" cy="13.5" r="2.1" fill="currentColor"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M18 15.5l2.5 3.5M20.5 19l-3.9.2M20.5 19l.6-3.8"/></svg>`,
  scale: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="3.6" cy="18" r="2" fill="currentColor"/><circle cx="8.2" cy="13.8" r="2" fill="currentColor"/><circle cx="12.6" cy="9.6" r="2" fill="currentColor"/><circle cx="17" cy="5.6" r="2" fill="currentColor"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3.6 18 8.2 13.8l4.4-4.2L17 5.6"/><circle fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" cx="20.6" cy="10" r="1.7"/></svg>`,
  bounce: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1.5 2.6" d="M3.5 18c1-6 4-6 5 0 1-6 4-6 5 0 1-6 4-6 5 0"/><circle cx="3.5" cy="18.4" r="2" fill="currentColor"/><circle cx="8.5" cy="18.4" r="2" fill="currentColor"/><circle cx="13.5" cy="18.4" r="2" fill="currentColor"/><circle cx="18.5" cy="18.4" r="2" fill="currentColor"/></svg>`,
  siren: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M2.5 19.5c4 0 5-15 9.5-15s5.5 15 9.5 15"/></svg>`,
  sprout: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 20.5v-8.2"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 12.6C12 8.4 9 6 4.6 6.2 4.5 10.4 7.4 12.8 12 12.6ZM12 15.2c0-3.9 2.6-6.3 7.2-6.1.1 4-2.7 6.3-7.2 6.1Z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M7.5 20.5h9"/></svg>`,
  ladder: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="4.5" cy="18.5" r="2.4" fill="currentColor"/><circle cx="12" cy="12" r="2.4" fill="currentColor"/><circle cx="19.5" cy="5.5" r="2.4" fill="currentColor"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1.6 2.6" d="M6.5 16.6l3.6-3M14 10.2l3.6-3"/></svg>`,
  wind: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3 9h10.5a3 3 0 1 0-3-3M3 13.5h15a3 3 0 1 1-3 3M3 18h6.5"/></svg>`,
  hold: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="10" width="16" height="4.4" rx="2.2" fill="currentColor"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M2.8 6.5v11M21.2 6.5v11"/></svg>`,
  swell: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2.6" y="10.3" width="3.2" height="3.4" rx="1.6" fill="currentColor"/><rect x="6.9" y="7.6" width="3.2" height="8.8" rx="1.6" fill="currentColor"/><rect x="11.2" y="4.5" width="3.2" height="15" rx="1.6" fill="currentColor"/><rect x="15.5" y="7.6" width="3.2" height="8.8" rx="1.6" fill="currentColor"/><rect x="19.8" y="10.3" width="3.2" height="3.4" rx="1.6" fill="currentColor"/></svg>`,
  slide: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3 5.5c7 0 8 12.5 16.5 12.5"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M16.2 14.6l3.6 3.4-3.6 3.2"/></svg>`,
  listen: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M7.5 9.5a5.5 5.5 0 1 1 9.4 3.9c-1.4 1.4-2.4 2.4-2.4 4.1a3 3 0 0 1-5.6 1.4"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M10.4 10a2.3 2.3 0 1 1 3.6 1.9c-.8.5-1.1 1-1.1 1.8"/></svg>`,
  mic: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8.5" y="3" width="7" height="11.5" rx="3.5" fill="currentColor"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7"/></svg>`,
  shout: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M4 9.5v5h3.2L14 19V5L7.2 9.5H4Z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M17.5 9.5c.8.7 1.2 1.6 1.2 2.5"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3 3.5l18 17"/></svg>`,
  volume: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="13.5" width="4.2" height="6.5" rx="1.6" fill="currentColor"/><rect x="9.9" y="9.5" width="4.2" height="10.5" rx="1.6" fill="currentColor"/><rect fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2 2.2" x="16.3" y="5" width="4.2" height="15" rx="1.6"/></svg>`,
  easy: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="2.2 2.6" d="M2.5 4.5h19"/><circle cx="5" cy="19" r="2.3" fill="currentColor"/><circle cx="11" cy="15" r="2.3" fill="currentColor"/><circle cx="17" cy="11" r="2.3" fill="currentColor"/></svg>`,
  water: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M6.5 3.5h11l-1.5 16a1.8 1.8 0 0 1-1.8 1.6H9.8A1.8 1.8 0 0 1 8 19.5Z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M7.3 10.5c1.6-.9 3.1-.9 4.7 0s3.1.9 4.7 0"/></svg>`,
  rest: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.2A7.8 7.8 0 1 1 9.8 4.5a6.3 6.3 0 0 0 9.7 9.7Z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M15 3.5h3.5L15 7.5h3.5"/></svg>`,
  grow: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M5 19C5 10 10 5 20 5c0 10-5 15-14 14M5 19l8-8"/></svg>`,
  chev: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  // Free sing: "Your tune dipped down", "Your tune came home", and the song-starter pictures
  dip: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M2.5 4.5c4 0 5 15 9.5 15s5.5-15 9.5-15"/></svg>`,
  home: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3.5 11.4 12 4.3l8.5 7.1M6 9.5v10h12v-10"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M10.2 19.5v-5h3.6v5"/></svg>`,
  paw: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12.4c-2.9 0-5.7 3.3-5.7 5.6 0 1.5 1.2 2.3 2.6 2.3 1.3 0 2-.7 3.1-.7s1.8.7 3.1.7c1.4 0 2.6-.8 2.6-2.3 0-2.3-2.8-5.6-5.7-5.6Z" fill="currentColor"/><ellipse cx="5.1" cy="10.8" rx="1.8" ry="2.3" transform="rotate(-24 5.1 10.8)" fill="currentColor"/><ellipse cx="9.2" cy="6.6" rx="1.9" ry="2.4" transform="rotate(-8 9.2 6.6)" fill="currentColor"/><ellipse cx="14.8" cy="6.6" rx="1.9" ry="2.4" transform="rotate(8 14.8 6.6)" fill="currentColor"/><ellipse cx="18.9" cy="10.8" rx="1.8" ry="2.3" transform="rotate(24 18.9 10.8)" fill="currentColor"/></svg>`,
  dragon: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M7 12.5h3V12a5.5 5.5 0 0 1 11 0v3.5c0 2.2-1.8 4-4 4H7a3.5 3.5 0 0 1 0-7Z"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12.6 7.6 11.6 4l3.3 2.4M17.4 6.8l1.4-3.2.9 3.9M14.2 11.6q1.6 1.4 3.2 0M2.5 3.5h3l-3 3.6h3"/><circle cx="5.8" cy="15.6" r="1.1" fill="currentColor"/></svg>`,
  name: `<svg viewBox="0 0 24 24" aria-hidden="true"><rect fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" x="2.5" y="5" width="19" height="14.5" rx="3"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M2.5 9.6h19M6.5 15c1.2-1.8 2.2 1.8 3.4 0s2.2 1.8 3.4 0 2.2 1.8 3.4 0"/></svg>`,
  sun: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" cx="12" cy="12" r="4.6"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4M10.3 12.9q1.7 1.4 3.4 0"/></svg>`,
  bowl: `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M3.5 11.5h17c0 4.4-3.8 7.6-8.5 7.6s-8.5-3.2-8.5-7.6ZM9 21h6"/><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 8.5c-.9-1 .9-2 0-3.2M12.5 8.5c-.9-1 .9-2 0-3.2M16 8.5c-.9-1 .9-2 0-3.2"/></svg>`,
};

// Warm-up step pictures, in order. Step 5 is today's control move (CONTROL_BY_DAY in lessons.js).
export const WARM_STEPS = [
  { key: 'move', icon: 'stretch', label: 'Stretch', title: 'Wake up your body' },
  { key: 'hum', icon: 'hum', label: 'Hum', title: 'Hum slides' },
  { key: 'oo', icon: 'oodown', label: 'Oo', title: 'Light “oo” down' },
  { key: 'scale', icon: 'scale', label: 'Scale', title: 'Five-note scale' },
  { key: 'control', icon: null, label: null, title: null }, // filled from CONTROL_STEP below
  { key: 'siren', icon: 'siren', label: 'Siren', title: 'Big siren' },
];
export const CONTROL_STEP = {
  hold: { icon: 'hold', label: 'Hold', title: 'Hold it steady' },
  bounce: { icon: 'bounce', label: 'Bounce', title: 'Bouncy “ha”' },
  swell: { icon: 'swell', label: 'Grow', title: 'Grow and shrink' },
  slide: { icon: 'slide', label: 'Slide', title: 'Slow slide down' },
};

// Cue phase badge in the player: listen | sing | breathe
export const PHASE_ICON = { listen: ICON.listen, sing: ICON.mic, breathe: ICON.wind };

// Brand mark, greeting squiggle and the hero's staff doodle
export const MARK = `<svg viewBox="0 0 34 22" aria-hidden="true"><circle cx="4" cy="18" r="3.2" fill="var(--do)"/><circle cx="12.5" cy="14" r="3.2" fill="var(--re)"/><circle cx="21" cy="10" r="3.2" fill="var(--mi)"/><circle cx="29.5" cy="5" r="3.2" fill="var(--sol)"/></svg>`;
export const SQUIGGLE = `<svg class="squiggle" viewBox="0 0 92 12" aria-hidden="true"><path d="M2 7c6-6 9 5 15 0s9-6 15 0 9 5 15 0 9-6 15 0 9 5 15 0 7-4 11-1" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`;
export const STAFF = `<svg class="staff" viewBox="0 0 190 64" aria-hidden="true" preserveAspectRatio="none"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M0 8c40-1.5 90 1.5 190-.5"/><path d="M0 20c50 1 110-1.2 190 .4"/><path d="M0 32c45-1.4 100 1.4 190-.3"/><path d="M0 44c55 1 105-1 190 .5"/><path d="M0 56c40-1 95 1.3 190-.4"/></g></svg>`;

// Celebration doodles (c = a CSS colour, normally var(--do)…var(--ti))
export const DOODLE = {
  quaver: (c) => `<svg viewBox="0 0 20 20" aria-hidden="true"><ellipse cx="7" cy="15" rx="4" ry="3" transform="rotate(-18 7 15)" fill="${c}"/><path d="M10.6 14V3.2c2.4 1.2 4.8 2.6 5 5.6" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"/></svg>`,
  spark: (c) => `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.5c.6 4.6 3.9 7.9 8.5 8.5-4.6.6-7.9 3.9-8.5 8.5-.6-4.6-3.9-7.9-8.5-8.5 4.6-.6 7.9-3.9 8.5-8.5Z" fill="${c}"/></svg>`,
  squig: (c) => `<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M2 12c2.5-6 4.5 6 7 0s4.5 6 7 0" fill="none" stroke="${c}" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  dot: (c) => `<svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="5" fill="${c}"/></svg>`,
};

// Fixed confetti layouts: [kind, degree, x %, y px from the sheet's top edge, rotation°, delay s, size px]
// BURST sits around the results stamp (top right); AROUND frames Hum on the warm-up-done sheet.
export const BURST = [
  ['spark', 'mi', 49, 96, 10, 0.08, 18], ['quaver', 'do', 41, 66, -16, 0.02, 20], ['squig', 're', 51, 158, -12, 0.0, 22], ['dot', 'sol', 64, 80, 0, 0.12, 10],
  ['spark', 'ti', 84, 74, -10, 0.05, 16], ['dot', 'fa', 96, 104, 0, 0.14, 10], ['quaver', 'la', 94, 166, 14, 0.07, 20], ['spark', 'sol', 66, 176, 0, 0.1, 12],
];
export const AROUND = [
  ['quaver', 'do', 12, 92, -18, 0.04, 24], ['spark', 'mi', 24, 64, 14, 0.1, 20], ['squig', 're', 8, 160, -10, 0.0, 22], ['dot', 'sol', 21, 128, 0, 0.12, 12],
  ['quaver', 'la', 72, 80, 16, 0.07, 24], ['spark', 'ti', 87, 120, -12, 0.02, 20], ['dot', 'fa', 92, 70, 0, 0.14, 12], ['squig', 'mi', 87, 176, 24, 0.09, 22],
];
// origin = [x %, y px] the pieces fly out from; width = the sheet's width in px
export function confetti(pieces, origin, width) {
  return `<div class="confetti" aria-hidden="true">${pieces.map(([k, c, x, y, r, d, sz = 20]) => {
    const fx = ((origin[0] - x) / 100) * width, fy = origin[1] - y;
    return `<i style="--x:${x}%;--y:${y}px;--fx:${fx.toFixed(0)}px;--fy:${fy}px;--r:${r}deg;--d:${d}s;--s:${sz}px">${DOODLE[k](`var(--${c})`)}</i>`;
  }).join('')}</div>`;
}

// Three-note rating for pre-readers (n = 0..3 from verdict thresholds 0.4 / 0.65 / 0.85)
export function rating(n) {
  const note = (on) => `<svg viewBox="0 0 20 20" class="${on ? 'on' : 'off'}" aria-hidden="true"><ellipse cx="7.5" cy="14.5" rx="5" ry="3.8" transform="rotate(-18 7.5 14.5)" fill="currentColor"/><path d="M12 13.5V2.8" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>`;
  return `<span class="rating" role="img" aria-label="${n} out of 3 notes">${[0, 1, 2].map((i) => note(i < n)).join('')}</span>`;
}

// "Hum": a note-head in a warm scarf. pose: 'sing' | 'happy'. Only on warm-up surfaces (spec §7.1).
export function hum(pose = 'sing', cls = 'hum') {
  const L = 'var(--char-line)', F = 'var(--char-face)';
  const face = pose === 'happy'
    ? `<path d="M33.5 76.5q3.5-4 7 0M50.5 70.5q3.5-4 7 0" fill="none" stroke="${F}" stroke-width="3" stroke-linecap="round"/>
       <path d="M40 85.5q6.5 6 13-1.8" fill="none" stroke="${F}" stroke-width="3" stroke-linecap="round"/>`
    : `<ellipse cx="37" cy="76" rx="3" ry="3.9" fill="${F}"/><ellipse cx="54" cy="70.5" rx="3" ry="3.9" fill="${F}"/>
       <circle cx="38" cy="74.6" r="1" fill="#fff"/><circle cx="55" cy="69.1" r="1" fill="#fff"/>
       <ellipse cx="47.5" cy="85.5" rx="4.3" ry="5.3" transform="rotate(-18 47.5 85.5)" fill="${F}"/>
       <ellipse cx="47.9" cy="87.4" rx="2.4" ry="2" transform="rotate(-18 47.9 87.4)" fill="var(--char-cheek)"/>`;
  const extra = pose === 'happy'
    ? `<g fill="var(--accent)"><path d="M14 30c.4 3 2.6 5.2 5.6 5.6-3 .4-5.2 2.6-5.6 5.6-.4-3-2.6-5.2-5.6-5.6 3-.4 5.2-2.6 5.6-5.6Z"/><path d="M104 74c.3 2.2 1.9 3.8 4.1 4.1-2.2.3-3.8 1.9-4.1 4.1-.3-2.2-1.9-3.8-4.1-4.1 2.2-.3 3.8-1.9 4.1-4.1Z"/></g>`
    : `<g fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round"><path d="M20 58c-4-3-9-2-11 1"/><path d="M17 49c-6-5-13-4-16 0"/></g>
       <g fill="var(--accent)"><ellipse cx="11" cy="36" rx="3.6" ry="2.7" transform="rotate(-18 11 36)"/><path d="M14 35.4V25.5c2 1 4 2.2 4.2 4.8" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round"/></g>`;
  return `<svg class="${cls}" viewBox="0 0 120 120" aria-hidden="true">
    <ellipse cx="50" cy="109" rx="30" ry="4.5" fill="var(--char-shadow)"/>
    ${extra}
    <path d="M72.5 66V17" stroke="${L}" stroke-width="5.5" stroke-linecap="round"/>
    <path d="M72.5 17c3 9 15 11 18 22 1.6 6-.6 11-4 14" fill="none" stroke="${L}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    <ellipse cx="47" cy="78" rx="29.5" ry="22.5" transform="rotate(-20 47 78)" fill="var(--char-body)" stroke="${L}" stroke-width="3.6"/>
    <path d="M60 57.5c4.6-4 18-6 27 0l-1.8 7.6c-8-4.6-17-3.6-24.4.8Z" fill="var(--char-scarf)" stroke="${L}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M66.5 55.6l-1.6 8.6M73.5 54.5l-.4 8.4M80.5 55.6l-1 7.8" stroke="var(--char-scarf-2)" stroke-width="2.4" stroke-linecap="round"/>
    <path d="M80 62.5c3.4 6 6.8 11 11.8 15.6l-6.2 4.6c-3.6-4.6-6.4-10.2-8.3-16.6Z" fill="var(--char-scarf)" stroke="${L}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M86.5 76.5l-3 2.4" stroke="var(--char-scarf-2)" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="31" cy="85" r="4.6" fill="var(--char-cheek)" opacity=".75"/><circle cx="62" cy="75" r="4.6" fill="var(--char-cheek)" opacity=".75"/>
    ${face}
  </svg>`;
}

// "Wake up your body" move cards, 140×140 line art: --fg lines, --accent motion marks.
export const MOVE_ART = {
  shoulders: `<svg class="move-art" viewBox="0 0 140 140" aria-hidden="true"><circle fill="none" stroke="var(--fg)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" cx="70" cy="56" r="27"/><circle cx="60" cy="52" r="3" fill="var(--fg)"/><circle cx="80" cy="52" r="3" fill="var(--fg)"/><path fill="none" stroke="var(--fg)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" d="M62 66q8 6 16 0"/><path fill="none" stroke="var(--fg)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" d="M30 132c0-24 17-38 40-38s40 14 40 38"/><path fill="none" stroke="var(--accent)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" d="M22 92a14 14 0 1 1 18 -14"/><path fill="none" stroke="var(--accent)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" d="M42 72l-2 7-7-2"/><path fill="none" stroke="var(--accent)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" d="M118 92a14 14 0 1 0 -18 -14"/><path fill="none" stroke="var(--accent)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" d="M98 72l2 7 7-2"/></svg>`,
  jaw: `<svg class="move-art" viewBox="0 0 140 140" aria-hidden="true"><circle fill="none" stroke="var(--fg)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" cx="70" cy="56" r="27"/><circle cx="60" cy="52" r="3" fill="var(--fg)"/><circle cx="80" cy="52" r="3" fill="var(--fg)"/><ellipse cx="70" cy="72" rx="4.5" ry="6" fill="none" stroke="var(--fg)" stroke-width="2.8"/><path fill="none" stroke="var(--fg)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" d="M30 132c0-24 17-38 40-38s40 14 40 38"/><path fill="none" stroke="var(--accent)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" d="M57.5 66.5a6 6 0 1 1-4.6-5.8"/><path fill="none" stroke="var(--accent)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" d="M50.6 58.6l2.6 2.2-2.4 2.6"/><path fill="none" stroke="var(--accent)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" d="M82.5 66.5a6 6 0 1 0 4.6-5.8"/><path fill="none" stroke="var(--accent)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" d="M89.4 58.6l-2.6 2.2 2.4 2.6"/></svg>`,
  yawn: `<svg class="move-art" viewBox="0 0 140 140" aria-hidden="true"><circle fill="none" stroke="var(--fg)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" cx="70" cy="56" r="27"/><path fill="none" stroke="var(--fg)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" d="M55 53q5-4 10 0M75 53q5-4 10 0"/><ellipse cx="70" cy="68" rx="8" ry="10.5" fill="var(--fg)"/><path fill="none" stroke="var(--fg)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" d="M30 132c0-24 17-38 40-38s40 14 40 38"/><path fill="none" stroke="var(--accent)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" d="M108 22c6 10 2 18 6 26s10 12 8 22"/><path fill="none" stroke="var(--accent)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" d="M116 64l6 7 5-8"/></svg>`,
  breath: `<svg class="move-art" viewBox="0 0 140 140" aria-hidden="true"><circle fill="none" stroke="var(--fg)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" cx="70" cy="56" r="27"/><circle cx="60" cy="52" r="3" fill="var(--fg)"/><circle cx="80" cy="52" r="3" fill="var(--fg)"/><path fill="none" stroke="var(--fg)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" d="M64 68h12"/><path fill="none" stroke="var(--fg)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" d="M30 132c0-24 17-38 40-38s40 14 40 38"/><path fill="none" stroke="var(--accent)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" d="M103 60c5-3 8 3 13 0s8 3 13 0"/><path fill="none" stroke="var(--accent)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" d="M103 70c5-3 8 3 13 0s8 3 13 0"/><path fill="none" stroke="var(--accent)" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="0.5 6" d="M105 80h22"/></svg>`,
};

// Countdown ring for move cards. secsLeft = whole seconds, frac = 0..1 of the card elapsed.
export function moveRing(secsLeft, frac) {
  return `<div class="move-ring" role="img" aria-label="${secsLeft} seconds left"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="26" fill="none" stroke="var(--line)" stroke-width="6"/><circle cx="32" cy="32" r="26" fill="none" stroke="var(--accent)" stroke-width="6" stroke-linecap="round" stroke-dasharray="163.4" stroke-dashoffset="${(163.4 * (1 - frac)).toFixed(1)}" transform="rotate(-90 32 32)"/></svg><b>${secsLeft}</b></div>`;
}
