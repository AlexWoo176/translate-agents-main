# Glossary Governance Guide

Glossary is the backbone of academic translation. Standardizing terminology ensures consistency and quality across all chapters of an OpenStax book.

## Glossary Lifecycle

Each term in the glossary undergoes the following transitions:

```
candidate ──> needs_review ──> approved ──> locked / changed / deprecated
```

- **candidate**: Automatically proposed by the framework (e.g. from terminology analysis or html scans).
- **needs_review**: Flagged as requiring human verification.
- **approved**: Approved by a human operator or expert. Ready to be used for bulk translation.
- **locked**: High-importance term. Automated tools are blocked from making changes to this term.
- **changed**: Term whose translation has been updated after expert review.
- **rejected**: Explicitly excluded from translation use.
- **deprecated**: Legacy translation, no longer recommended.

## CLI Commands

The framework provides the following CLI tools to manage the glossary:

1. **Check Glossary Status**:
   ```bash
   node cli/index.js glossary entrepreneurship --status
   ```
2. **Generate Candidates**:
   ```bash
   node cli/index.js glossary entrepreneurship --generate-candidates
   ```
3. **Export Review Spreadsheet**:
   ```bash
   node cli/index.js glossary entrepreneurship --review-export
   ```
4. **Approve Terms**:
   ```bash
   node cli/index.js glossary entrepreneurship --approve
   ```
5. **Apply Changes to Drafts**:
   ```bash
   node cli/index.js glossary entrepreneurship --apply-to-draft --chapters affected
   ```

## Workflow Sequence

1. Generate candidates.
2. Export sheet for expert review.
3. Reviewer edits translations and saves as `glossary-review-result.csv`.
4. Import result using `--approve`.
5. Run translation.

## Operating Glossary Through Antigravity

You do not need to use the CLI directly. Use natural-language prompts:

| Nhu cầu | Prompt template |
|---|---|
| Kiểm tra trạng thái glossary | [review-glossary.md](file:///f:/LIBERO/translate-agents-main/examples/prompts/review-glossary.md) |
| Cập nhật glossary sau khi hỏi chuyên gia | [update-glossary-after-expert-review.md](file:///f:/LIBERO/translate-agents-main/examples/prompts/update-glossary-after-expert-review.md) |
| Áp dụng thuật ngữ mới vào bản nháp | [apply-glossary-changes-to-draft.md](file:///f:/LIBERO/translate-agents-main/examples/prompts/apply-glossary-changes-to-draft.md) |

See also [OPERATOR_PROMPT_PLAYBOOK.md](file:///f:/LIBERO/translate-agents-main/docs/OPERATOR_PROMPT_PLAYBOOK.md) for safety rules around glossary operations.

## Glossary Operation Risk Levels

| Thao tác | Level | Cần xác nhận? |
|---|---|---|
| Check status | 0 | Không |
| Generate candidates | 1 | Không |
| Export review sheet | 1 | Không |
| Approve terms | 2 | Khuyến nghị |
| Change request | 3 | Cần — sau khi xem diff và impact |
| Apply to draft | 3 | Cần |
| Apply to final | 4 | Cần câu xác nhận rõ ràng |

See [OPERATOR_RISK_LEVEL_MATRIX.md](file:///f:/LIBERO/translate-agents-main/docs/OPERATOR_RISK_LEVEL_MATRIX.md) for full risk matrix.

