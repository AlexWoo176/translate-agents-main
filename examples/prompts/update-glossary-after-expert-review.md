# Update Glossary After Expert Review Prompt

Tôi đã tham khảo chuyên gia và muốn cập nhật bảng thuật ngữ.

## Thông tin

- Mã sách: [bookSlug, ví dụ: psychology-2e]
- File thay đổi glossary: [đường dẫn file CSV hoặc mô tả thay đổi, ví dụ: path/to/changes.csv]

## Yêu cầu

1. Kiểm tra glossary hiện tại trước.
2. Backup glossary trước khi sửa bất cứ điều gì.
3. Validate file thay đổi — kiểm tra cấu trúc và nội dung hợp lệ không.
4. Tạo diff report — cho tôi xem những gì sẽ thay đổi (thuật ngữ nào thêm/sửa/xóa).
5. Không sửa bản dịch ngay — chỉ cập nhật bảng thuật ngữ.
6. Chạy impact analysis — xem chương nào bị ảnh hưởng bởi thay đổi này.
7. Báo cáo rủi ro:
   - Có bản dịch nào sẽ lỗi thời không?
   - Cần re-translate hay re-review chương nào?
8. Hỏi tôi xác nhận trước khi áp dụng thay đổi vào glossary chính.
9. Đề xuất bước tiếp theo sau khi cập nhật.

## Yêu cầu an toàn

- Không sửa bản dịch chương (`05-translated`) ngay lập tức.
- Không tự approve thuật ngữ nếu tôi chưa xác nhận.
- Luôn tạo backup trước khi ghi đè glossary.
- Nếu có locked term bị sửa, hãy cảnh báo đặc biệt.
