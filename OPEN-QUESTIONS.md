# Open questions for the client

## From the planning chat (BUILD_SPEC section 14)

1. Activity count: dataset has 63 norm-specific descriptions (59 distinct wordings); the report says 55. Four descriptions recur under different wording across norms (cyber-defence posture in A and F; international-law position in A and F; criminalization in C and D; critical infrastructure designation in F and G); merging them would give 55. Is that the rule, and can an activity ID per row be added?
2. Norm A: the report lists 7 example activities but discusses the first two together; the dataset has 6. Which count is intended?
3. Topic and job coding: primary job is fully determined by primary topic on all 196 links. Who coded them and when? Were jobs derived from topics?
4. Is “Stability and security” meant as a catch-all secondary topic (65 of 118 secondary-coded links)? It makes Diplomat relevant to 93 of 196 links.
5. Norm E has no job category (intentional or missing?); links 103 and 104 have a secondary topic but no secondary job.
6. Sign-off on the cleaning steps in CLEANING_LOG.md.
7. Four types, or merge institutions and partnerships as in the report?
8. Should the single Commission link (Norm I) stay?
9. Report version the data follows; data cut-off date.
10. Licence, citation, contact; intro text and item descriptions (placeholders in the UI).

## Raised during setup (2026-11-11)

11. ~~**Two items share the short name “CSA”.**~~ Resolved (owner, 2026-11-11): listing both is fine. Cyber Solidarity Act has `short_name` “CSA (Solidarity)” and the Cybersecurity Act has “CSA (Certification)”. A search for “CSA” therefore lists both (list mode) and selects neither. Is that intended, or should one of them carry “CSA” as an alias?
12. **Aliases include pre-cleaning misspellings** (owner raises with the client; data stays as is) (e.g. “EU-OSCE cooperaiton”, “Network Code … ((Delegated Regulation 2024/1366)”), matching the merges in CLEANING_LOG.md. They are searchable, which is harmless. Confirm they are meant to stay as aliases.
13. **`meta.json`:** version, date and contact filled in (owner, 2026-11-13); `source_report_version`, `licence` and `citation` are still open. Was: **`meta.json` is new** (stays null; the client fills it in) (`data/meta.json`, all values null). Who fills in version, date, report version, licence, citation and contact?
14. **Methodology, “What it shows”** still says “Dots are grouped by topic or by job category, depending on the starting point.” Since BUILD_SPEC 12.1 the dots are always grouped by topic and the job path is a lens. Proposed wording for the authors: “Dots are always grouped by topic; choosing a job category highlights the links that matter for it.”
15. ~~**Report URL**~~ Resolved (owner, 2026-11-13): https://www.interface-eu.org/publications/how-the-eu-implements-the-un-cyber-norms, in `copy.header.reportUrl`.
16. **UI microcopy to review** (functional labels written during the build, all in `copy.json`): legend lines (“Link (no search or filter)”, “Matches through a secondary topic or job”), job picker heading and count explanation, matrix “+n” explanation, “View as table”, “Escape” hint, mobile match labels, panel “Show less / Show fewer norms”.

## Raised while building view 2 (2026-11-12)

17. **Fresh load in view 2:** keep the opening question (S0, as the spec says), or start straight from all dots (wireframe board 1, “v2 start all dots”)?
18. **Matrix in view 2:** cells whose links match only through a secondary topic show a ring (same as view 1). Wireframe 3 shows them grey, so only the chosen column is highlighted. Which reading is intended?
19. **Item chip:** “Item: ENISA” (short name, as the spec says) or the full name (wireframe 5)?
20. **New microcopy to review** (all in `copy.json`): the count line sentences (`countLine`), card labels and chips (`cards`), the combobox texts (`controls.find*`), the view 2 legend (`legendV2`), and the two checkbox labels.
21. **Card threshold:** 12 links or fewer become cards (`CARD_THRESHOLD` in `config.js`). Check by eye once the client has tried it.
