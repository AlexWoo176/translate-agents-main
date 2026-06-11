# Run Quality Checks Prompt

Hãy chạy kiểm tra chất lượng cho sách.

## Thông tin

- Mã sách: [bookSlug, ví dụ: psychology-2e]

## Yêu cầu

1. Chạy toàn bộ quality gates cho sách.
2. Không sửa hay ghi đè dữ liệu sách — chỉ đọc và kiểm tra.
3. Báo cáo kết quả theo dạng dễ đọc:
   - ✅ Gate đã pass (bình thường)
   - ⚠️ Gate có warning (cần xem kỹ)
   - ❌ Gate bị failed (phải sửa trước)
   - 👤 Gate cần human review
4. Đặc biệt kiểm tra và giải thích rõ:
   - `glossaryApproval` — thuật ngữ đã được duyệt chưa?
   - `glossaryImpact` — có chương nào bị ảnh hưởng bởi thay đổi thuật ngữ không?
   - `translationCompleteness` — bản dịch đã đầy đủ chưa?
   - `reviewCompleteness` — review đã xong chưa?
5. Nếu có lỗi blocking: đề xuất cách xử lý cụ thể.
6. Nếu chỉ có warning: cho biết có thể tiếp tục không.
7. Tóm tắt cuối: sách có sẵn sàng để tiếp tục workflow không?
