# clean_norms_data.R
# Clean digilateral_norms_v0.xlsx -> norms.csv, entities.csv, links.csv + CLEANING_LOG.md
#
# Usage (from the project folder):
#   Rscript clean_norms_data.R digilateral_norms_v0.xlsx data/
# or source it in RStudio and edit `src` / `out` below.
#
# Requires R >= 4.1 (native pipe) and: readxl, dplyr, stringr, readr, tibble
# Every change is logged; nothing is added or dropped silently.

suppressPackageStartupMessages({
  library(readxl)
  library(dplyr)
  library(stringr)
  library(readr)
  library(tibble)
})

args <- commandArgs(trailingOnly = TRUE)
src  <- if (length(args) >= 1) args[1] else "digilateral_norms_v0.xlsx"
out  <- if (length(args) >= 2) args[2] else "."
dir.create(out, showWarnings = FALSE, recursive = TRUE)

log_lines <- character()
add_log <- function(...) log_lines <<- c(log_lines, paste0(...))

raw <- read_excel(src)   # first sheet ("Data-UpdatedPP")
d   <- raw

# --- 1. text hygiene --------------------------------------------------------
mojibake <- c("\u201a\u00c4\u00f4" = "\u2019",   # ‚Äô -> ’
              "\u201a\u00c4\u00fa" = "\u201c",   # ‚Äú -> “
              "\u201a\u00c4\u00f9" = "\u201d",   # ‚Äù -> ”
              "\u201a\u00c4\u00ec" = "\u2013",   # ‚Äì -> –
              "\u201a\u00c4\u00ee" = "\u2014")   # ‚Äî -> —

clean_text <- function(x) {
  x <- as.character(x)
  for (bad in names(mojibake)) x <- str_replace_all(x, fixed(bad), mojibake[[bad]])
  x <- str_replace_all(x, "\u00a0", " ")   # non-breaking spaces
  str_squish(x)                            # trim + collapse whitespace
}

text_cols <- c("norm", "example", "type", "name", "group1", "group2", "actor1", "actor2")
for (cc in text_cols) {
  before <- as.character(d[[cc]])
  d[[cc]] <- clean_text(before)
  n <- sum(before != d[[cc]], na.rm = TRUE)
  if (n > 0) add_log("Text hygiene (non-breaking spaces, stray whitespace, encoding artefacts) in `", cc, "`: ", n, " cells changed.")
}

# --- 2. entity names: typos + aliases -> one canonical entity -----------------
aliases <- tribble(
  ~canonical,                                                                                          ~short_name,   ~variant,
  "European Union Agency for Cybersecurity (ENISA)",                                                   "ENISA",       "ENISA",
  "European External Action Service (EEAS)",                                                           "EEAS",        "EEAS",
  "European Defence Agency (EDA)",                                                                     "EDA",         "EDA",
  "Court of Justice of the European Union",                                                            "CJEU",        "Court of Justice of the EU",
  "EU-CyCLONe",                                                                                        "EU-CyCLONe",  "EU-CyCLONE",
  "Joint Cybercrime Action Taskforce (J-CAT)",                                                         "J-CAT",       "J-CAT",
  "Military Computer Emergency Response Team Operational Network (MICNET)",                            "MICNET",      "MICNET",
  "Digital Operational Resilience Act (Regulation 2022/2554)",                                         "DORA",        "Digital Operational Resilience Act",
  "Network Code on sector-specific rules for cybersecurity aspects of cross-border electricity flows (Delegated Regulation 2024/1366)",
                                                                                                       NA_character_, "Network Code on sector-specific rules for cybersecurity aspects of cross-border electricity flows ((Delegated Regulation 2024/1366)",
  "EU-OSCE cooperation",                                                                               NA_character_, "EU-OSCE cooperaiton"
)

# short names for other well-known items (search / labels only)
short_only <- tribble(
  ~name,                                                          ~short_name,
  "NIS2 Directive (Directive 2022/2555)",                         "NIS2",
  "Cyber Resilience Act (Regulation 2024/2847)",                  "CRA",
  "Cyber Solidarity Act (Regulation 2025/38)",                    "CSA (Solidarity)",
  "Cybersecurity Act (Regulation 2019/881)",                      "CSA (Certification)",
  "Critical Entities Resilience Directive (Directive 2022/2557)", "CER Directive",
  "General Data Protection Regulation (Regulation 2016/679)",     "GDPR"
)

for (i in seq_len(nrow(aliases))) {
  k <- sum(d$name == aliases$variant[i], na.rm = TRUE)
  if (k > 0) add_log("Entity merge/fix: \"", aliases$variant[i], "\" -> \"", aliases$canonical[i], "\" (", k, " rows).")
}
variant_map <- setNames(aliases$canonical, aliases$variant)
d$name <- coalesce(unname(variant_map[d$name]), d$name)

# --- 3. topics: unify label variants ----------------------------------------
for (cc in c("group1", "group2")) {
  k <- sum(d[[cc]] %in% "Critical infrastructure protection")
  if (k > 0) add_log("Topic label \"Critical infrastructure protection\" -> \"Critical infrastructure\" in `", cc, "` (", k, " rows).")
  d[[cc]] <- if_else(d[[cc]] %in% "Critical infrastructure protection", "Critical infrastructure", d[[cc]])
}

