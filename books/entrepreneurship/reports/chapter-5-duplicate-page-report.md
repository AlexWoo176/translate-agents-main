# Chapter 5 Duplicate Page Analysis Report

**Timestamp:** 2026-06-11T15:57:11.516Z
**Target Book:** `books/entrepreneurship/`

## 1. Summary of Scan
- Scanned Directories (Backup Reference):
  1. `backups/step-3/chapters/chapter-5/05-translated/`
  2. `backups/step-3/chapters/chapter-5/07-archive/vn-only/`
  3. `backups/step-3/preview/html/chapter-5/`
- Duplicate Groups Detected: 1

## Duplicate Group: Section 5.1
- **Section Heading:** `5.1 Entrepreneurial Opportunity`
- **Detected Filename Variants:** 2
- **Resolution Status:** ✅ RESOLVED (Quarantined & Registry Cleared)

### Comparison Table
| Filename | Avg Size (Bytes) | Avg Char Count | Avg `.eng.hidden` | Avg `.vn.visible` | Canonical Score | Decision |
|---|---|---|---|---|---|---|
| `5-1-entrepreneurial-opportunity.html` | 55576 | 31425 | 41 | 41 | **410.49666666666667** | **CANONICAL (Selected)** |
| `5-1-identifying-entrepreneurial-opportunity.html` | 9050 | 5821 | 20 | 20 | **87.25999999999999** | Duplicate Candidate |

### Current Status Verification
| Filename | In `05-translated` | In `07-archive` | In `preview/html` | Registered in Reader | Quarantined |
|---|---|---|---|---|---|
| `5-1-entrepreneurial-opportunity.html` | Yes | Yes | Yes | Yes | No |
| `5-1-identifying-entrepreneurial-opportunity.html` | No | No | No | No | Yes |

### Canonical Decision Rationale
The variant `5-1-entrepreneurial-opportunity.html` was selected as the **canonical page** because:
1. **Size Advantage:** It has an average size of **55576 bytes** vs **9050 bytes** (nearly 6x larger).
2. **Content Density:** Plain text has **31425 characters** vs **5821 characters** (nearly 6x more dense).
3. **Bilingual Completeness:** It contains **41 `.eng.hidden`** and **41 `.vn.visible`** structures (complete translated text) compared to **20** and **20** in the duplicate.

### Resolution Details
- **Canonical File:** Maintained in active folders: `5-1-entrepreneurial-opportunity.html`.
- **Duplicate File:** Quarantined at `chapters/chapter-5/_quarantine/step-3-duplicate-pages/5-1-identifying-entrepreneurial-opportunity.html` and de-registered from `book-pages.js`.
