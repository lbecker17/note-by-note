# iPhone Safari / Home Screen web app feasibility: recording, playback, audio processing, speech, storage and sharing (as of 1 October 2026)

All sources were checked on **1 October 2026**. Evidence labels:
- **[READ]**: the page was fetched and read.
- **[SNIPPET]**: only a search-result summary was seen. Many key domains were blocked for full-text fetch in this session (webkit.org, bugs.webkit.org, caniuse.com, blog.addpipe.com, samueleddy.com, lapcatsoftware.com, zenn.dev, mjtsai.com, docs.github.com, cdn.jsdelivr.net), so WebKit blog claims are snippet-level.
- **[DATA]**: raw data was downloaded and inspected. This covers MDN browser-compat-data (BCD) JSON from the `main` branch on GitHub and the Basic Pitch model files.
- **[LOCAL]**: the Note by Note code (read-only).
- **[SIBLING]**: carried over from the sibling notes in this folder or from the earlier review notes, with their original sources.

Vendor claims (Apple/WebKit marketing, library READMEs) are marked as such. Inferences are kept in the Inferences subsections.

Relevant current app facts [LOCAL]:
- `js/audio.js` `startMic()` sets `navigator.audioSession.type = 'play-and-record'`.
- It then calls `getUserMedia({audio:{echoCancellation:false, noiseSuppression:false, autoGainControl:false}})`.
- It feeds `createMediaStreamSource` into an `AnalyserNode`, which is routed through a zero-gain node to `ctx.destination`.
- Progress is kept only in `localStorage` (`js/store.js`, key `note-by-note:v1`).
- `index.html` has `apple-mobile-web-app-capable`, and there is a `manifest.webmanifest` and `sw.js`.
- `freeCtrl()` (`js/app.js` ~line 1206) only draws the live pitch lane. Nothing is recorded or uploaded.

---

## 1. MediaRecorder on iOS Safari (formats, quality, recording while an AudioContext analyses the same mic, limits, standalone bugs) and the AudioWorklet-to-WAV alternative

### Takeaway
Recording works in iPhone Safari. MediaRecorder exists (iOS 14+), writes AAC in `audio/mp4` by default, and from iOS 18.4 can also write WebM/Opus, Ogg and lossless ALAC/PCM. There is an unresolved August 2025 report that **MediaRecorder works once in a Home Screen app and then fails on later launches until the phone restarts**. For an app that already runs a Web Audio graph on the mic, the lower-risk path is to tap raw PCM from that graph (AudioWorklet, Safari 14.1+) and write WAV in plain JavaScript, with MediaRecorder as a fallback. **Works with caveats.**

