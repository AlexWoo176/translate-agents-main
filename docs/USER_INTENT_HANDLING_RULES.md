# User Intent Handling Rules

## Purpose

Người dùng không cần nhập đúng template. Antigravity phải hiểu intent từ yêu cầu tự nhiên, kể cả khi yêu cầu mơ hồ, thiếu thông tin hoặc không theo đúng cấu trúc.

## Intent Parsing Model

Với mỗi yêu cầu, Antigravity cần xác định:

1. **Intent**: người dùng muốn làm gì?
2. **Scope**: sách mới, sách cũ, một chương, toàn bộ sách?
3. **Risk**: có ghi đè, final, external AI, full book, glossary change không?
4. **Missing info**: thiếu gì để thực hiện an toàn?
5. **Safe first step**: command an toàn đầu tiên là gì?

## Intent Classification

| Intent Category | Keywords / Patterns | Risk Level |
|---|---|---|
| `check_status` | "kiểm tra", "trạng thái", "status", "phase nào", "đang ở đâu" | 0 |
| `start_new_book` | "sách mới", "bắt đầu", "khởi tạo", "init", "new book" | 1 |
| `generate_glossary` | "tạo glossary", "candidates", "thuật ngữ", "terminology" | 1 |
| `review_glossary` | "duyệt glossary", "review glossary", "kiểm tra thuật ngữ" | 1 |
| `update_glossary` | "cập nhật thuật ngữ", "sửa glossary", "expert review xong" | 3 |
| `apply_glossary_draft` | "áp dụng glossary vào nháp", "apply to draft" | 3 |
| `apply_glossary_final` | "áp dụng glossary vào final", "apply to final" | 4 |
| `translate_pilot` | "dịch thử", "pilot", "thử chương", "một chương" | 2 |
| `translate_full_draft` | "dịch nháp", "dịch full", "dịch toàn bộ", "cả sách" | 2-3 |
| `translate_final` | "dịch chính thức", "final", "bản chính" | 4 |
| `run_quality_checks` | "kiểm tra chất lượng", "quality gate", "qa" | 0 |
| `create_preview` | "preview", "xem trước", "html preview" | 2-3 |
| `create_epub` | "epub", "xuất bản", "export" | 2-3 |
| `recover_workflow` | "lỗi", "khôi phục", "recover", "resume", "bị dừng" | 2-3 |
| `approve_final` | "chuyển sang final", "approve final", "bản chính thức" | 4 |
| `run_full_workflow` | "chạy từ đầu", "toàn bộ quy trình", "full workflow" | 3-4 |

## Examples

### "Dịch cuốn này giúp tôi"

```
Intent: start_new_book_or_translate_existing
Scope: unknown
Risk: unknown until scope determined
Missing info: bookSlug, sourceUrl, chapter or full book, draft or final

Safe response:
- Tôi cần thêm thông tin:
  1. Tên sách hoặc link OpenStax?
  2. Mã sách ngắn (ví dụ: psychology-2e)?
  3. Muốn dịch thử một chương hay toàn bộ sách?
- Đề xuất mặc định: khởi tạo project + dịch thử một chương draft.
```

### "Dịch full luôn"

```
Intent: translate_full_draft
Scope: full book
Risk: Level 2-3
Missing info: bookSlug, glossary status unknown, provider unknown

Safe response:
- Đây là thao tác lớn. Tôi cần kiểm tra:
  1. Trạng thái sách.
  2. Glossary đã approved chưa?
- Khuyến nghị: dịch thử một chương trước.
- Nếu vẫn muốn full: dry-run toàn bộ trước, bản nháp, không ghi final.
- Hai lựa chọn: A (pilot first) / B (full dry-run first)
```

### "Tôi muốn sửa thuật ngữ sau khi hỏi chuyên gia"

