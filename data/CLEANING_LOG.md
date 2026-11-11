# Cleaning log

Source: digilateral_norms_v0.xlsx (sheet Data-UpdatedPP)

## Summary
- Rows (links): 196
- Norms: 11
- Distinct entities after merging: 91 (source had 100 distinct name strings)
- Types: {'Legislation': 64, 'Partnerships': 46, 'Policies': 43, 'Institutions': 43}

## Changes
- Text hygiene (non-breaking spaces, stray whitespace, encoding artefacts) in `name`: 1 cells changed.
- Text hygiene (non-breaking spaces, stray whitespace, encoding artefacts) in `group1`: 39 cells changed.
- Text hygiene (non-breaking spaces, stray whitespace, encoding artefacts) in `group2`: 2 cells changed.
- Entity merge/fix: "ENISA" -> "European Union Agency for Cybersecurity (ENISA)" (17 rows).
- Entity merge/fix: "EEAS" -> "European External Action Service (EEAS)" (7 rows).
- Entity merge/fix: "EDA" -> "European Defence Agency (EDA)" (1 rows).
- Entity merge/fix: "Court of Justice of the EU" -> "Court of Justice of the European Union" (1 rows).
- Entity merge/fix: "EU-CyCLONE" -> "EU-CyCLONe" (1 rows).
- Entity merge/fix: "J-CAT" -> "Joint Cybercrime Action Taskforce (J-CAT)" (1 rows).
- Entity merge/fix: "MICNET" -> "Military Computer Emergency Response Team Operational Network (MICNET)" (2 rows).
- Entity merge/fix: "Digital Operational Resilience Act" -> "Digital Operational Resilience Act (Regulation 2022/2554)" (1 rows).
- Entity merge/fix: "Network Code on sector-specific rules for cybersecurity aspects of cross-border electricity flows ((Delegated Regulation 2024/1366)" -> "Network Code on sector-specific rules for cybersecurity aspects of cross-border electricity flows (Delegated Regulation 2024/1366)" (1 rows).
- Entity merge/fix: "EU-OSCE cooperaiton" -> "EU-OSCE cooperation" (1 rows).
- Topic label "Critical infrastructure protection" -> "Critical infrastructure" in `group2` (12 rows).
- `actor1` empty on 15 rows (all ['Norm E']) -> "Not specified" (decision: author).
- Type "Institutions and Partnerships" -> "Partnerships" for "Cybersecurity Alert System" in Norm B (same item is "Partnerships" elsewhere).
- Type "Institutions and Partnerships" -> "Institutions" for "European External Action Service (EEAS)" in Norm C (same item is "Institutions" elsewhere).
- Added `norms.orientation`: prohibitive ("don't") = norms C, F, K; positive ("do") = all other norms (distinction from the Interface report).
- No duplicate norm/operationalization/entity links after merging.