### Cited Findings
- **Support.** MDN BCD lists `MediaRecorder` and `MediaRecorder.isTypeSupported()` as supported from Safari 14.1 (macOS) and Safari iOS 14. — [DATA] [MDN BCD MediaRecorder.json](https://github.com/mdn/browser-compat-data/blob/main/api/MediaRecorder.json)
- **Safari 18.4 formats.** Safari 18.4 (iOS 18.4, March 2025) lets MediaRecorder write WebM with Opus audio, and "can also generate high-quality, lossless audio tracks in ALAC or PCM formats". It also added Ogg container support (Opus/Vorbis) on iOS 18.4. — [SNIPPET] [WebKit, Features in Safari 18.4](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/); original MediaRecorder announcement: [WebKit, MediaRecorder API](https://webkit.org/blog/11353/mediarecorder-api/)
- **Default type and mislabelling.** Safari still defaults to `audio/mp4` (AAC) where Chrome and Firefox write `audio/webm` (Opus). An MP4 recording mislabelled as WebM will not play back in Safari. — [SNIPPET] [Perchito/wedding-gallery-platform PR #2](https://github.com/Perchito/wedding-gallery-platform/pull/2); [OpenAI forum: audio/mp4 blobs from Safari](https://community.openai.com/t/whisper-problem-with-audio-mp4-blobs-from-safari/322252)
- **isTypeSupported can lie.** A report says `isTypeSupported()` returned true on iPhone Safari while `start()` threw `NotSupportedError`, so the page "silently recorded nothing". — [SNIPPET; attribution within the result set uncertain, appears to come from] [testmuai: MediaRecorder browser support](https://www.testmuai.com/learning-hub/mediarecorder-browser-support/)
- **Home Screen bug (August 2025).** MediaRecorder works every time in Safari. In a Home Screen app it works on the first launch but "fails on subsequent app launches", and a phone restart is needed to restore it. A WebKit engineer (youennfablet) asked for a bug report with a reduced test case, suggested inspecting `MediaStreamTrack` states, and acknowledged earlier getUserMedia problems in PWAs. No fix or workaround was posted. — [READ] [Apple Developer Forums 797987](https://developer.apple.com/forums/thread/797987)
- **Standalone upload bug.** A no-code plugin forum reports that recording works in iOS Safari, but in standalone (PWA) mode "only a 44 byte wav file is uploaded". 44 bytes is a WAV header with no samples. — [SNIPPET] [Zeroqode forum: Audio Recorder in iOS PWA standalone mode](https://forum.zeroqode.com/t/audio-recorder-in-ios-in-pwa-standalone-mode/4029)
- **Recording processed audio.** To record what the graph produces rather than the raw mic, the usual pattern is `createMediaStreamDestination()`, connecting the graph to it and passing its `.stream` to MediaRecorder. On iOS 11 that path was broken (historical). — [SNIPPET] [OpenReplay: recording audio with Web Audio](https://blog.openreplay.com/record-audio-browser-web-audio-api/); [WebAudio/web-audio-api issue #1722](https://github.com/WebAudio/web-audio-api/issues/1722)
- **AudioWorklet.** MDN BCD lists `AudioWorklet` from Safari 14.1, mirrored to iOS. — [DATA] [MDN BCD AudioWorklet.json](https://github.com/mdn/browser-compat-data/blob/main/api/AudioWorklet.json)
- **Fragility across OS updates.** In the iOS 26.1 beta (September 2025), `getUserMedia` audio failed with "No AVAudioSessionCaptureDevice device" and AirPods Pro 2 were not detected as inputs. Beta 2 (October 2025) fixed it. — [READ] [Apple Developer Forums 802555](https://developer.apple.com/forums/thread/802555)
- **Safari 27 decoding fixes.** Safari 27 fixed `decodeAudioData` failing on MP4 files with Opus tracks and on WebM audio with more than two channels. — [SNIPPET] [WebKit, News from WWDC26: Safari 27 beta](https://webkit.org/blog/17967/news-from-wwdc26-webkit-in-safari-27-beta/); [WebKit Features for Safari 27.0](https://webkit.org/blog/18325/webkit-features-for-safari-27-0/)

### Inferences
- **Recording while the pitch detector runs.** A `MediaStream` can feed several consumers: a `MediaStreamAudioSourceNode` (already used) and a MediaRecorder, or a second node in the same graph. I found **no report that doing both breaks on iOS**. The simplest design avoids a second consumer: add an `AudioWorkletNode` (or a small `ScriptProcessorNode` fallback) alongside the existing analyser, copy Float32 blocks into an array, and encode WAV on stop. This gives sample-accurate alignment with the pitch trace because both use `ctx.currentTime`. It also avoids MediaRecorder's Home Screen bug and codec negotiation entirely. An AudioWorklet module is just one more static `.js` file, so it works without a build step. It must be same-origin and added to `sw.js`'s cache.
- **Memory and size (arithmetic, not measured).**
  - In memory, mono Float32 at 48 kHz is about 11.5 MB per minute.
  - As 16-bit WAV it is about 5.8 MB/min at 48 kHz, 2.9 MB/min at 24 kHz, and 1.9 MB/min at 16 kHz.
  - AAC from MediaRecorder at a typical 128 kbps is about 1 MB/min.
  - Downsampling to 22.05 or 24 kHz mono keeps sung voice quality and keeps 2 to 3 minute takes well under 20 MB.
  - Cap takes (for example 90 s for under-8s, 3 min for teens) to protect low-RAM iPhones (see section 5 on tab memory).
- **Using MediaRecorder anyway.** If MediaRecorder is used (for compact AAC files to share), always pick the type with `isTypeSupported('audio/mp4')` and wrap `start()` in try/catch. Check `blob.size > 1 kB` after stop and fall back to the PCM path if it is empty. Stop all tracks on `pagehide` to reduce the "works once" risk.

### Gaps
- No documented maximum recording length or memory ceiling for MediaRecorder on iOS was found.
- No source confirmed whether the August 2025 Home Screen MediaRecorder bug still reproduces on iOS 26.x or 27.0. No WebKit bug number was found for it.
- Actual AAC bitrate and sample rate of iOS MediaRecorder output were not verified.
- The getUserMedia capture sample rate on iPhone was not verified (it is commonly 48 kHz, but unconfirmed here).

---

## 2. Playback and mixing: playing a recording with a backing track, latency alignment, AirPods/Bluetooth, and echo cancellation / noise suppression effects on recorded singing

### Takeaway
Playing a take back with the piano guide and mixing them is easy in Web Audio (decode both, schedule on one `AudioContext`, or render to a file with an offline context). Alignment is the hard part.
- **`AudioContext.outputLatency` is now available in Safari 18.4+.** This corrects the earlier note that said Safari lacks it.
- Input latency still is not reported, so a one-time loopback or tap calibration is still needed.
- Bluetooth (AirPods) is the worst case: the mic switches the link to call-quality HFP, playback latency is large, and there are WebKit stutter and routing bugs.
- Echo cancellation should stay off for singing, but there are fresh (2025–2026) reports that Safari ignores or mishandles `echoCancellation:false`.

**Works with caveats; Bluetooth recording with a guide track is poor.**

### Cited Findings
- **Latency properties.** MDN BCD lists `AudioContext.outputLatency` as supported from Safari 18.4 (mirrored to iOS) and `baseLatency` from Safari 14.1. `setSinkId` (choosing the output device) is not supported in Safari. — [DATA] [MDN BCD AudioContext.json](https://github.com/mdn/browser-compat-data/blob/main/api/AudioContext.json). A search summary of caniuse says the same (Safari and iOS 18.4 through 26.5). — [SNIPPET] [caniuse: outputLatency](https://caniuse.com/mdn-api_audiocontext_outputlatency)
  - *This contradicts* the earlier review note ("Safari implements baseLatency but not outputLatency"), which relied on older web.dev and blog sources. — [SIBLING] `../Note by Note singing app review/pitch_detection_and_scoring_tech.md`; [web.dev: audio output latency](https://web.dev/articles/audio-output-latency)
- **Audio Session API.** MDN BCD lists `navigator.audioSession` / `AudioSession` from Safari 16.4 (mirrored to iOS). Types include `playback`, `transient`, `transient-solo`, `ambient` and `play-and-record`. — [DATA] [MDN BCD Navigator.json](https://github.com/mdn/browser-compat-data/blob/main/api/Navigator.json), [AudioSession.json](https://github.com/mdn/browser-compat-data/blob/main/api/AudioSession.json); [SNIPPET] [MDN: AudioSession](https://developer.mozilla.org/en-US/docs/Web/API/AudioSession); [W3C Audio Session](https://www.w3.org/TR/audio-session/)
  - Other summaries say "iOS 17 shipped" it; the BCD version is preferred here.
- **Bluetooth HFP.** When the AirPods mic is active, the Bluetooth link switches from AAC stereo playback to SCO/HFP, which limits bandwidth to about 8–16 kHz. — [SNIPPET; low-quality vendor page] [mictestpro: AirPods mic test](https://mictestpro.com/airpods-mic-test/)
- **AirPods stutter bug.** With AirPods connected, calling `getUserMedia()` and playing through Web Audio can cause "severe stuttering, long pauses, and slowed-down playback". — [SNIPPET] [WebKit bug 221334](https://bugs.webkit.org/show_bug.cgi?id=221334)
- **Output switches to the speaker.** When the mic starts, iOS Safari can switch output from headphones to the built-in speaker. — [SNIPPET] [WebKit bug 218012](https://bugs.webkit.org/show_bug.cgi?id=218012); [Medium summary](https://medium.com/@python-javascript-php-html-css/ios-safari-forces-audio-output-to-speakers-when-using-getusermedia-2615196be6fe)
- **iOS 26 high-quality Bluetooth recording.** iOS 26 adds a high-quality, high-sample-rate Bluetooth recording option for native apps (`AVAudioSession` option `bluetoothHighQualityRecording`, WWDC25). — [SNIPPET] [Apple WWDC25 session 251](https://developer.apple.com/videos/play/wwdc2025/251/?time=62); [GSMArena](https://www.gsmarena.com/newscomm-68177.php)
- **Bluetooth latency.** AirPods output latency is roughly 130 ms, SBC 200–300 ms, and Apple's own estimates "can differ from actual". — [SIBLING, low-quality sources] [Apple Developer Forums 679274](https://developer.apple.com/forums/thread/679274)
- **Echo cancellation flag ignored.** In Safari, setting `echoCancellation` to false reportedly "does not appear to turn echo cancellation off". — [SNIPPET] [WebKit bug 179411](https://bugs.webkit.org/show_bug.cgi?id=179411)
- **channelCount ignored (Safari 26, macOS, October 2025).** With `echoCancellation:false`, `channelCount:1` is ignored and capture is stereo; with `echoCancellation:true` it is mono. There was no Apple reply. — [READ] [Apple Developer Forums 804765](https://developer.apple.com/forums/thread/804765)
- **echoCancellation:false kills mic audio in an iOS PWA (29 September 2026).** One developer found that passing `echoCancellation:false` **directly to `getUserMedia()` in an iOS PWA made the mic stop transmitting audio**. They fixed it by capturing first and then calling `track.applyConstraints({echoCancellation:false})` on the live track. No WebKit bug is linked. — [READ] [yamachat PR #80](https://github.com/yamboleeroy-ai/yamachat/pull/80)
- **Mic advice for iOS PWAs.** The same project advises requesting the mic immediately on the user's tap and not forcing 48 kHz or `channelCount` on iOS. — [SNIPPET] [yamachat PR #78](https://github.com/yamboleeroy-ai/yamachat/pull/78)
- **Safari 27 media fix.** Safari 27 fixed "setting `HTMLMediaElement.volume` had no effect when the element was connected to an AudioContext". — [SNIPPET] [WebKit, Safari 27 beta](https://webkit.org/blog/17967/news-from-wwdc26-webkit-in-safari-27-beta/)

### Inferences
- **Playback with the guide.** Use one `AudioContext`. Decode the take into an `AudioBuffer` and start it and the song's piano schedule at the same `ctx.currentTime`, offset by the measured round-trip latency. To export "my song with piano", render the voice buffer plus the synthesized piano into an `OfflineAudioContext` and encode WAV. This needs no server and no library. (OfflineAudioContext support in Safari was not re-checked this session; it is long-standing.)
- **Latency calibration.** When singing to a guide, the take lags the guide by input latency plus output latency.
  - `outputLatency` (18.4+) covers the output half. `baseLatency` and the 20 ms input guess already in `read()` cover part of the input half.
  - A once-per-route calibration remains the reliable fix. Either play a click and detect it at the mic (speaker route only, with echo cancellation off) or use a "tap along" test. Store the offset per route.
  - For AirPods, prefer **call-and-response** (child sings after the guide, not over it), so alignment does not matter.
- **Echo cancellation and bleed.** With echo cancellation off and the guide on the loudspeaker, the piano will bleed into the recording. That is acceptable for a family keepsake but bad for scoring.
  - Recommend wired EarPods (USB-C/Lightning) for sing-along recording.
  - With the speaker, either lower guide volume or record without the guide and add the clean piano back in the mix (the app knows the exact notes, so a "clean remix" is possible).
  - Turning echo cancellation on to fight bleed would damage sustained sung tones (voice-processing algorithms target speech). That is why the app turned it off.
- **Risk to the current app.** The yamachat report directly concerns the pattern Note by Note already uses (`echoCancellation:false` in `getUserMedia` inside a Home Screen app). Because the owner's children use the app today, it presumably works on their iOS versions. Still, a defensive change is cheap: on failure or silence, retry with plain `{audio:true}` and then `applyConstraints`. Check `track.getSettings().echoCancellation` to see what was actually applied.
- **High-quality AirPods recording is unlikely for web apps.** iOS 26's `bluetoothHighQualityRecording` is a native `AVAudioSession` option. There is no sign WebKit exposes it, so assume web pages still get HFP-quality AirPods capture.

### Gaps
- Whether Safari 26/27 on iPhone actually honours `echoCancellation:false`, `noiseSuppression:false` and `autoGainControl:false`, as reported by `getSettings()`, was not verified. `voiceIsolation` support was not checked (the BCD file for `MediaTrackSupportedConstraints` did not download).
- No measured iPhone input or round-trip latency figures (speaker or wired) for Safari 26/27 were found.
- Whether WebKit bugs 221334 (AirPods stutter) and 218012 (speaker switch) are fixed in iOS 26/27 is unknown, because the bug pages were blocked.

---

## 3. Storage: IndexedDB/OPFS quotas and eviction on iOS, the 7-day cap, Home Screen behaviour, `navigator.storage.persist()`, and export/backup

### Takeaway
Since iOS 17, quotas are generous: an origin can use up to about 60% of the disk, and Home Screen web apps get the same quota as Safari. Home Screen web apps are **exempt from the 7-day deletion of script-writable storage**. `persist()` exists (Safari 15.2+), and WebKit says it grants it using heuristics such as "opened as a Home Screen Web App".

Storage is still not a guaranteed backup. Deleting the Home Screen icon, clearing website data, or device storage pressure can remove it, and developers in 2026 still treat exported files as the only reliable backup.

There is also a hosting-specific risk: **all GitHub Pages project sites of the same account share one origin** (`<user>.github.io`), so they share storage, quota and eviction.

**Works with caveats.**

### Cited Findings
- **Quotas (Safari 17+).** For a browser app, the origin quota is up to 60% of total disk and the overall quota up to 80%. For other apps using WebKit, it is 15% and 20%. A standalone web app (Home Screen on iOS, Dock on macOS) "has the same origin quota and overall quota" as when opened in the browser. Safari 17 no longer prompts for more space, and the Storage API is fully supported from Safari 17 / iOS 17. — [SNIPPET] [WebKit, Updates to Storage Policy (blog 14403, 2023)](https://webkit.org/blog/14403/updates-to-storage-policy/); [WebKit, Safari 17.0 features](https://webkit.org/blog/14445/webkit-features-in-safari-17-0/)
- **Persistent mode.** "An origin can check whether storage is in persistent mode with `StorageManager.persisted()` and request… `StorageManager.persist()`. WebKit currently grants a request based on heuristics like whether the website is opened as a Home Screen Web App." By default origins are "best-effort" and can be evicted. Origins are excluded from eviction if they have an active page at eviction time or are in persistent mode. — [SNIPPET] [WebKit blog 14403](https://webkit.org/blog/14403/updates-to-storage-policy/)
- **API versions.** MDN BCD lists `StorageManager.persist()` / `persisted()` and `getDirectory()` (OPFS) from Safari 15.2, `estimate()` from 17, and `FileSystemWritableFileStream` (OPFS `createWritable()`) only from **Safari 26**, all mirrored to iOS. `FileSystemSyncAccessHandle` (worker-only) is listed from 15.2. — [DATA] [MDN BCD StorageManager.json](https://github.com/mdn/browser-compat-data/blob/main/api/StorageManager.json), [FileSystemWritableFileStream.json](https://github.com/mdn/browser-compat-data/blob/main/api/FileSystemWritableFileStream.json)
- **The 7-day cap.**
  - Since iOS 13.4 / Safari 13.1, ITP deletes all script-writable storage (IndexedDB, localStorage, sessionStorage, service worker registrations and cache) after 7 days of Safari use with no user interaction on the site.
  - **"The first-party domain of home screen web applications is exempt"**. Home Screen apps "have their own counter of days of use".
  - — [SNIPPET] [WebKit, Tracking Prevention](https://webkit.org/tracking-prevention/); [iTnews (AU), 2020](https://www.itnews.com.au/news/apple-cops-flak-for-deleting-local-browser-storage-after-7-days-539833); [MDN: storage quotas and eviction](https://developer.mozilla.org/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria)
- **Developers remain unsure.** It is unclear whether `persist()` is granted in an installed iPad PWA and whether a grant exempts the origin from ITP. One project concluded that "the export file, not IndexedDB, is the only reliable durability guarantee" on iPadOS (opened 23 August 2026). — [READ] [PXMYH/Neurite issue #59](https://github.com/PXMYH/Neurite/issues/59). An Apple forum thread asks the same and has no definitive Apple answer. — [SNIPPET] [Apple Developer Forums 710157](https://developer.apple.com/forums/thread/710157)
- **iOS 26 Home Screen change.** On iOS 26, **every site added to the Home Screen opens as a web app by default** ("Open as Web App" toggle on), even without a manifest. Before iOS 26 this needed `apple-mobile-web-app-capable` or a standalone manifest. — [SNIPPET] [iDownloadBlog, June 2025](https://www.idownloadblog.com/2025/06/17/apple-ios-26-safari-web-apps-home-screen-bookmarks/); [heise](https://www.heise.de/en/news/iOS-26-and-iPadOS-26-Changed-web-app-behaviour-on-the-home-screen-10749652.html); [Apple Support: Open as web app](https://support.apple.com/guide/iphone/open-as-web-app-iphea86e5236/ios)
- **Shared GitHub Pages origin.** "All websites from the same GitHub account share localStorage among themselves, because localStorage is scoped by the origin." Project sites live at `https://username.github.io/repository-name/`. A library exists to prefix keys by path. — [SNIPPET] [TomasHubelbauer/github-pages-local-storage](https://github.com/TomasHubelbauer/github-pages-local-storage)
- **Current app.** Note by Note stores only a small JSON blob in `localStorage` (`note-by-note:v1`). — [LOCAL] `js/store.js`

### Inferences
- **Where to keep recordings.** Store "My songs" audio in **IndexedDB** as `Blob`s (or ArrayBuffers). Do not use `localStorage`, which is string-only and small; its Safari limit was not verified here but is commonly a few MB. OPFS is an option, but `createWritable()` only arrived in Safari 26. IndexedDB Blobs work on every iOS version the children are likely to have.
- **Persistence calls.** Call `navigator.storage.persist()` once from the Home Screen app, ideally after a tap, and show `persisted()` in a parent/settings screen. Expect it to be granted in standalone mode, though this is not verified on device.
- **What still deletes data.** Even when persisted, data is lost if the child deletes the Home Screen icon or a parent clears Safari website data. It may also differ between Safari and the Home Screen app, because Home Screen apps have separate storage from Safari tabs (commonly reported, not verified this session). Provide **Export / Back up** (share a ZIP-less bundle: one WAV per song plus a JSON index, or a single JSON with base64 for small libraries) and a matching **Import**.
- **Shared-origin privacy issue.**
  - Every other Pages project the owner publishes under the same account runs on the same origin. Any such site, or a compromised dependency in one, can read and delete the children's recordings in IndexedDB, and all of them share one quota and eviction fate.
  - Mitigations: a separate GitHub account or organisation used only for this app (its own `<org>.github.io` origin), or a custom domain. At minimum, namespace IndexedDB and localStorage names.
  - This matters more once real voice recordings of children are stored.
- **Exposure of the 7-day cap.** The cap matters only if a child uses the app in a Safari tab rather than the Home Screen icon. On iOS 26 most "Add to Home Screen" installs will be web apps by default, so in practice the exemption applies.

### Gaps
- Whether `persist()` returns true in a Home Screen app on iOS 26/27, and whether persistent mode survives low-storage eviction, was not verified (needs a device test).
- Safari's `localStorage` size limit was not verified.
- Whether a Home Screen app and Safari share the same IndexedDB for the same origin on iOS 26/27 was not verified this session.

---

## 4. Sharing and exporting audio: Web Share API Level 2 with files on iOS, download fallbacks, GarageBand/Files

### Takeaway
File sharing through the iOS share sheet (AirDrop, Messages, Save to Files and other apps) has worked since iOS 15. It must be called directly from a tap, and the file should be prepared **before** the tap. Send **files only** (no text/title), and feature-detect with `canShare({files})`. Which audio MIME types iOS accepts is not documented: `.m4a` and `.wav` are expected to work but need a device test. **Works with caveats.**

### Cited Findings
- **Versions.** MDN BCD lists `navigator.share()` from Safari 12.1 and `navigator.canShare()` from Safari 14 (mirrored to iOS). — [DATA] [MDN BCD Navigator.json](https://github.com/mdn/browser-compat-data/blob/main/api/Navigator.json)
- **File sharing.** Safari 15 added Web Share Level 2, which shares image, video, audio and text files from Safari to apps via the native share sheet. — [SNIPPET] [Bits and Pieces: Sharing files from iOS 15 Safari](https://blog.bitsrc.io/sharing-files-from-ios-15-safari-to-apps-using-web-share-c0e98f6a4971?gi=c8e0ed092d48)
- **Needs a tap.** `navigator.share()` requires transient activation (a user gesture) and HTTPS. — [SNIPPET] [MDN: Navigator.share()](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share)
- **Commonly allowed audio types.** Commonly cited shareable audio extensions are `.flac`, `.m4a`, `.mp3`, `.oga`, `.ogg`, `.opus`, `.wav` and `.weba`. This list comes from Chromium/web.dev and is not documented for Safari. — [SNIPPET] [web.dev: Web Share](https://web.dev/articles/web-share)
- **iOS PWA field notes.** A developer's iOS PWA notes say:
  - `share({files})` opens Save to Files, AirDrop and Mail on iPhone Home Screen installs and in Safari tabs.
  - "iOS is reported to fail when text or title is sent alongside files", so send a files-only payload.
  - Slow pre-processing (IndexedDB reads, hashing) can let user activation expire before `share()`, which needs a two-step "prepare, then Share" flow.
  - On `NotAllowedError` or `TypeError`, fall back to a blob download.
  - Device testing was incomplete.
  - — [READ] [lumen-ai-notes issue #106](https://github.com/Aman4563/lumen-ai-notes/issues/106)
- **GarageBand.** GarageBand for iPhone shares songs as audio via the share sheet, including "Save to Files". One source says iOS GarageBand exports only `.m4a`. — [SNIPPET] [Apple Support: Share songs with GarageBand for iPhone](https://support.apple.com/guide/garageband-iphone/share-songs-chs39284d66/ios); [SNIPPET, low-quality] [VideoProc](https://www.videoproc.com/media-converter/save-garageband-as-mp3.htm)

### Inferences
- **Export flow.** Build the WAV (or M4A) `File` when the take is saved, so the Share tap does no async work before `navigator.share({files:[file]})`. Name files meaningfully (for example `Mia - Twinkle - 2026-10-01.wav`).
- **Fallback.** Use `<a href=blobURL download>`. Its behaviour inside an iOS Home Screen app was not verified this session. A copy-to-clipboard of a data URL is not practical for audio.
- **GarageBand.** A WAV or M4A saved to Files should be importable into GarageBand on iPhone through its file/loop browser. This was not verified this session.
- **Child-safety design.** The share sheet cannot restrict recipients. For under-13s, put Share/Export behind a parent gate. This is a design choice consistent with the OAIC draft children's code direction noted in the sibling notes, not a legal requirement found here.

### Gaps
- `navigator.canShare({files:[new File([...], 'x.wav', {type:'audio/wav'})]})` and the `audio/mp4` / `audio/x-m4a` equivalents were not confirmed on iOS 26/27.
- `<a download>` behaviour in standalone mode was not verified.
- Apple's "import audio files into GarageBand for iPhone" support page was not retrieved.

---

## 5. On-device ML in Safari on iPhone (TF.js, ONNX Runtime Web, WebGPU), model sizes and speed (Basic Pitch, CREPE-like), and memory limits

### Takeaway
WebGPU shipped on iPhone in Safari 26 (September 2025), and ONNX Runtime Web and TF.js run in Safari. Small pitch and transcription models are realistic for **post-hoc analysis of a recorded take**. Examples are Basic Pitch (about 0.9 MB of weights, measured) and the tiny trackers SwiftF0/PESTO (tens of thousands to about 130k parameters).

The practical limits are elsewhere:
- **Runtime size.** ONNX Runtime Web's WASM is 10–24 MB.
- **Memory.** iPhone tabs reload without an exception when over a device-dependent budget, as low as about 100–200 MB on low-RAM devices.
- **Stability.** There is a reported WebGPU crash after about 500 inferences on iOS 26.3.
- **Threads.** Multi-threaded WASM needs cross-origin isolation, which GitHub Pages cannot set without a service-worker hack.

Generative "turn my song into a real song with my voice" models are far beyond this envelope on a phone browser. **Small models work with caveats; large generative models do not work.**

### Cited Findings
- **WebGPU shipped (vendor claim).** "WebKit for Safari 26.0 adds support for WebGPU… shipping in Safari 26.0 for macOS, iOS, iPadOS, and visionOS". WebKit also says ONNX Runtime and other frameworks "all work great in Safari 26.0". — [SNIPPET] [WebKit, Features in Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/). MDN BCD lists `GPU` from Safari 26. — [DATA] [MDN BCD GPU.json](https://github.com/mdn/browser-compat-data/blob/main/api/GPU.json)
- **Baseline status.** WebGPU is described as Baseline from January 2026 across Chrome, Edge, Firefox and Safari 26+. — [SNIPPET; secondary blog] [utsubo: Frontier Web APIs 2026](https://www.utsubo.com/blog/frontier-web-apis-2026-production-ready); [web.dev: WebGPU supported in major browsers](https://web.dev/blog/webgpu-supported-major-browsers)
- **WebGPU crash on iOS 26.3.** A model (YOLO26n) on ONNX Runtime Web 1.24.3 with the WebGPU provider crashes iOS Safari 26.3 after "around 500 inference" runs but runs fine in Chrome WebGPU. It looks memory-related. The issue was reported 7 March 2026 and closed as stale with no fix. — [READ] [microsoft/onnxruntime issue #27584](https://github.com/microsoft/onnxruntime/issues/27584)
- **Tab memory budgets.**
  - iOS has no fixed per-tab limit. The web content process gets the lower of WebKit's memory-pressure limit and the jetsam limit, which varies with RAM, load and uptime.
  - Reported ceilings: about 3 GB on iPhone 15 Pro, and about 1.5 GB on iPhone 12 Pro (about 3 GB right after a reboot).
  - Pages crash at about **100 MB on iPhone SE (3rd gen)** and about 200 MB on iPad (8th gen) running **iOS 26.2**.
  - No exception is thrown. The page reloads with "This webpage was reloaded because it was using significant memory".
  - A single WebGPU storage binding is capped at 256 MB on phones.
  - — [SNIPPET; pages blocked] [Lapcat Software, "Mobile Safari web pages are severely limited by memory" (7 Jan 2026)](https://lapcatsoftware.com/articles/2026/1/7.html); [Nehanth/pooled issue #207](https://github.com/Nehanth/pooled/issues/207); [zenn.dev: ONNX Runtime Web memory on iPhone SE2](https://zenn.dev/kaz_sakai/articles/ios-safari-onnx-memory?locale=en)
- **ONNX Runtime Web binary sizes.**
  - `ort-wasm-simd-threaded.wasm` is about 10.6 MB in v1.17.3 and about 13.8 MB in a 1.29 dev build.
  - The WebGPU build is about 23.9 MB.
  - A developer found the 6 MB ORT WASM cold start took longer than loading a 44 MB model.
  - Custom "compaction" builds can cut it to 1–2 MB.
  - — [SNIPPET] [unpkg onnxruntime-web 1.17.3 dist](https://app.unpkg.com/onnxruntime-web@1.17.3/files/dist); [unpkg 1.29.0-dev](https://app.unpkg.com/onnxruntime-web@1.29.0-dev.20260724-ed98916356/files/dist/ort-wasm-simd-threaded.wasm); [toolkitfree PR #26](https://github.com/Hew007/toolkitfree/pull/26); [DEV: ORT cold start](https://dev.to/pm_cheng_3f36acecfb9c59f5/in-browser-ai-cold-start-the-6-mb-onnx-runtime-wasm-took-longer-than-the-44-mb-model-5bp9); [ML Digest: ORT compaction](https://ml-digest.com/onnx-runtime-compaction-for-browser-ml/)
- **Threads on GitHub Pages.** `SharedArrayBuffer` (needed for multi-threaded WASM) requires the `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers. **GitHub Pages does not let you set custom headers.** The workaround, `coi-serviceworker`, re-serves pages with those headers from a service worker. — [SNIPPET] [GitHub community discussion #13309](https://github.com/orgs/community/discussions/13309); [Wasmer docs: COOP/COEP on GitHub Pages](https://docs.wasmer.io/sdk/wasmer-js/how-to/coop-coep-headers/); [jupyterlite issue #1409](https://github.com/jupyterlite/jupyterlite/issues/1409)
- **Basic Pitch model size (measured).** `spotify/basic-pitch-ts` `model/model.json` is 174,537 bytes and `model/group1-shard1of1.bin` is 742,392 bytes, about **0.9 MB in total** (TF.js graph model). The package depends on `@tensorflow/tfjs ^3.2.0`. — [DATA] [spotify/basic-pitch-ts](https://github.com/spotify/basic-pitch-ts). The sibling note reports Apache-2.0, 22,050 Hz resampling, note and MIDI output, and "a few seconds" for a 30-second clip in the browser. — [SIBLING] `free_sing_creative_features.md` citing [DEV: Basic Pitch in the browser](https://dev.to/partfit3d/running-spotifys-basic-pitch-in-the-browser-for-audio-to-midi-44bc)
- **Pitch tracker sizes.** CREPE is about 22M parameters and 0.4× real time on CPU. SwiftF0 has 14k–96k parameters (MIT, ONNX Runtime Web demo, 176 ms lookahead). PESTO has about 130k parameters (LGPL-3.0, under 10 ms latency). — [SIBLING] `../Note by Note singing app review/pitch_detection_and_scoring_tech.md` ([arXiv 2508.18440](https://arxiv.org/abs/2508.18440), [lars76/swift-f0](https://github.com/lars76/swift-f0), [SonyCSLParis/pesto](https://github.com/SonyCSLParis/pesto))
- **WebAssembly JSPI in Safari 27.** Safari 27 adds WebAssembly JSPI (JavaScript Promise Integration). — [SNIPPET] [WebKit, Safari 27 beta](https://webkit.org/blog/17967/news-from-wwdc26-webkit-in-safari-27-beta/)

### Inferences
- **Basic Pitch.** About 0.9 MB of weights is small, but TF.js itself is a large script (size not measured this session). It is still usable with no build step via a CDN `<script>` or a vendored copy. Run it only **after** a take finishes, on a downsampled buffer, then dispose tensors. This turns a free-sing take into MIDI or notes (a "song sheet" of what they sang, or replay of their melody on piano). It is not live.
- **ONNX Runtime Web without threads.** Single-threaded WASM (`numThreads = 1`) avoids the COOP/COEP problem on GitHub Pages. Tiny trackers (SwiftF0/PESTO) should still run faster than real time on recent iPhones, but this was not measured.
- **coi-serviceworker.** It would interfere with the app's existing `sw.js` and any cross-origin CDN loads. Avoid it unless threads are essential.
- **Memory headroom.** The low-RAM ceilings (about 100 MB on iPhone SE 3 under iOS 26.2) mean the app, a 3-minute Float32 buffer (about 35 MB at 48 kHz) and a 14 MB WASM runtime together could approach the limit on older or cheaper phones. Downsample early, cap take length, and free buffers.
- **Generative voice/song models.** Singing-voice conversion, accompaniment generation, or "make it a real song with my voice" models are hundreds of MB to GBs and are GPU-heavy. They are **not feasible on-device in a phone browser** in 2026, given the memory budgets and crash reports above. They would mean uploading a child's voice to a cloud service, which is a privacy and legal decision (covered by other researchers), not a browser capability.

### Gaps
- No iPhone benchmark was found for Basic Pitch, SwiftF0 or PESTO in Safari (WASM or WebGPU).
- TF.js bundle size was not measured (jsdelivr was blocked).
- Whether TF.js's WebGPU backend is stable on iOS 26/27 was not verified.
- The Lapcat/pooled memory numbers are snippet-level; the original pages could not be opened.

---

## 6. `speechSynthesis` and `webkitSpeechRecognition` on iOS in standalone mode, and their interaction with the audio session and mic

### Takeaway
- **`speechSynthesis` works** on iOS (Safari 7+) but is fragile. It must start from a tap. It can freeze its queue. Once the mic and an AudioContext are active, iOS can route it quietly or to the earpiece. `cancel()` can leave the audio session in a playback state that silences the mic.
- **`webkitSpeechRecognition`** (Safari 14.1+) is **not available in Home Screen web apps**, mutes other mic capture while running, and is not a fit for this app.

For spoken prompts while the pitch detector runs, pre-made clips played through the existing AudioContext are the robust option (see sibling `spoken_guidance_for_pre_readers.md`). **Synthesis works with caveats; recognition does not work in standalone mode.**

### Cited Findings
- **Versions.** MDN BCD lists `SpeechSynthesis` from Safari 7 and `SpeechRecognition` from Safari 14.1 with the `webkit` prefix (both mirrored to iOS). For `SpeechRecognition.continuous` it notes Safari "returns multiple results when set to false". — [DATA] [MDN BCD SpeechSynthesis.json](https://github.com/mdn/browser-compat-data/blob/main/api/SpeechSynthesis.json), [SpeechRecognition.json](https://github.com/mdn/browser-compat-data/blob/main/api/SpeechRecognition.json)
- **Recognition in standalone mode.** `webkitSpeechRecognition` works in Safari but not when the web app is added to the iOS Home Screen. WebKit bug 225298 says it "is not available in SafariViewController and web apps added to Home Screen for now". — [SIBLING] [Apple Developer Forums 748048](https://developer.apple.com/forums/thread/748048); [WebKit bug 225298](https://bugs.webkit.org/show_bug.cgi?id=225298). A search summary also says Safari on mobile "won't allow the Speech Recognition API once installed as a PWA". — [SNIPPET] (result set for "speechSynthesis iOS PWA standalone microphone")
- **Recognition mutes other capture.** Using SpeechRecognition mutes the mic track elsewhere on the page (reported for WebRTC). — [SIBLING] [WebKit bug 180748](https://bugs.webkit.org/show_bug.cgi?id=180748)
- **Secure contexts.** Safari 26.0 restricted SpeechRecognition to secure contexts. — [SIBLING] [WebKit, Safari 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/)
- **Speech and recognition loop in an iPhone PWA (September 2026).** An app found that after one speech-synthesis reply, the mic "opens automatically… but doesn't react when spoken to" in an iPhone Home Screen app. Suspected causes, unconfirmed:
  - transient activation expiring (stricter in standalone mode);
  - **the AVAudioSession staying in "playback" after `speechSynthesis.cancel()`, so input reads as silent**;
  - `cancel()` breaking `onend`;
  - reused recognition objects.

  The planned fix is to keep the mic open during synthesis. The issue was opened 6 September 2026. — [READ] [guchi-apps/aide-bot issue #179](https://github.com/guchi-apps/aide-bot/issues/179)
- **Speech routed quietly with the mic on.** With AudioContext and getUserMedia both active, WebKit uses play-and-record. iOS treats `speechSynthesis` as "system speech" that can play quietly or from the earpiece, while AudioContext output stays on the speaker. — [SIBLING/SNIPPET] [Sam Eddy, "iOS Safari audio sessions"](https://samueleddy.com/writing/ios-safari-audio-sessions/)
- **Tap requirement.** iOS only speaks when `speak()` is called inside a user gesture. Speaking an empty or volume-0 utterance can freeze the queue. Safari 27 reportedly fixed `cancel()` removing utterances queued by later `speak()` calls. — [SIBLING] [easy-speech issue #366](https://github.com/leaonline/easy-speech/issues/366); [Multi-Voice-Timer PR #8](https://github.com/Outtech105k/Multi-Voice-Timer/pull/8); [Releasebot, Safari Sept 2026](https://releasebot.io/updates/apple/safari)
- **Recognition audio leaves the device.** Safari sends recognition audio to Apple's servers, and the newer on-device SpeechAnalyzer (iOS 26) has no Web Speech surface. — [SIBLING] `spoken_guidance_for_pre_readers.md` §5; [addpipe: Apple SpeechAnalyzer](https://blog.addpipe.com/apple-speechanalyzer-api/)

### Inferences
- **Audio session.** Note by Note already sets `play-and-record` and keeps the mic stream open during a session. That is the configuration the aide-bot fix moves toward, so the main residual risk is volume and routing of `speechSynthesis`, not mic loss.
- **Spoken instructions.** Play pre-recorded clips through the AudioContext. Use `speechSynthesis` only for dynamic text before the mic starts, from a tap handler.
- **Voice commands for pre-readers.** `webkitSpeechRecognition` is a dead end in a Home Screen app. Big picture buttons and audio cues are the alternative.
- **Children's privacy.** Even in a Safari tab, speech recognition would send children's speech to Apple. That is a third-party disclosure to avoid for under-13s.

### Gaps
- No primary source compares `speechSynthesis` behaviour in standalone mode with Safari tabs.
- Which en-AU voices iOS 26/27 exposes to `getVoices()` was not verified.
- The current status of WebKit bug 225298 (bug page blocked) is unknown.

---

## 7. Capability verdicts (iPhone, Safari 26.x–27.0 and Home Screen apps; checked 1 October 2026)

### Takeaway
Everything Note by Note needs for **local** record, keep, play back, mix, export and share can be done in plain JavaScript in a Home Screen app. The weak spots are:
- MediaRecorder in standalone mode (avoid it; use a PCM/WAV tap);
- Bluetooth headphones while recording;
- echo-cancellation constraint handling;
- `persist()` uncertainty (always offer export);
- low-RAM memory ceilings for ML;
- speech recognition (unavailable in standalone mode).

### Cited Findings

| Capability | Verdict | Key evidence |
|---|---|---|
| Mic capture plus live pitch analysis (current app) | Works | `getUserMedia`, AudioContext and AudioSession are in BCD; app in daily use [LOCAL]. iOS 26.1 beta 1 broke it briefly ([forum 802555](https://developer.apple.com/forums/thread/802555)) |
| `echoCancellation/noiseSuppression/AGC:false` honoured | Uncertain / caveats | Ignored per [WebKit 179411](https://bugs.webkit.org/show_bug.cgi?id=179411) (snippet). PWA mic silent when passed in `getUserMedia` per [yamachat #80](https://github.com/yamboleeroy-ai/yamachat/pull/80) (29 Sep 2026). channelCount ignored on macOS Safari 26 per [forum 804765](https://developer.apple.com/forums/thread/804765) |
| MediaRecorder `audio/mp4` (AAC) in Safari tab | Works | [BCD](https://github.com/mdn/browser-compat-data/blob/main/api/MediaRecorder.json); [WebKit 18.4](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/) |
| MediaRecorder in Home Screen app | Works with caveats (reported to fail after first launch, Aug 2025, unresolved) | [forum 797987](https://developer.apple.com/forums/thread/797987) |
| WebM/Opus, Ogg, ALAC/PCM via MediaRecorder | Works on iOS 18.4+ (vendor statement) | [WebKit 18.4](https://webkit.org/blog/16574/webkit-features-in-safari-18-4/) |
| PCM capture via AudioWorklet, encoded to WAV in JS | Works (Safari 14.1+), recommended | [BCD AudioWorklet](https://github.com/mdn/browser-compat-data/blob/main/api/AudioWorklet.json) |
| Play take with guide / mix / offline render | Works | Web Audio core; outputLatency 18.4+ ([BCD](https://github.com/mdn/browser-compat-data/blob/main/api/AudioContext.json)) |
| Automatic latency alignment | Works with caveats (output latency only; input must be calibrated) | [BCD](https://github.com/mdn/browser-compat-data/blob/main/api/AudioContext.json) |
| Recording with AirPods | Works poorly (HFP 8–16 kHz, high latency, stutter and routing bugs) | [WebKit 221334](https://bugs.webkit.org/show_bug.cgi?id=221334), [218012](https://bugs.webkit.org/show_bug.cgi?id=218012) (snippets) |
| Choose output device (`setSinkId`) | Does not work | [BCD](https://github.com/mdn/browser-compat-data/blob/main/api/AudioContext.json) |
| IndexedDB Blobs, large quota | Works (up to about 60% of disk per origin, Safari 17+) | [WebKit 14403](https://webkit.org/blog/14403/updates-to-storage-policy/) (snippet) |
| Survive the 7-day ITP purge | Works for Home Screen apps; not for Safari-tab use | [WebKit Tracking Prevention](https://webkit.org/tracking-prevention/) (snippet) |
| `navigator.storage.persist()` | Exists (15.2+); grant is heuristic; effect not verified | [BCD](https://github.com/mdn/browser-compat-data/blob/main/api/StorageManager.json); [WebKit 14403](https://webkit.org/blog/14403/updates-to-storage-policy/) |
| OPFS | Works (15.2+); `createWritable()` only from Safari 26 | [BCD](https://github.com/mdn/browser-compat-data/blob/main/api/FileSystemWritableFileStream.json) |
| Share audio files via share sheet | Works with caveats (tap, files-only, MIME acceptance untested) | [BCD](https://github.com/mdn/browser-compat-data/blob/main/api/Navigator.json); [lumen #106](https://github.com/Aman4563/lumen-ai-notes/issues/106) |
| WebGPU | Works (Safari 26+, vendor claim); crash reports exist | [WebKit 26.0](https://webkit.org/blog/17333/webkit-features-in-safari-26-0/); [ORT #27584](https://github.com/microsoft/onnxruntime/issues/27584) |
| Small ML models (Basic Pitch, about 0.9 MB; SwiftF0/PESTO) post-hoc | Works with caveats (runtime size, memory) | [basic-pitch-ts](https://github.com/spotify/basic-pitch-ts) [DATA] |
| Multi-threaded WASM on GitHub Pages | Does not work without the coi-serviceworker hack | [GitHub discussion #13309](https://github.com/orgs/community/discussions/13309) |
| Generative voice/song models on-device | Does not work (memory/size) | Inference from memory limits above |
| `speechSynthesis` | Works with caveats (tap, queue freezes, routing with mic on) | [BCD](https://github.com/mdn/browser-compat-data/blob/main/api/SpeechSynthesis.json); sibling sources |
| `webkitSpeechRecognition` in Home Screen app | Does not work | [forum 748048](https://developer.apple.com/forums/thread/748048); [WebKit 225298](https://bugs.webkit.org/show_bug.cgi?id=225298) |

### Inferences
- Several items changed recently and are flagged as such:
  - `outputLatency` (18.4, March 2025);
  - OPFS `createWritable` (Safari 26, September 2025);
  - WebGPU (Safari 26);
  - iOS 26 "every Home Screen site is a web app" (September 2025);
  - Safari 27.0 media fixes (2026);
  - the yamachat echo-cancellation report (29 September 2026).
- Re-test on the children's actual iOS versions before relying on any of them.

### Gaps
- No item in the table was tested on a real iPhone for this note.
- A short on-device test page would settle the open questions: `isTypeSupported` list, `getSettings()` after constraints, `persist()` result, `canShare` for WAV/M4A, `outputLatency` per route, and memory headroom.

---

## Implications for Note by Note

### Takeaway
The highest-value, lowest-risk path is entirely on-device:
1. Record a free-sing (or lesson) take by tapping the existing Web Audio graph.
2. Play it back with the pitch trace in sync.
3. Score it after the fact.
4. Keep it in IndexedDB as "My songs".
5. Let a parent export or share it through the share sheet.

All of this is free, needs no server or accounts, and fits plain JS with no build step. Anything that sends a child's voice off the phone (cloud AI "make it a real song", speech recognition) moves the project into a different privacy and legal category and is not needed for the core features.

### Cited Findings
- The technical basis is in sections 1–7 above. Privacy context:
  - The OAIC Children's Online Privacy Code exposure draft is dated 31 March 2026, with registration due by 10 December 2026. — [SIBLING] `free_sing_creative_features.md`
  - Safari speech recognition sends audio to Apple. — [SIBLING] `spoken_guidance_for_pre_readers.md`

### Inferences
Options are ranked by value against cost, effort (for a plain-JS PWA), and privacy/legal risk. All costs are A$0 unless stated.

| Rank | Option | Value | Effort | Privacy / legal risk | Notes |
|---|---|---|---|---|---|
| 1 | **Record a take in Free sing (and lessons) via an AudioWorklet PCM tap → WAV; replay with the saved pitch trace** | Very high: listening back plus seeing the line is the missing "wow" in Free sing | M (one worklet file, WAV encoder of about 40 lines, UI) | Low: never leaves the phone | Avoids the MediaRecorder Home Screen bug; sample-aligned with the trace; downsample to 22–24 kHz; cap length by age; free buffers |
| 2 | **Post-take score / summary for Free sing** (time in tune to the nearest semitone, range used, longest held note, "your melody" replayed on piano from detected notes) | High | S–M (reuse existing tracker output; no ML) | Low | Gives Free sing a reward without judging creativity; uses data already computed live |
| 3 | **"My songs" library in IndexedDB + `navigator.storage.persist()` + Export/Import backup** | High (keepsakes; protects against loss) | M | Low–medium | Use IndexedDB Blobs, not localStorage. Call `persist()` from the Home Screen app. Always offer export because `persist()` is unverified. **Isolate the origin** (dedicated GitHub org/user for this app, or a custom domain) or at least namespace stores, because all `<user>.github.io` projects share storage |
| 4 | **Share/export via share sheet (files only, WAV or M4A), behind a parent gate** | Medium–high (family sharing, GarageBand/Files) | S | Medium (leaves the device; recipients uncontrolled) | Prepare the File before the tap; fall back to download; no text/title in the share payload |
| 5 | **"Sing with the piano" mix-down**: render voice and synthesized backing in an `OfflineAudioContext` to one WAV | Medium–high ("a real song" feel, all local) | M | Low | Because the app knows the notes, it can regenerate a clean piano under the take (no bleed). Needs a latency offset from `outputLatency` plus one-time calibration. Recommend wired earbuds; warn on AirPods |
| 6 | **Defensive mic setup**: retry `getUserMedia({audio:true})` then `applyConstraints` if the stream is silent or fails; check `getSettings()`; handle `interrupted` and `devicechange` | Medium (prevents "mic dead" support issues) | S | None | Driven by the 29 Sept 2026 iOS PWA report and the iOS 26.1 beta regression |
| 7 | **Voice prompts as pre-recorded clips through the AudioContext**; `speechSynthesis` only before the mic is on | High for pre-readers (detailed in sibling note) | M | Low (on-device; parent-recorded voices stay local) | Avoids routing and ducking problems with the mic on |
| 8 | **Optional offline transcription with Basic Pitch (TF.js)** to turn a made-up song into notes/MIDI or a printable "song sheet" | Medium | M–L (adds a large TF.js dependency; memory on old iPhones) | Low | Post-hoc only; lazy-load on demand; test on the oldest family iPhone |
| 9 | **ONNX tiny tracker (SwiftF0/PESTO) for rescoring** | Low–medium over the current tracker | L | Low | Single-threaded WASM to avoid COOP/COEP; 10–14 MB runtime download |
| 10 | **Cloud AI "make it a real song with my voice"** | Fun, but not needed for learning | L plus ongoing cost | **High**: uploads children's voice (biometric-like personal information) to third parties, often US-based with 13+/18+ terms; conflicts with the app's "nothing uploaded" design | Not a browser capability question; on-device generation is infeasible on iPhone in 2026 |
| 11 | **Voice commands (`webkitSpeechRecognition`)** | Low | — | Medium (audio to Apple) | Does not work in Home Screen apps; avoid |

**Additional notes**
- **Privacy copy.** Update it from "nothing is recorded" to something like: "Recordings stay on this phone unless a grown-up shares them". Add per-song Delete and Delete all.
- **Legal position (inference, not legal advice).** For a family-only, on-device app with no collection by the developer, Australian Privacy Act obligations are unlikely to be engaged. Still, design to the OAIC draft children's code principles: data minimisation, easy deletion, no third-party sharing by default.
- **US rules.** COPPA becomes relevant only if a US-based service collects children's voice data, for example a cloud AI or speech service.
- **Test checklist for one device session** (iOS 26.x and 27.0, Home Screen app):
  1. `MediaRecorder.isTypeSupported` list, and a second-launch recording.
  2. `getSettings()` after echo cancellation off.
  3. `storage.persist()` and `persisted()`.
  4. `canShare` for `audio/wav` and `audio/mp4`.
  5. `outputLatency` on speaker, wired and AirPods.
  6. A 3-minute take on the oldest iPhone without a memory reload.
