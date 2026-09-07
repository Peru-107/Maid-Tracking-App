# Third-party skills

These skill folders were vendored in from external repositories the user pointed
to, both MIT-licensed:

- `ui-ux-pro-max/` — from
  [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
  (`.claude/skills/ui-ux-pro-max`). Copyright (c) 2024 Next Level Builder.
- `animate/`, `animation-vocabulary/`, `find-animation-opportunities/`,
  `improve-animations/`, `review-animations/` — from
  [emilkowalski/skills](https://github.com/emilkowalski/skills). Copyright (c)
  2026 Emil Kowalski.

Both are MIT licensed; this notice preserves the required copyright
attribution. See each upstream repo for the full license text.

## Why only these

The source repos also included `pbakaus/impeccable` and `Leonxlnx/taste-skill`.
Neither was brought in:

- **impeccable** requires downloading and running a separate compiled binary
  on first use. Not something to wire into this project without the user
  reviewing that binary themselves.
- **taste-skill**'s design-opinion skills (`soft-skill`, `minimalist-skill`,
  `brandkit`, `brutalist-skill`, etc.) are tuned for premium/agency marketing
  sites — several explicitly ban the icon library (lucide-react) and the pill
  shapes already used throughout this app's design, and push a much louder
  aesthetic than the plain, readable, low-literacy-friendly UI this project
  has deliberately built toward. Applying them wholesale would fight earlier
  decisions made with the user, not build on them.

`ui-ux-pro-max` (accessibility, touch targets, forms, navigation checklist)
and the animation skills (restraint-first, "no animation is often correct")
were the ones that actually fit a utilitarian attendance/salary tracking tool.
