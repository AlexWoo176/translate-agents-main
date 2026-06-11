# Operator Risk Level Matrix

## Overview

Mọi thao tác trong framework đều được phân loại theo 5 mức rủi ro (Level 0-4). Antigravity sử dụng ma trận này để quyết định cần làm gì trước khi thực hiện lệnh.

## Level 0 — Safe Read-Only

**Mô tả**: Chỉ đọc dữ liệu, không ghi file, không thay đổi trạng thái.

**Ví dụ**:
- `node cli/index.js status <bookSlug>`
- `node cli/index.js qa <bookSlug> --all`
- `node cli/index.js glossary <bookSlug> --status`
- `node cli/index.js validate-production <bookSlug>`
- Bất kỳ lệnh nào có `--dry-run`

**Hành vi của Antigravity**:
- Có thể chạy ngay sau khi thông báo cho người dùng.
- Không cần xác nhận.
- Không cần dry-run (bản thân đã là read-only).

---

## Level 1 — Low-Risk File Creation

**Mô tả**: Tạo file mới, không ghi đè dữ liệu có sẵn quan trọng.

**Ví dụ**:
- `init-book` (khởi tạo project mới)
- Tạo `project-plan.json`, `tasks.md`
- Tạo báo cáo lần đầu
- Tạo `glossary-candidates.csv` lần đầu
- Tạo `glossary-review-sheet.csv`

**Hành vi của Antigravity**:
- Chạy dry-run trước với project mới.
- Kiểm tra xem bookSlug đã tồn tại chưa.
- Nếu bookSlug đã tồn tại: cảnh báo và hỏi người dùng.
- Sau khi confirm: chạy thật.

---

## Level 2 — Intermediate Outputs

**Mô tả**: Tạo hoặc cập nhật file output của các phase chính. Có thể ghi đè dữ liệu phase nếu dùng `--force`.

**Ví dụ**:
- `scrape` — tải HTML từ OpenStax
- `clean` — làm sạch HTML
- `analyze` — phân tích nội dung
- `prep` — tạo file bilingual
- `translate` ở chế độ draft (không `--write-final`)
- `review` — tạo báo cáo review

**Hành vi của Antigravity**:
- Giải thích kế hoạch trước.
- Chạy dry-run nếu scope lớn (full book, nhiều chapter).
- Cảnh báo nếu sẽ ghi đè dữ liệu cũ.
- Chạy thật sau khi người dùng hiểu kế hoạch.

---

## Level 3 — Overwrite / Rebuild Outputs

**Mô tả**: Ghi đè hoặc rebuild dữ liệu đã có. Cần backup.

**Ví dụ**:
- Dùng `--force` với bất kỳ phase nào
- Rebuild preview (`build_preview` khi đã có preview)
- Rebuild EPUB (`export_epub` khi đã có EPUB)
- Apply glossary changes to draft (`--apply-to-draft`)
- Re-scrape khi đã có `01-raw`
- Re-clean khi đã có `02-clean`
- Xóa và tạo lại analysis

**Hành vi của Antigravity**:
- Cảnh báo rõ ràng: "Thao tác này sẽ ghi đè dữ liệu."
- Liệt kê những gì sẽ bị ảnh hưởng.
- Xác nhận backup sẽ được tạo tại đâu.
- Liệt kê những gì KHÔNG bị ảnh hưởng.
- **Yêu cầu xác nhận rõ ràng từ người dùng trước khi chạy**.
- Chạy với backup enabled.

---

## Level 4 — High Risk / Final Output

**Mô tả**: Ghi đè bản dịch chính thức hoặc thao tác không thể phục hồi dễ dàng. Đây là mức cao nhất.

**Ví dụ**:
- `translate` với `--write-final`
- Apply glossary changes to final (`--apply-to-draft` target `final` + `--confirm-final`)
- Full book translation với external AI provider (chi phí thực) hoặc thực hiện tác vụ dịch thật trên phạm vi lớn
- Ghi đè `05-translated/` (bản dịch chính thức)
- Final publication approval

**Hành vi của Antigravity**:
- **Block hoàn toàn** cho đến khi nhận được xác nhận rõ ràng bằng văn bản.
- Người dùng phải gõ câu xác nhận cụ thể.
- Backup bắt buộc trước khi thực hiện.
- Báo cáo impact report bắt buộc (glossary, stale chapters...).
- Kiểm tra review reports trước.
- Kiểm tra không có failed gate nào.
- Không thể bypass bằng "chạy tiếp đi" hay "ok thôi".

---

## Quick Reference Table

| Thao tác | Level | Dry-run? | Xác nhận? | Backup? |
|---|---|---|---|---|
| status | 0 | Không cần | Không cần | Không |
| qa list | 0 | Không cần | Không cần | Không |
| validate-production | 0 | Không cần | Không cần | Không |
| Bất kỳ lệnh --dry-run | 0 | Chính nó | Không cần | Không |
| init-book (mới) | 1 | Có | Không cần | Không |
| init-book (slug đã tồn tại) | 3 | Có | Cần | Có |
| generate-candidates | 1 | Đề xuất | Không cần | Không |
| review-export | 1 | Không cần | Không cần | Không |
| approve glossary | 2 | Đề xuất | Khuyến nghị | Tự động |
| change-request | 2-3 | Bắt buộc | Cần | Tự động |
| scrape (lần đầu) | 2 | Đề xuất | Không cần | Không |
| scrape (có sẵn) | 3 | Có | Cần | Không |
| clean | 2-3 | Đề xuất | Nếu overwrite | Không |
| analyze | 2 | Đề xuất | Không cần | Không |
| prep | 2-3 | Đề xuất | Nếu overwrite | Không |
| translate (draft) | 2 | Scope lớn | Không cần | Tự động |
| translate (final) | 4 | Bắt buộc | Bắt buộc rõ | Tự động |
| translate full book draft | 3 | Bắt buộc | Cần | Tự động |
| translate full book final | 4 | Bắt buộc | Bắt buộc rõ | Tự động |
| review | 2 | Không cần | Không cần | Không |
| archive | 2-3 | Đề xuất | Nếu overwrite | Không |
| build_preview (lần đầu) | 2 | Đề xuất | Không cần | Không |
| build_preview (overwrite) | 3 | Có | Cần | Không |
| export_epub (lần đầu) | 2 | Đề xuất | Không cần | Không |
| export_epub (overwrite) | 3 | Có | Cần | Không |
| apply to draft | 3 | Bắt buộc | Cần | Tự động |
| apply to final | 4 | Bắt buộc | Bắt buộc rõ | Tự động |
| --force với bất kỳ phase | 3-4 | Có | Cần | Khuyến nghị |
