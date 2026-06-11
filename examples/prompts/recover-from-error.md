# Recover From Error Prompt

Workflow của tôi bị dừng hoặc báo lỗi. Hãy giúp tôi khôi phục.

## Thông tin

- Mã sách: [bookSlug, ví dụ: psychology-2e]
- Lỗi gần nhất (nếu có): [dán thông báo lỗi hoặc mô tả vấn đề]
- Phase bị lỗi (nếu biết): [ví dụ: translate, review, scrape]

## Yêu cầu

1. Kiểm tra checkpoint — có thể resume từ đâu không?
2. Kiểm tra workflow-state — phase nào đang ở trạng thái lỗi?
3. Đọc report liên quan đến phase bị lỗi.
4. Xác định nguyên nhân lỗi (nếu có thể).
5. Đề xuất cách khôi phục an toàn:
   - Có thể resume từ checkpoint không?
   - Cần re-run phase nào?
   - Cần fix gì trước?
6. Không tự chạy lại phase destructive nếu tôi chưa xác nhận.
7. Nếu có thể resume, hãy chạy dry-run resume trước.
8. Báo cáo rõ:
   - Dữ liệu có bị mất không?
   - Những gì an toàn để resume.
   - Những gì cần cẩn thận.
9. Sau khi tôi xác nhận, thực hiện khôi phục.

## Yêu cầu an toàn

- Không tự xóa hay ghi đè dữ liệu đang có.
- Không bỏ qua failed gate để tiếp tục.
- Nếu lỗi nghiêm trọng không rõ nguyên nhân: báo cáo rõ và chờ tôi quyết định.
