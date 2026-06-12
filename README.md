# LiberoGo Translation Workflow Core

> An OpenStax-compatible workflow framework developed by **LiberoGo** for translating open textbooks into Vietnamese with controlled workflow, glossary governance, quality gates, AI-assisted drafting, human review, preview and EPUB export.

## 1. What this is

**LiberoGo Translation Workflow Core** is a reusable workflow framework developed by **LiberoGo** to support the translation of open educational textbooks into Vietnamese.

The framework is designed to help teams:

- initialize translation projects for OpenStax books;
- scrape and clean source content;
- analyze structure and terminology;
- govern glossary before large-scale translation;
- create AI-assisted draft translations;
- review translations with quality gates;
- archive translated content;
- generate HTML preview and EPUB output;
- operate the workflow through CLI or Google Antigravity.

This framework is **not an official OpenStax product**. OpenStax is used as a source of open educational materials, subject to the license and attribution requirements of each book.

---

## 2. Developed by LiberoGo

The framework and translated learning materials produced through this workflow are developed and maintained by **LiberoGo**.

LiberoGo is responsible for:

- workflow design;
- translation process;
- glossary governance;
- quality review process;
- translated Vietnamese content produced through the workflow;
- documentation and operator prompts;
- release packaging;
- future product direction.

The goal is to build a repeatable, safe and quality-controlled workflow for translating open learning materials into Vietnamese.

---

## 3. About OpenStax

OpenStax provides open educational resources, including textbooks that can be accessed and used under their applicable licenses.

This framework is designed to work with OpenStax book structures and content, but it does not claim ownership of OpenStax content.

When using or translating OpenStax materials, each project must follow the license and attribution requirements of the original source.

---

## 4. About Dự Án Bột

**Dự Án Bột** is an independent open-source/personal project and is not owned by LiberoGo.

This repository should be understood as **LiberoGo’s own translation workflow framework**, not as an official continuation of, or ownership claim over, Dự Án Bột.

If any idea, structure, code or documentation from Dự Án Bột is referenced or reused, that usage must follow the original license and include appropriate attribution.

---

## 5. Current Release

```text
Version: 0.1.0-rc.1
Release Type: Production Release Candidate
```

This release includes:

* Workflow Core;
* CLI runner;
* Quality Gates;
* Glossary Governance;
* Antigravity Operator Guides;
* Prompt examples;
* Release packaging documentation.

Web App / Operator Dashboard is not included in this release.

---

## 6. Core Workflow

The standard workflow for a book project is:

```text
plan
→ scrape
→ clean
→ analyze
→ glossary
→ prep
→ translate
→ review
→ archive
→ build_preview
→ export_epub
→ qa_summary
→ generate_state
→ final_validate
```

Core principles:

```text
Raw data is preserved.
Translation is draft-first.
Glossary should be reviewed before full-book translation.
Final output requires human review and explicit approval.
```

---

## 7. Book Project Structure

Recommended book project structure:

```text
books/{bookSlug}/
├── book.config.json
├── workflow-state.json
├── glossary.csv
├── glossary.schema.json
├── glossary-review/
├── glossary/versions/
├── reports/
├── preview/html/
├── exports/epub/
└── chapters/
    └── chapter-{N}/
        ├── 01-raw/
        ├── 02-clean/
        ├── 03-analyzed/
        ├── 04-prep/
        ├── 05-translated-draft/
        ├── 05-translated/
        ├── 06-reviews/
        ├── 07-archive/
        └── assets/
```

Details: [Book Project Structure](docs/BOOK_PROJECT_STRUCTURE.md)

---

## 8. AI Provider Policy

The framework is designed to operate inside **Google Antigravity**.

In Antigravity, the operator/agent can use the model currently selected in the Antigravity interface, such as Gemini, Claude or GPT.

Provider behavior:

| Provider                     | When to use                                                                        | Output                                   |
| ---------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------- |
| `mock`                       | Workflow testing, dry-run simulation, pipeline validation                          | Placeholder output, not real translation |
| `manual`                     | Human translator or user-provided translation                                      | Real translation if provided by human    |
| `antigravity-selected-model` | Default for real translation, review, glossary and content work inside Antigravity | Real draft output                        |
| `external-ai`                | Framework calls an AI API through API key/provider config                          | Real draft output                        |

Safe defaults:

```text
Real translation in Antigravity
→ use the currently selected Antigravity model
→ write to draft
→ do not write final
```

