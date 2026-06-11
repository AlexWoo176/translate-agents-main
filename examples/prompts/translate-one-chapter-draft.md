# Translate One Chapter Draft Prompt

Tôi muốn dịch thử một chương trước khi dịch toàn bộ sách.

## Thông tin

- Mã sách: [bookSlug, ví dụ: psychology-2e]
- Chương muốn dịch thử: [chapter-1 / chapter-2 / ...]
- Chế độ: bản nháp (không ghi đè bản dịch chính thức)
- Không xuất EPUB hay Preview trong lần này

## Yêu cầu

1. Kiểm tra trạng thái sách trước.
2. Kiểm tra glossary status.
   - Nếu glossary chưa approved, vẫn có thể chạy pilot nhưng hãy cảnh báo cho tôi biết.
3. Chạy dry-run cho chương này trước — cho tôi xem kế hoạch.
4. Sau khi tôi xác nhận, chạy workflow cần thiết cho chương này.
5. Chỉ tạo bản dịch draft (không `--write-final`).
6. Sau khi dịch, chạy kiểm tra chất lượng.
7. Báo cáo:
   - Chương đã được dịch.
   - Kết quả quality checks.
   - Có vấn đề gì không.
   - Bước tiếp theo được đề xuất.

## AI Provider

- Nếu đây là yêu cầu dịch thật, hãy sử dụng model hiện đang được chọn trong Antigravity.
- Không dùng `mock` trừ khi tôi nói rõ là chỉ muốn test workflow.
- Trước khi chạy, hãy nói rõ provider/model nào sẽ được dùng.
- Chỉ ghi kết quả vào draft.
- Không ghi final.

## Yêu cầu an toàn

- Không ghi đè bản dịch chính thức (`05-translated`).
- Không dùng `--write-final`.
- Khi người dùng yêu cầu dịch thật, Anti mặc định sử dụng model hiện đang được chọn trong Antigravity và chỉ ghi kết quả vào draft. Chỉ dùng external AI provider/API_KEY của framework khi provider đó đã được cấu hình rõ ràng và tôi xác nhận muốn dùng. Không dùng `mock` cho yêu cầu dịch thật, trừ khi tôi nói rõ là chỉ muốn chạy thử workflow.
- Không tự tiếp tục nếu có failed gate.
