# Approve Final Translation Prompt

Tôi muốn chuyển bản dịch nháp sang bản dịch chính thức.

## Thông tin

- Mã sách: [bookSlug, ví dụ: psychology-2e]
- Phạm vi: [chapter-1 hoặc all — toàn bộ sách]
- Tôi xác nhận đã review bản dịch nháp: Có / Không

## Yêu cầu

1. Kiểm tra review reports — bản dịch nháp đã được review chưa?
2. Kiểm tra `glossaryApproval` — glossary đã fully approved chưa?
3. Kiểm tra `glossaryImpact` — có chương nào dùng thuật ngữ đã lỗi thời không?
4. Kiểm tra còn lỗi blocking nào không.
5. Chạy dry-run trước khi ghi bản chính thức — cho tôi xem kế hoạch.
6. Nếu cần ghi đè `05-translated` (bản dịch chính thức cũ), backup trước.
7. Hiển thị rõ ràng:
   - File nào sẽ được ghi đè.
   - File nào sẽ được tạo mới.
   - Backup được tạo ở đâu.
   - Dữ liệu nào KHÔNG bị ảnh hưởng.
8. Chỉ thực hiện khi tôi xác nhận bằng câu:
   > "Tôi xác nhận tiếp tục và cho phép ghi bản dịch chính thức sau khi backup."

## Yêu cầu an toàn — CỰC KỲ QUAN TRỌNG

- **Không tự thực hiện** nếu tôi chưa gõ câu xác nhận ở trên.
- Không bỏ qua bước kiểm tra review reports.
- Không bỏ qua bước kiểm tra glossaryApproval.
- Nếu có failed gate: dừng hoàn toàn, không thực hiện.
- Nếu không có backup gần đây: tạo backup trước khi ghi bất cứ điều gì.
- Sau khi hoàn thành, chạy quality check và báo cáo kết quả.
