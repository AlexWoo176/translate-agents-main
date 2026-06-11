# Glossary Validation Report

**Timestamp:** 2026-06-11T15:57:11.248Z
**Status:** ✅ PASSED

## Summary
- **Total Rows Reviewed:** 521
- **Malformed Rows:** 0
- **Total Errors:** 0
- **Total Warnings:** 23

### ✅ No validation errors found.



## Warnings
| Type | Details | Message |
|---|---|---|
| `duplicate_key` | `outsourcing` | Duplicate key "outsourcing" found on rows: 346, 491 |
| `duplicate_key` | `advisory board` | Duplicate key "advisory board" found on rows: 384, 484 |
| `duplicate_key` | `decision tree` | Duplicate key "decision tree" found on rows: 385, 485 |
| `duplicate_key` | `economic factors` | Duplicate key "economic factors" found on rows: 386, 486 |
| `duplicate_key` | `human resources` | Duplicate key "human resources" found on rows: 388, 488 |
| `duplicate_key` | `intangible resources` | Duplicate key "intangible resources" found on rows: 390, 489 |
| `duplicate_key` | `line of credit` | Duplicate key "line of credit" found on rows: 391, 490 |
| `duplicate_key` | `pest framework` | Duplicate key "pest framework" found on rows: 392, 492 |
| `duplicate_key` | `political factors` | Duplicate key "political factors" found on rows: 393, 493 |
| `duplicate_key` | `pre-launch costs` | Duplicate key "pre-launch costs" found on rows: 394, 494 |
| `duplicate_key` | `resource dependence theory (rdt) model` | Duplicate key "resource dependence theory (rdt) model" found on rows: 396, 496 |
| `duplicate_key` | `service mark` | Duplicate key "service mark" found on rows: 397, 497 |
| `duplicate_key` | `sociocultural factors` | Duplicate key "sociocultural factors" found on rows: 398, 498 |
| `duplicate_key` | `tangible resources` | Duplicate key "tangible resources" found on rows: 399, 499 |
| `duplicate_key` | `tariffs` | Duplicate key "tariffs" found on rows: 400, 500 |
| `duplicate_key` | `technological factors` | Duplicate key "technological factors" found on rows: 401, 501 |
| `duplicate_key` | `buyback clause` | Duplicate key "buyback clause" found on rows: 406, 502 |
| `duplicate_key` | `company culture` | Duplicate key "company culture" found on rows: 408, 503 |
| `duplicate_key` | `delphi method` | Duplicate key "delphi method" found on rows: 409, 504 |
| `duplicate_key` | `escalation of commitment` | Duplicate key "escalation of commitment" found on rows: 410, 505 |
| `duplicate_key` | `gantt chart` | Duplicate key "gantt chart" found on rows: 413, 508 |
| `duplicate_key` | `hindsight bias` | Duplicate key "hindsight bias" found on rows: 414, 509 |
| `duplicate_key` | `hubris` | Duplicate key "hubris" found on rows: 415, 510 |

## Validation Schema Reference
The glossary columns are validated against the following schema requirements:
- `key`: string, required, non-empty
- `translation`: string, required, non-empty
- `options`: string, optional
- `desc_en`: string, optional
- `desc_vi`: string, optional
- `chapter`: string, optional
- `status`: enum (draft, pending_review, approved, needs_context, deprecated), required
- `notes`: string, optional
