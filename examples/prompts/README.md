# Prompt Examples for Non-Technical Users

Các prompt trong thư mục này giúp người không chuyên vận hành framework qua Antigravity mà không cần nhớ CLI.

## Cách dùng

1. Chọn prompt phù hợp với nhu cầu của bạn.
2. Copy nội dung prompt.
3. Điền thông tin trong dấu `[ ]` (xóa dấu ngoặc sau khi điền).
4. Gửi cho Antigravity.
5. Antigravity sẽ kiểm tra trạng thái, chạy dry-run trước và báo cáo kết quả bằng ngôn ngữ dễ hiểu.

## Danh sách Prompt Templates

| File | Tình huống |
|---|---|
| [start-new-book.md](start-new-book.md) | Bắt đầu dịch một cuốn sách OpenStax mới |
| [free-form-request.md](free-form-request.md) | Yêu cầu tự do bằng ngôn ngữ tự nhiên |
| [translate-one-chapter-draft.md](translate-one-chapter-draft.md) | Dịch thử một chương (bản nháp) |
| [translate-full-book-safe.md](translate-full-book-safe.md) | Dịch nháp toàn bộ sách an toàn |
| [check-project-status.md](check-project-status.md) | Kiểm tra trạng thái dự án |
| [run-quality-checks.md](run-quality-checks.md) | Chạy kiểm tra chất lượng |
| [review-glossary.md](review-glossary.md) | Kiểm tra và duyệt bảng thuật ngữ |
| [update-glossary-after-expert-review.md](update-glossary-after-expert-review.md) | Cập nhật glossary sau khi chuyên gia duyệt |
| [apply-glossary-changes-to-draft.md](apply-glossary-changes-to-draft.md) | Áp dụng thuật ngữ mới vào bản nháp |
| [create-preview-and-epub.md](create-preview-and-epub.md) | Tạo preview HTML và EPUB |
| [recover-from-error.md](recover-from-error.md) | Khôi phục workflow khi bị lỗi |
| [approve-final-translation.md](approve-final-translation.md) | Chuyển bản nháp sang bản dịch chính thức |

## Quy trình thông thường cho sách mới

Nếu bạn chưa biết bắt đầu từ đâu, hãy theo thứ tự này:

```
1. start-new-book.md         ← Khởi tạo project
2. check-project-status.md   ← Kiểm tra trạng thái
3. review-glossary.md        ← Tạo và duyệt glossary
4. translate-one-chapter-draft.md  ← Dịch thử một chương
5. run-quality-checks.md     ← Kiểm tra chất lượng
6. translate-full-book-safe.md     ← Dịch toàn bộ sách
7. create-preview-and-epub.md      ← Tạo output
8. approve-final-translation.md    ← Approve bản chính
```

## Lưu ý quan trọng

- **Antigravity luôn chạy dry-run trước** với mọi thao tác lớn.
- **Antigravity sẽ hỏi xác nhận** trước bất kỳ thao tác nào có rủi ro.
- **Không cần nhớ CLI** — chỉ cần mô tả nhu cầu của bạn.
- **Bạn có thể yêu cầu bằng tiếng Việt tự nhiên** — không cần theo template chính xác.
- Nếu muốn yêu cầu tự do, dùng `free-form-request.md`.
