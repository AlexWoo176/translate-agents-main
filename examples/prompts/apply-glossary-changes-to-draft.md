# Apply Glossary Changes To Draft Prompt

Tôi muốn áp dụng thuật ngữ đã cập nhật vào bản dịch nháp.

## Thông tin

- Mã sách: [bookSlug, ví dụ: psychology-2e]
- Phạm vi: [affected chapters — chỉ các chương bị ảnh hưởng / all — tất cả chương]

## Yêu cầu

1. Kiểm tra glossary impact report — xem chương nào và thuật ngữ nào bị ảnh hưởng.
2. Chạy dry-run trước — cho tôi xem file nào sẽ bị chỉnh sửa.
3. Chỉ áp dụng vào bản nháp (`05-translated-draft`) — không động vào bản chính thức.
4. Backup các file draft trước khi sửa.
5. Sau khi áp dụng, đề xuất chạy review lại cho các chương bị ảnh hưởng.
6. Báo cáo:
   - Bao nhiêu file được cập nhật.
   - Thuật ngữ nào được thay thế.
   - Có lỗi nào không.

## Yêu cầu an toàn

- Không sửa bản dịch chính thức (`05-translated`) — chỉ sửa bản nháp.
- Nếu tôi muốn áp dụng vào bản chính thức, phải hỏi tôi xác nhận thêm với câu xác nhận rõ ràng.
- Không tự bỏ qua lỗi nào trong quá trình apply.
- Nếu không tìm thấy bản dịch nháp để sửa: báo cáo cho tôi, đừng tự chuyển sang sửa bản chính thức.