```
Intent: update_glossary
Scope: book-level
Risk: Level 3
Missing info: bookSlug, changes file path

Safe response:
1. Kiểm tra glossary hiện tại.
2. Yêu cầu file thay đổi.
3. Chạy dry-run change-request.
4. Hiển thị diff.
5. Chạy impact analysis.
6. Hỏi xác nhận trước khi áp dụng.
7. Backup trước khi ghi.
8. KHÔNG tự áp dụng vào bản dịch ngay.
```

### "Xuất EPUB luôn"

```
Intent: create_epub
Scope: full book
Risk: Level 2-3
Missing info: bookSlug, existing EPUB check

Safe response:
1. status → check gates.
2. Check nếu EPUB đã tồn tại.
3. Chạy export dry-run.
4. Nếu cần ghi đè, hỏi xác nhận.
5. Chỉ thực hiện sau khi xác nhận.
```

### "Chạy tiếp đi"

```
Intent: resume_workflow
Scope: existing book, unknown phase
Risk: Level 2-3
Missing info: bookSlug maybe, what failed

Safe response:
1. Kiểm tra checkpoint.
2. Kiểm tra workflow-state.
3. Hỏi: "Sách nào? Lỗi gì gần nhất?"
4. Đề xuất resume dry-run.
5. Chỉ resume sau khi người dùng xác nhận.
```

### "Glossary ổn chưa?"

```
Intent: review_glossary
Scope: book-level
Risk: Level 0-1
Missing info: bookSlug

Safe response:
1. Hỏi bookSlug nếu chưa có.
2. Chạy: node cli/index.js glossary <bookSlug> --status
3. Báo cáo: tổng số, approved, needs_review, candidate.
4. Đề xuất bước tiếp: review export nếu có candidate/needs_review.
```

### "Tôi xác nhận tiếp tục"

```
Intent: confirm_action
Scope: depends on previous context
Risk: depends on previous context

Safe response:
- Nhận xác nhận.
- Kiểm tra lại action đang chờ xác nhận.
- Chạy action an toàn nhất (backup first nếu cần).
- Báo cáo kết quả.
```

## Missing Info Recovery Matrix

| Missing Info | Antigravity Action |
|---|---|
| bookSlug không có | Hỏi: "Sách nào? Cho tôi biết tên hoặc mã sách." |
| Chapter không rõ | Hỏi: "Muốn chạy chương nào? Nếu không chắc, tôi đề xuất chapter-1." |
| Draft hay final không rõ | Mặc định draft. Nói rõ: "Tôi sẽ tạo bản nháp, không ghi final." |
| Provider không rõ | Dịch thật: mặc định dùng model Antigravity hiện tại (ghi vào draft). Test workflow: mặc định dùng mock. Nói rõ: "Tôi sẽ dùng model hiện tại trong Antigravity để dịch thật sang draft" hoặc "Tôi sẽ dùng mock provider để test workflow". |
| File thay đổi glossary không có | Hỏi: "Bạn có file CSV thay đổi thuật ngữ không? Vui lòng cung cấp đường dẫn." |
| Scope (one chapter/full) không rõ | Hỏi + Đề xuất pilot chapter trước. |

## Ambiguity Resolution Rules

1. **Khi không chắc intent**: đặt câu hỏi ngắn gọn, không làm gì trước.
2. **Khi yêu cầu mâu thuẫn với safety rule**: ưu tiên safety rule, giải thích lý do.
3. **Khi yêu cầu quá rộng**: thu hẹp phạm vi từ nhỏ đến lớn (pilot trước).
4. **Khi yêu cầu vừa là read vừa là write**: tách thành 2 bước, read trước.
5. **Khi có failed gate**: dừng, báo cáo, đề xuất fix, không bỏ qua.

## Tone and Language Rules

- Nếu người dùng viết tiếng Việt, trả lời tiếng Việt.
- Nếu người dùng viết tiếng Anh, trả lời tiếng Anh.
- Luôn thân thiện, không phán xét.
- Đề xuất, không ra lệnh.
- Khi có rủi ro, nói thẳng và rõ ràng.
- Tránh dùng thuật ngữ kỹ thuật khi giải thích cho người không chuyên.
