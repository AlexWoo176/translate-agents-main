# Review Glossary Prompt

Tôi muốn kiểm tra và duyệt bảng thuật ngữ trước khi dịch hàng loạt.

## Thông tin

- Mã sách: [bookSlug, ví dụ: psychology-2e]

## Yêu cầu

1. Kiểm tra trạng thái glossary hiện tại.
2. Báo cáo số lượng thuật ngữ theo từng trạng thái: candidate, needs_review, approved, locked, rejected.
3. Nếu chưa có glossary candidates, hãy tạo candidates ở chế độ dry-run trước, sau đó hỏi tôi có muốn tạo thật không.
4. Nếu đã có candidates, xuất file review sheet để tôi/chuyên gia có thể kiểm tra.
5. Không tự approve thuật ngữ nếu chưa có review result từ chuyên gia.
6. Giải thích ý nghĩa các trạng thái glossary bằng tiếng Việt đơn giản.
7. Cho tôi biết bước tiếp theo:
   - Cần làm gì để glossary đạt 100% approved?
   - Khi nào có thể bắt đầu dịch full book?