```text
Workflow testing / pipeline validation
→ use mock
→ do not create real translation
```

```text
External AI API
→ use only when configured
→ use only when explicitly confirmed
→ never switch silently
```

Important rules:

* Do not use `mock` for real translation unless the user explicitly asks to test the workflow.
* Before translation, Antigravity must state which provider/model will be used.
* Real translation must be written to draft first.
* Final translation requires human review and explicit confirmation.
* Full-book AI translation should start with a pilot chapter.
* External AI API usage must be confirmed because it may involve cost or quota.

Details: [Translation Provider Reference](docs/TRANSLATION_PROVIDER_REFERENCE.md)

---

## 9. Glossary Governance

Glossary is a core part of academic translation quality.

Main glossary file:

```text
books/{bookSlug}/glossary.csv
```

Recommended schema:

```csv
term,translation,category,status,confidence,source,chapterRefs,reviewer,reviewedAt,locked,notes
```

Glossary lifecycle:

```text
candidate
→ needs_review
→ approved / rejected / changed / locked
```

The framework supports:

* glossary candidate generation;
* human/expert review sheet;
* approve/reject/lock terminology;
* glossary versioning;
* glossary diff report;
* glossary impact analysis;
* affected chapter detection;
* safe application of glossary changes to draft.

Safety rules:

* Glossary candidates are not automatically approved.
* Glossary changes require backup, diff and impact analysis.
* Glossary changes must not be applied to final translation automatically.
* Full-book translation should not proceed when glossary approval has failed.
* Pilot chapter translation may proceed with warnings when glossary is not fully approved.

Details:

* [Glossary Governance Guide](docs/GLOSSARY_GOVERNANCE_GUIDE.md)
* [Glossary Change Policy](docs/GLOSSARY_CHANGE_POLICY.md)
* [Glossary Approval Workflow](docs/GLOSSARY_APPROVAL_WORKFLOW.md)

---

## 10. Quality Gates

The framework uses quality gates to check workflow quality and safety.

Key gates include:

```text
planCompleteness
rawHtmlExists
cleanHtmlValid
analysisCompleteness
glossaryApproval
glossaryImpact
prepCompleteness
translationCompleteness
reviewCompleteness
archiveCompleteness
previewCssReferences
epubValidity
qaSummary
finalValidation
```

Example commands:

```bash
node cli/index.js qa entrepreneurship --all
node cli/index.js qa entrepreneurship --gate glossaryApproval
node cli/index.js qa entrepreneurship --gate glossaryImpact
```

Possible statuses:

```text
passed
passed_with_warnings
needs_human_review
failed
```

If a gate fails, the workflow should not continue to higher-risk steps until the issue is resolved.

Details: [Quality Gates Reference](docs/QUALITY_GATES_REFERENCE.md)

---

## 11. CLI Quick Start

Check project status:

```bash
node cli/index.js status entrepreneurship
```

Validate production readiness:

```bash
node cli/index.js validate-production entrepreneurship
```

Run all quality gates:

```bash
node cli/index.js qa entrepreneurship --all
```

Run workflow dry-run:

```bash
node cli/index.js workflow-run entrepreneurship --from analyze --to review --dry-run
```

Check glossary:

```bash
node cli/index.js glossary entrepreneurship --status
node cli/index.js glossary entrepreneurship --generate-candidates --dry-run
node cli/index.js glossary entrepreneurship --review-export
```

Create preview / EPUB:

```bash
node cli/index.js run entrepreneurship --phase build_preview --dry-run
node cli/index.js run entrepreneurship --phase export_epub --dry-run
```

Details: [CLI Reference](docs/CLI_REFERENCE.md)

---

## 12. Non-Technical Operation via Antigravity

Users do not need to memorize CLI commands.

They can describe their goal in natural language inside Antigravity.

Example:

```text
Tôi muốn dịch thử chương 2 của sách Entrepreneurship sang tiếng Việt, chỉ ghi vào draft.
```

Another example:

```text
Tôi muốn tạo glossary candidates cho sách này để gửi chuyên gia review.
```

Antigravity should:

* understand the user intent;
* check project status first;
* check glossary status when relevant;
* run dry-run before major actions;
* state which provider/model will be used;
* ask for confirmation before risky operations;
* avoid writing final output without approval;
* report results in plain language.

Related documents:

