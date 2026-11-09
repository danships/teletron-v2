# Characters: assistant and pet

This file describes the two characters, their skins and the behaviour of the pet. It extends [architecture.md](architecture.md) sections 7, 9, 13 and 14. The decisions are ADR-044 to ADR-055.

## 1. Two characters

- **Assistant:** a reliable helper. It answers questions, shows data and starts actions. Its voice loop is in architecture section 13 (ADR-035).
- **Pet:** the assistant's pet. It is playful and does not have to be useful. It has needs, moods and a day rhythm.
- Both are characters in the sense of ADR-036. Each has its own personality and its own memory, keyed by character and person (ADR-037).
- Both can share one screen. The display node renders both in **one render loop**, so a Pi does not run two loops (ADR-044).
- **The hub owns the state** of both characters: activity state, mood, needs, props, sleep and memory. Display nodes only render what the hub sends (ADR-005).

## 2. States and moods

- **Activity states:** `idle`, `listening`, `thinking`, `speaking`, `sleeping`.
- **Moods:** for example `happy`, `sad`, `curious`, `tired`. Each mood has an intensity from 0 to 1.
- The hub sets the activity state from the voice loop and from the sleep rhythm.
- **Mood tags:** the LLM sends a simple tag (mood and intensity) with each assistant reply. The hub applies it to the character (ADR-055). Pet moods also come from its needs and from care.

## 3. Skins

A skin is how a character looks. Skins are data packages, not code (ADR-021, ADR-045).

### 3.1 Skin package

- **Manifest (JSON):**
  - name, character type (`assistant` or `pet`) and render type
  - supported states and moods, with a fallback for each unsupported one
  - playfulness level from 0 to 1
  - supported props, and whether the skin has a mouth (for lip sync)
  - the matching skin for the other character (the pair)
- **Animation map:** connects states, moods and props to animations in the model files. Generic animations (for example idle, walk, wave, talk) are mapped to states and moods. Procedural layers go on top: blinks, breathing, eye tracking, small random motion.
- **Model files:** sprites, images, Rive or Live2D files, GLB or VRM models. They are assets on the hub, addressed by content hash (ADR-025).
- Skins contain no scripts. The runtimes for Rive, Live2D and three.js ship with the display node.

### 3.2 Render types

From simple to rich:

1. Procedural eyes and pixel sprites.
2. Illustrated 2D: Rive, Live2D.
3. Rigged 3D: GLB or VRM through three.js.

A display node declares which render types it supports in its manifest. A skin that needs a render type the node does not support is a technical limit. The hub blocks it on that display.

### 3.3 Fallbacks and pairs

- An unsupported state or mood falls back to the fallback in the manifest. If there is none, it falls back to `idle` with a neutral mood. A skin never fails because of a missing animation.
- Assistant and pet skins come as matched pairs. Mix and match is allowed. If the styles do not match, the hub shows a soft "styles clash" warning and continues.
- Only technical limits block a skin: an unsupported render type, a model that is too large, or a missing required file.

### 3.4 Models from other sources

- Prefer downloaded pre-rigged models, for example from Quaternius, Kenney, Sketchfab or VRoid Hub (ADR-054).
- These models are for personal use only. Do not publish or share skins that contain them. The manifest records the source and the license of each model file.

### 3.5 Props

- Props are small items on the character: sunglasses, a scarf, skates, seasonal hats. They depend on weather and holidays. There are no full scenes.
- The pet wears props when its skin supports them.
- The assistant wears props only when the playfulness level of its skin allows it.

## 4. Skin workflow

Agents make skins on request. The format must stay simple enough for an agent to write correctly (ADR-046).

1. **Draft:** an agent creates the skin through MCP. The hub validates the manifest and the files.
2. **Preview:** on a laptop node, a preview mode cycles through all states, moods and props. Missing animations and fallbacks are easy to see.
3. **Test-push:** the skin goes to one display only.
4. **Publish:** the skin becomes available for all displays.

Each step is a new version with rollback (ADR-034).

## 5. Pet behaviour

### 5.1 Time

- **Compressed visual day:** the pet lives a full day in a shorter period. The default is approximately one hour for each pet day. The length is a setting for each pet (ADR-047).
- **Needs** (for example hunger, attention, rest) advance slowly on real time, not on pet time.
- **Sleep:** the pet and the assistant have separate sleep rhythms. A tap wakes the character.

### 5.2 Care and neglect

- Care comes from a tap on the screen, from voice through the assistant ("feed the pet"), and from work events: builds, PRs, calendar items.
- Neglect never punishes the pet. It only makes the pet ask for interaction more.

### 5.3 Pet events

- The pet sends generic events to the event bus, for example `pet.needs-attention`, `pet.hungry`, `pet.asleep`, `pet.woke-up`.
- All pet events have the category `pet`. Displays accept events by category (ADR-048, architecture section 9).
- Pet events start at a low priority. While they are ignored, the priority goes up slowly. It stops at a ceiling below important events, for example a doorbell.

## 6. Lip sync

Only for skins with a mouth (ADR-053):

- **Volume:** the mouth opens with the volume of the TTS audio. The display node does this locally.
- **Visemes:** when the TTS provider gives visemes, the node uses them instead of the volume.

## 7. People and pets

- **Identity on each display:** a person sets who is there, for example with a "who's here" button on a shared screen. There is no presence detection. The display keeps the last identified person. Without one, it uses a default identity (ADR-049).
- **Personal pet:** one shared core (life, needs) plus a layer for each person (looks, behaviour, memories, interactions). The display shows the layer of the current person.
- **Household pet:** shared experiences only, no layer for each person.
- Personal or household is a setting for each pet (ADR-050).
- There is no privacy separation between household members on shared screens. A personal layer on a shared screen is visible to everyone in the room.

## 8. Hardware for characters

- Characters render on Pi web displays and on the laptop (architecture section 2).
- **The iPixel Color panel does not show the pet.** It shows supporting events only: attention, hunger, thinking. The Pi sends pre-rendered GIF loops or images to the panel over Bluetooth (ADR-051).
- **Voice:** each Pi has a mic, paired with its display. The display of that Pi answers. Each character has its own local wake word, for example with openWakeWord. The user picks the names. The agent flags names that can cause false triggers (ADR-052).
- The fallback between local and cloud STT, LLM and TTS is in architecture section 12 (ADR-012). This file does not change it.

## 9. Open questions

- Skin manifest format: our own JSON only, or also VRM metadata?
- Which tool makes the GIF loops for the iPixel panel, and what are its limits for size, frames and colours?
- Mood tags: structured output from the LLM, or a tag in the reply text?
- How the hub stores the shared pet core and the layers for each person in supersave. Decide in the slice spec.
- Where the pet slice goes in the roadmap: after the assistant slice, or before it with a simple sprite skin.
