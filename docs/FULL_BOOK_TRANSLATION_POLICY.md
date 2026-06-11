# Full Book Translation Policy

## Default Rule

Full book translation is not the default first action.

Antigravity must never automatically start full book translation without:
1. Verifying the project exists and is healthy.
2. Checking glossary approval status.
3. Recommending pilot chapter first.
4. Running a dry-run of the full workflow.
5. Getting explicit user confirmation.

## The Problem with Rushing Full Book Translation

Translating a full book immediately carries these risks:

| Risk | Consequence |
|---|---|
| Glossary not approved | Inconsistent terminology across all chapters |
| Provider not configured | Full book run with mock/placeholder translations |
| Pre-existing errors in earlier phases | Errors propagate and compound across all chapters |
| Overwriting existing good translations | Data loss |
| External AI cost spike | Unexpected API costs if AI provider is configured |
| Phase failure mid-book | Incomplete translation state, harder to recover |

## Recommended Path

```
Phase 1: Initialize project
          ↓
Phase 2: Scrape source HTML
          ↓
Phase 3: Clean HTML
          ↓
Phase 4: Analyze content + generate glossary candidates
          ↓
Phase 5: Glossary human review + approval
          ↓
Phase 6: Prep (create bilingual HTML)
          ↓
Phase 7: Translate ONE PILOT CHAPTER (draft, mock provider)
          ↓
Phase 8: Review pilot chapter
          ↓
Phase 9: Full book dry-run (no real output)
          ↓
Phase 10: Translate full book as draft
          ↓
Phase 11: Review full book
          ↓
Phase 12: Archive + Preview + EPUB
          ↓
Phase 13: Final translation (only when all above complete)
```

## If User Asks "Dịch Full Luôn" (Translate Everything Now)

Antigravity must respond with this pattern:

---

**Tôi hiểu bạn muốn dịch toàn bộ sách.**

Đây là thao tác lớn, nên tôi cần kiểm tra một số điều trước:

1. Trước tiên, hãy để tôi kiểm tra trạng thái project.
2. Kiểm tra glossary đã được duyệt chưa.

*[Chạy status và glossary check]*

Sau khi kiểm tra, tôi khuyến nghị:

> Dịch thử **1 chương** trước để kiểm tra cấu trúc, thuật ngữ và chất lượng. Điều này giúp phát hiện vấn đề sớm trước khi chạy toàn bộ sách.

**Bạn có 2 lựa chọn:**

**A. An toàn nhất** (khuyến nghị):
   - Dịch thử 1 chương draft trước → review kết quả → sau đó mới quyết định dịch full.

**B. Nhanh hơn**:
   - Chạy dry-run toàn bộ workflow trước (không dịch thật, không ghi file) → xem kế hoạch → dịch full book dạng draft.

Bạn muốn chọn A hay B?

---

## Full Book Translation May Proceed Only When

| Điều kiện | Bắt buộc? |
|---|---|
| Project đã tồn tại | ✅ Bắt buộc |
| Workflow dry-run đã pass | ✅ Bắt buộc |
| `glossaryApproval` gate không bị FAILED | ✅ Bắt buộc |
| Translation provider được cấu hình hoặc mock | ✅ Bắt buộc |
| Output ở dạng draft (không `--write-final`) | ✅ Mặc định |
| Người dùng xác nhận rõ ràng lựa chọn A hoặc B | ✅ Bắt buộc |
| Review reports của pilot chapter sạch | ⭐ Khuyến nghị mạnh |
| Glossary fully approved (100%) | ⭐ Khuyến nghị mạnh |

## Glossary Approval Impact on Full Book Translation

| Glossary Status | Full Book Translation Policy |
|---|---|
| `approved` (100%) | Được phép proceed sau dry-run |
| `needs_human_review` (có candidate/needs_review) | Cảnh báo. Cho phép, nhưng khuyến nghị approve glossary trước. Pilot chapter được phép ngay. |
| `failed` / `invalid` | **Block hoàn toàn**. Phải fix glossary trước. |
| `missing` | **Block hoàn toàn**. Phải tạo và approve glossary trước. |

## Final Translation Policy (Draft → Official)

Full book final translation (`--write-final`) is a **Level 4** action.

Antigravity **must not** run this automatically.

Requirements before any final translation:
1. Review reports đã xem và OK.
2. Glossary fully approved.
3. Không có failed gate.
4. Backup đã sẵn sàng.
5. Người dùng gõ câu xác nhận cụ thể:
   > "Tôi xác nhận tiếp tục và cho phép ghi bản dịch chính thức sau khi backup."

## Provider Policy

| Provider | Use Case | Risk |
|---|---|---|
| `mock` | Testing, dry-run, pilot | Low — no cost, placeholder output |
| `manual` | Human translator input | Low — no AI cost |
| External AI (OpenAI, Gemini, etc.) | Production translation | High — API cost, needs configuration |

Default provider: `mock` (always safe for testing).

Antigravity must:
- Always state which provider will be used before running.
- Never silently switch to an external AI provider.
- Warn if external AI provider would be used on full book.