* [Operator Prompt Playbook](docs/OPERATOR_PROMPT_PLAYBOOK.md)
* [Non-Technical User Guide](docs/NON_TECHNICAL_USER_GUIDE.md)
* [Antigravity Operation Guide](docs/ANTIGRAVITY_OPERATION_GUIDE.md)
* [User Intent Handling Rules](docs/USER_INTENT_HANDLING_RULES.md)
* [User Intent to CLI Mapping](docs/USER_INTENT_TO_CLI_MAPPING.md)
* [Operator Risk Level Matrix](docs/OPERATOR_RISK_LEVEL_MATRIX.md)
* [Full Book Translation Policy](docs/FULL_BOOK_TRANSLATION_POLICY.md)
* [Operator Response Templates](docs/OPERATOR_RESPONSE_TEMPLATES.md)
* [Prompt Examples](examples/prompts/)

---

## 13. Prompt Examples

Prompt templates are available in:

```text
examples/prompts/
```

Common prompts:

* [Start New Book](examples/prompts/start-new-book.md)
* [Free-form Request](examples/prompts/free-form-request.md)
* [Translate One Chapter Draft](examples/prompts/translate-one-chapter-draft.md)
* [Translate Full Book Safely](examples/prompts/translate-full-book-safe.md)
* [Review Glossary](examples/prompts/review-glossary.md)
* [Update Glossary After Expert Review](examples/prompts/update-glossary-after-expert-review.md)
* [Apply Glossary Changes to Draft](examples/prompts/apply-glossary-changes-to-draft.md)
* [Create Preview and EPUB](examples/prompts/create-preview-and-epub.md)
* [Recover From Error](examples/prompts/recover-from-error.md)
* [Approve Final Translation](examples/prompts/approve-final-translation.md)

---

## 14. Test Suite

The framework uses Node.js built-in test runner.

Run all tests:

```bash
node --test tests/unit/*.test.js tests/integration/*.test.js tests/smoke/*.test.js
```

Run test groups:

```bash
node --test tests/unit/*.test.js
node --test tests/integration/*.test.js
node --test tests/smoke/*.test.js
```

If the project uses Bun or npm scripts, check `package.json`.

---

## 15. Documentation

Main documents:

* [Installation](docs/INSTALLATION.md)
* [Quick Start](docs/QUICK_START.md)
* [CLI Reference](docs/CLI_REFERENCE.md)
* [Book Project Structure](docs/BOOK_PROJECT_STRUCTURE.md)
* [Quality Gates Reference](docs/QUALITY_GATES_REFERENCE.md)
* [Translation Provider Reference](docs/TRANSLATION_PROVIDER_REFERENCE.md)
* [Glossary Governance Guide](docs/GLOSSARY_GOVERNANCE_GUIDE.md)
* [Production Readiness](docs/WORKFLOW_CORE_PRODUCTION_READINESS.md)
* [Release Process](docs/RELEASE_PROCESS.md)
* [Framework Packaging](docs/FRAMEWORK_PACKAGING.md)

---

## 16. Safety Model

Key safety rules:

* Run dry-run before major actions.
* Do not overwrite data without backup and confirmation.
* Real translation must be written to draft first.
* Final translation requires human review.
* Glossary changes require diff and impact report.
* Full-book translation should start with a pilot chapter.
* External AI API should only be used when configured and explicitly confirmed.

---

## 17. Known Limitations

* Web App / Operator Dashboard is not included in this release.
* `mock` provider does not create real translation.
* External AI provider requires separate configuration if the framework calls an API directly.
* Real translation still requires human review before publication.
* EPUB output should be checked with quality gates before delivery.

---

## 18. Recommended First Workflow

For a new OpenStax book:

```text
init book project
→ scrape dry-run
→ scrape
→ clean
→ analyze
→ generate glossary candidates
→ human review glossary
→ translate one pilot chapter as draft
→ review pilot chapter
→ full book draft translation
→ review
→ archive
→ preview
→ export EPUB
```

Do not start with full-book final translation.

---

## 19. License and Source Attribution

This framework is developed by LiberoGo.

OpenStax materials are subject to their own licenses and attribution requirements. Each translation project must follow the license terms of the source material.

If any external open-source project, including Dự Án Bột, is referenced or reused, attribution and license compliance must be handled appropriately.

---

## 20. Mission

LiberoGo aims to make open educational content more accessible to Vietnamese learners.

This framework is a technical foundation for translating academic materials in a way that is:

* structured;
* safe;
* reviewable;
* scalable;
* compatible with AI-assisted workflows;
* usable by both technical and non-technical operators.

---

*Developed by LiberoGo.*