# --- 4. job categories: Norm E has none -> "Not specified" -------------------
miss <- is.na(d$actor1)
add_log("`actor1` empty on ", sum(miss), " rows (norms: ",
        paste(sort(unique(str_sub(d$norm[miss], 1, 6))), collapse = ", "),
        ") -> \"Not specified\" (decision: author).")
d$actor1[miss] <- "Not specified"

# --- 5. type: four types, resolved from the item's own other rows -------------
amb_label <- "Institutions and Partnerships"
for (i in which(d$type %in% amb_label)) {
  nm     <- d$name[i]
  others <- unique(d$type[d$name == nm & !(d$type %in% amb_label)])
  if (length(others) == 1) {
    add_log("Type \"", amb_label, "\" -> \"", others, "\" for \"", nm, "\" in ", str_sub(d$norm[i], 1, 6),
            " (same item is \"", others, "\" elsewhere).")
    d$type[i] <- others
  } else {
    add_log("UNRESOLVED type for \"", nm, "\" in ", str_sub(d$norm[i], 1, 6), ": needs a decision.")
  }
}

# type must be consistent per entity
inc <- d |> group_by(name) |> summarise(n = n_distinct(type), types = paste(sort(unique(type)), collapse = ", "), .groups = "drop") |> filter(n > 1)
for (j in seq_len(nrow(inc))) add_log("WARNING: entity \"", inc$name[j], "\" has several types: ", inc$types[j])

# --- 6. build tables ---------------------------------------------------------
slug <- function(s) {
  s |> str_to_lower() |> str_replace_all("[^a-z0-9]+", "-") |> str_remove_all("^-+|-+$") |> str_sub(1, 60)
}

d$norm_id <- str_match(d$norm, "^Norm ([A-K])")[, 2]

norms <- d |>
  distinct(norm, norm_id) |>
  mutate(title = str_remove(norm, "^Norm [A-K]: ")) |>
  arrange(norm_id) |>
  transmute(norm_id, title, label = paste0("Norm ", norm_id, ": ", title))

# Norm orientation, following the Interface report: positive commitments ("do's") vs
# prohibitive commitments ("don'ts", i.e. restraint). Prohibitive = C, F, K.
prohibitive <- c("C", "F", "K")
norms <- norms |> mutate(orientation = if_else(norm_id %in% prohibitive, "prohibitive", "positive"))
add_log("Added `norms.orientation`: prohibitive (\"don't\") = norms ", paste(prohibitive, collapse = ", "),
        "; positive (\"do\") = all other norms (distinction from the Interface report).")

ents <- d |>
  group_by(name) |>
  summarise(type = first(type), .groups = "drop") |>
  mutate(entity_id = slug(name))
stopifnot("slug collision" = !anyDuplicated(ents$entity_id))

short_lookup <- bind_rows(
  aliases |> filter(!is.na(short_name)) |> distinct(name = canonical, short_name),
  short_only
)
alias_lookup <- aliases |>
  group_by(name = canonical) |>
  summarise(aliases = paste(variant, collapse = "; "), .groups = "drop")

ents <- ents |>
  left_join(short_lookup, by = "name") |>
  left_join(alias_lookup, by = "name") |>
  mutate(short_name = coalesce(short_name, ""), aliases = coalesce(aliases, "")) |>
  select(entity_id, name, short_name, type, aliases) |>
  arrange(name)

links <- d |>
  left_join(select(ents, name, entity_id), by = "name") |>
  transmute(
    link_id            = row_number(),
    norm_id,
    operationalization = example,
    entity_id,
    topic_primary      = group1,
    topic_secondary    = group2,
    job_primary        = actor1,
    job_secondary      = actor2
  )

dups <- links |>
  group_by(norm_id, operationalization, entity_id) |>
  filter(n() > 1) |>
  ungroup()
if (nrow(dups) > 0) {
  add_log("WARNING: ", nrow(dups), " rows are duplicate norm/operationalization/entity links after merging: link_ids ",
          paste(dups$link_id, collapse = ", "), ".")
} else {
  add_log("No duplicate norm/operationalization/entity links after merging.")
}

write_csv(links, file.path(out, "links.csv"),    na = "")
write_csv(ents,  file.path(out, "entities.csv"), na = "")
write_csv(norms, file.path(out, "norms.csv"),    na = "")

type_counts <- links |> left_join(select(ents, entity_id, type), by = "entity_id") |> count(type) |>
  arrange(desc(n)) |> mutate(txt = paste0(type, " ", n))
summary_lines <- c(
  paste0("- Rows (links): ", nrow(links)),
  paste0("- Norms: ", nrow(norms)),
  paste0("- Distinct entities after merging: ", nrow(ents), " (source had ", n_distinct(raw$name), " distinct name strings)"),
  paste0("- Types: ", paste(type_counts$txt, collapse = ", "))
)

writeLines(c("# Cleaning log", "",
             "Source: digilateral_norms_v0.xlsx (sheet Data-UpdatedPP)", "",
             "## Summary", summary_lines, "",
             "## Changes", paste0("- ", log_lines)),
           file.path(out, "CLEANING_LOG.md"), useBytes = FALSE)

cat(summary_lines, sep = "\n"); cat("\n"); cat(log_lines, sep = "\n")
