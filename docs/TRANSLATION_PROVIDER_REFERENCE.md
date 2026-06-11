# Translation Provider Reference

This document explains the translation abstraction layer, memory, and safety models in the Workflow Core.

## Abstraction Layer

The translation engine operates on a unified abstraction:
- **`TranslationProvider`**: Base class defining the common interface.
- **`MockTranslationProvider`**: Simulates translation by mapping input segments to pseudo-Vietnamese text (useful for dry-runs and integration tests).
- **`ManualTranslationProvider`**: Imports pre-existing Vietnamese segments or prompts human users for translations.
- **`ExternalAiTranslationProvider`**: Integrates with LLM APIs (OpenAI GPT, Gemini, etc.) using terms and glossary contexts.

---

## Safety Model

To protect existing final translations:
1. **Draft Output Mode**:
   - By default, running the `translate` phase outputs translations into temporary draft paths (`.draft.html` or `05-translated-draft/`).
   - This ensures translators can experiment without overriding validated translation files.
2. **`--write-final` Protection**:
   - To overwrite files in the production path `05-translated/`, execution requires both `--write-final` and `--force` flags.
   - When active, the system automatically duplicates the previous state to the `backups/` directory before writing.

---

## Glossary Context & Translation Memory

During the translation phase:
- **Glossary Context**: Specific key terms found in the segment are matched against `glossary.csv`. Terminology definitions are injected into the prompt as system rules.
- **Translation Memory (TM)**: Previously translated, reviewed, or matched sentences are indexed. Exact matches are reused automatically to maintain consistency.

---

## Glossary Approval & Translation Safety

Before starting the translation phase:
1. **Safety Block**:
   - The translation phase checks the status of the `glossaryApproval` gate.
   - If `glossaryApproval` is in a `failed` or `missing` state, translation is completely blocked.
   - If `glossaryApproval` returns `needs_human_review`, full-book translation is blocked (unless bypassed with `--force`), but single-chapter pilot translations are permitted with warnings to inspect translation quality.
2. **Impact Tracking**:
   - If glossary definitions are updated post-translation, the `glossaryImpact` gate marks affected translation files and chapters as stale, recommending re-translation and re-review.
