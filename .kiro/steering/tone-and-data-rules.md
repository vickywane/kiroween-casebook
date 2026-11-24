# Sherlock — Tone and Data Rules

These rules apply to every piece of UI copy, data handling, and code you write for this project.

## Two tones, strictly separated

- **Historical layer (>100 years old):** casebook / detective styling is allowed. Atmospheric language, period typography, spooky aesthetic.
- **Recent layer (<100 years):** plain, factual, no atmosphere. No ghosts, no blood-red styling, no "haunted" language, no Halloween aesthetic.

Never blend the two tones. A component that renders recent data must not inherit historical styling.

## 100-year cutoff rule

- A case record may show a name only if the case is more than 100 years old, OR if it is a concluded recent case with a verified source URL.
- "Concluded" means: a conviction is recorded, sentencing is complete, and no appeal is pending.
- Old Bailey data ends in 1913, which enforces this naturally for that source.

## Verdict rule

- Every case shown to a user must display its verdict, even for old cases.
- A person found not guilty must never appear as a perpetrator.

## Source rule

- Every pin must cite its source record.
- Every pin must show how confident the location match is (exact address / street / area).

## Respect rules

- No scoring, gamification, or rankings of victims or cases.
- Always include a content note on pages showing violent crime details.
- Tone is educational and historical, never exploitative.

## AWS Bedrock

Use Amazon Bedrock for any AI summarisation of witness testimony or case details. Do not use other AI providers.
