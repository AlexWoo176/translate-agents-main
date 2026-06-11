# Create Preview and EPUB Prompt

Tôi muốn tạo bản xem trước HTML và file EPUB cho sách.

## Thông tin

- Mã sách: [bookSlug, ví dụ: psychology-2e]

## Yêu cầu

1. Kiểm tra sách đã đủ điều kiện tạo preview/EPUB chưa:
   - Phase archive đã hoàn thành chưa?
   - Có failed gate blocking nào không?
2. Kiểm tra `glossaryImpact` — đảm bảo preview/EPUB không dùng bản dịch đã lỗi thời.
3. Chạy dry-run cho `build_preview` trước — cho tôi xem kế hoạch.
4. Nếu preview đã tồn tại, hỏi tôi có muốn ghi đè không (không tự ghi đè).
5. Chạy dry-run cho `export_epub` — cho tôi xem kế hoạch.
6. Nếu EPUB đã tồn tại, hỏi tôi có muốn ghi đè không.
7. Sau khi tôi xác nhận, tạo preview và EPUB.
8. Sau khi tạo, chạy quality check (`previewCssReferences`, `epubValidity`).
9. Báo cáo:
   - Đường dẫn đến preview HTML.
   - Đường dẫn đến EPUB.
   - Kết quả quality check.
   - Cảnh báo nếu có.

## Yêu cầu an toàn

- Không tự ghi đè preview/EPUB cũ nếu tôi chưa xác nhận.
- Không tạo preview/EPUB nếu có failed gate blocking.
- Nếu glossaryImpact cho thấy bản dịch đã lỗi thời: cảnh báo và hỏi tôi có muốn tiếp tục không.
