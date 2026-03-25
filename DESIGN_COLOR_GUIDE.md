# Mobile App Color Guide

Source reference:
- Based on the palette used in `Swcmt2026SpringEvent/public/styles.css`
- Adapted for mobile app UI usage

## Brand Direction

Theme:
- Clear sky blue as the primary brand tone
- Warm coral and orange for key actions
- Fresh yellow and green as seasonal accent colors
- Deep blue-gray text for stable readability

## Core Palette

### Primary

- `Primary / 500`: `#2F8FE8`
- `Primary / 400`: `#66B8FF`
- `Primary / 700`: `#0C86D3`
- `Sky Top`: `#54C3F7`
- `Sky Mid`: `#1599E4`
- `Sky Deep`: `#0C86D3`

### Secondary

- `Coral`: `#FF7F88`
- `Warm Orange`: `#FFB24F`

### Accent

- `Accent Yellow`: `#FFD84F`
- `Accent Green`: `#34C86C`

### Text

- `Text / Primary`: `#1F3550`
- `Text / Secondary`: `#53708F`
- `Text / On Primary`: `#FFFFFF`

### Surface

- `Surface / App`: `#F7FCFF`
- `Surface / Card`: `#FFFFFF`
- `Border / Default`: `rgba(33, 110, 177, 0.16)`

### Status

- `Success`: `#27965F`
- `Warning`: `#CC7D1B`
- `Error`: `#C63A2F`
- `Danger Gradient Start`: `#D94A4A`
- `Danger Gradient End`: `#F08A5C`

## Recommended Usage

- Use `#2F8FE8` as the main brand color.
- Use `#1F3550` for primary text.
- Use `#53708F` for helper text, descriptions, and metadata.
- Use white card surfaces on top of a very light blue app background.
- Use the coral-to-orange gradient for the most important CTA buttons.
- Reserve green, yellow, and warning colors for status and accent use instead of general navigation.

## App Design Tokens

```txt
bg.app = #F7FCFF
bg.card = #FFFFFF
bg.hero = linear-gradient(180deg, #54C3F7 0%, #1599E4 36%, #0C86D3 100%)

text.primary = #1F3550
text.secondary = #53708F
text.onPrimary = #FFFFFF

brand.primary = #2F8FE8
brand.primaryLight = #66B8FF
brand.primaryDeep = #0C86D3

action.primary = linear-gradient(135deg, #FF7F88 0%, #FFB24F 100%)
action.secondaryBg = #FFFFFF
action.secondaryText = #2F8FE8

status.success = #27965F
status.warning = #CC7D1B
status.error = #C63A2F

border.default = rgba(33, 110, 177, 0.16)
```

## Component Mapping

- App background: `#F7FCFF`
- Hero header: sky gradient
- Primary button: coral-orange gradient with white text
- Secondary button: white background with blue text and soft blue border
- Card: white background with subtle border or shadow
- Input focus: blue highlight using `#2F8FE8`
- Success badge: `#27965F`
- Warning badge: `#CC7D1B`
- Error text or destructive action: `#C63A2F` or red-orange gradient

## Notes For Future Screens

- Prefer light surfaces for most mobile screens to keep readability high.
- Use the full sky gradient mainly in hero areas, splash screens, or top banners.
- Keep the coral-orange gradient for high-priority actions so it retains emphasis.
- If additional neutral colors are needed later, derive them from the blue-gray text family instead of introducing unrelated grays.
