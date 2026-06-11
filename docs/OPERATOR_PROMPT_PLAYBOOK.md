# Operator Prompt Playbook

## Purpose

Tài liệu này giúp người không chuyên vận hành OpenStax Translation Workflow Core thông qua Antigravity mà không cần nhớ CLI.

## Core Principle

Người dùng nói mục tiêu.
Antigravity hiểu intent.
Antigravity kiểm tra trạng thái.
Antigravity chọn bước an toàn.
Antigravity chạy dry-run trước.
Antigravity không ghi đè dữ liệu nếu chưa được xác nhận.
Antigravity báo cáo bằng ngôn ngữ dễ hiểu.

## Operator Safety Rules

1. Luôn kiểm tra trạng thái sách trước.
2. Luôn chạy dry-run trước với sách mới, workflow dài hoặc thao tác rủi ro.
3. Không dùng `--force` nếu người dùng chưa xác nhận rõ.
4. Không dùng `--write-final` nếu người dùng chưa xác nhận rõ.
5. Không dùng external AI provider nếu chưa được cấu hình.
6. Không ghi đè bản dịch final.
7. Không tự sửa glossary nếu chưa backup/diff/impact.
8. Không dịch full book nếu glossaryApproval failed.
9. Nếu glossary chưa approved, khuyến nghị pilot chapter trước.
10. Nếu có failed gate, dừng lại và báo cáo.
11. Nếu có warning quan trọng, hỏi người dùng trước khi tiếp tục.
12. Không chỉ trả raw CLI output; phải diễn giải dễ hiểu.

## Common User Intents

- Bắt đầu sách mới.
- Dịch thử một chương.
- Dịch nháp toàn bộ sách.
- Kiểm tra trạng thái project.
- Kiểm tra quality gates.
- Duyệt glossary.
- Cập nhật glossary sau khi chuyên gia review.
- Áp dụng glossary mới vào draft.
- Tạo preview.
- Tạo EPUB.
- Khôi phục workflow bị lỗi.
- Chuyển draft sang final.

## Operator Flow

1. Understand user request.
2. Identify bookSlug or ask for missing info.
3. Classify intent.
4. Classify risk level.
5. Check status.
6. Check glossary status when relevant.
7. Build safe dry-run command.
8. Explain plan.
9. Ask for confirmation if needed.
10. Execute only safe command.
11. Report result.
12. Recommend next step.

## What Antigravity Must Never Do Automatically

- Không tự chạy full book translation final.
- Không tự dùng `--force`.
- Không tự dùng `--write-final`.
- Không tự apply glossary changes to final translation.
- Không tự overwrite preview/EPUB nếu chưa xác nhận.
- Không tự bỏ qua failed gate.
- Không tự coi glossary candidate là approved.
- Không tự dùng external AI provider khi chưa có cấu hình.

## Operator Decision Tree

```
User Request Received
        │
        ▼
Parse Intent & Identify bookSlug
        │
        ├─── Missing bookSlug? ──→ Ask user for book info
        │
        ▼
Classify Intent & Risk Level
        │
        ├─── Level 0 (read-only) ──→ Run immediately, report result
        ├─── Level 1 (low-risk)  ──→ Dry-run first, then confirm
        ├─── Level 2 (medium)    ──→ Explain plan, dry-run, confirm
        ├─── Level 3 (overwrite) ──→ Warn + backup + confirm
        └─── Level 4 (final)     ──→ Block until explicit confirmation
                │
                ▼
        Check Status First
                │
                ▼
        Check Glossary Status (if translate/review involved)
                │
                ├─── glossaryApproval failed? ──→ Stop, recommend glossary review
                ├─── candidate/needs_review?   ──→ Warn, pilot chapter only
                └─── approved?                 ──→ Proceed to next step
                │
                ▼
        Run dry-run → Show plan → Ask confirmation → Execute
```

## Glossary Operation Rules

| Situation | Antigravity Action |
|---|---|
| No glossary candidates yet | Offer to generate candidates (dry-run first) |
| Candidates exist, none approved | Warn: cannot do full book translation |
| Partially approved | Warn: pilot chapter only recommended |
| Fully approved | Proceed with translation |
| Changed terms detected | Run impact analysis, warn about stale chapters |
| User wants to change glossary | Backup → diff → impact → confirm |
| User wants to apply to draft | Dry-run → list affected files → confirm |
| User wants to apply to final | Block unless explicit `--confirm-final` |

## Reporting Guidelines

After every command execution, report in plain language:

1. **What was done**: one sentence summary.
2. **What was created/updated**: list of files (simplified paths).
3. **Warnings**: explain each warning in simple terms.
4. **Errors**: explain what went wrong and why.
5. **Quality gate results**: pass/warn/fail with explanation.
6. **Next recommended step**: one clear action.

Do NOT paste raw JSON or raw terminal output as the final answer. Always interpret and summarize.

## See Also

- `docs/ANTIGRAVITY_OPERATION_GUIDE.md` — Detailed SOP for Antigravity
- `docs/USER_INTENT_HANDLING_RULES.md` — How to parse free-form user requests
- `docs/OPERATOR_RISK_LEVEL_MATRIX.md` — Risk classification
- `docs/USER_INTENT_TO_CLI_MAPPING.md` — Intent to CLI command mapping
- `examples/prompts/` — Ready-to-use prompt templates
