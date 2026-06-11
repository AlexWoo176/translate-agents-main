# Translate Full Book Safely Prompt

Tôi muốn chạy quy trình dịch nháp cho toàn bộ sách.

## Thông tin

- Mã sách: [bookSlug, ví dụ: psychology-2e]
- Chế độ: dịch nháp (không ghi đè bản dịch chính thức)
- Không dùng external AI nếu chưa cấu hình
- Không xuất bản final nếu chưa review

## Yêu cầu

1. Kiểm tra production readiness (`validate-production`).
2. Kiểm tra trạng thái sách (`status`).
3. Kiểm tra `glossaryApproval` gate:
   - Nếu FAILED: dừng lại và báo cáo — không dịch full book.
   - Nếu chưa 100% approved: khuyến nghị review glossary trước, nhưng vẫn cho tôi chọn tiếp tục.
4. Nếu chưa có pilot chapter: khuyến nghị dịch thử một chương trước.
5. Chạy dry-run toàn bộ workflow — cho tôi xem kế hoạch.
6. Nếu không có lỗi blocking, hỏi tôi có muốn chạy thật không.
7. Sau khi tôi xác nhận, chạy thật từng phase, báo cáo sau mỗi phase quan trọng.
8. Dừng nếu có failed gate — không tự bỏ qua.
9. Báo cáo kết quả cuối cùng bằng tiếng Việt dễ hiểu.

## AI Provider

- Nếu đây là yêu cầu dịch thật, hãy sử dụng model hiện đang được chọn trong Antigravity.
- Không dùng `mock` trừ khi tôi nói rõ là chỉ muốn test workflow.
- Trước khi chạy, hãy nói rõ provider/model nào sẽ được dùng.
- Chỉ ghi kết quả vào draft.
- Không ghi final.

Nếu cần dịch toàn bộ sách bằng AI, hãy:
1. cảnh báo đây là thao tác lớn;
2. khuyến nghị dịch thử một chương trước;
3. kiểm tra glossaryApproval;
4. chạy dry-run trước;
5. chỉ ghi vào draft;
6. không dùng external AI provider/API_KEY nếu chưa được xác nhận rõ.

## Yêu cầu an toàn

- Không dùng `--write-final` — chỉ tạo bản nháp.
- Không dùng `--force` nếu tôi chưa xác nhận.
- Khi người dùng yêu cầu dịch thật, Anti mặc định sử dụng model hiện đang được chọn trong Antigravity và chỉ ghi kết quả vào draft. Chỉ dùng external AI provider/API_KEY của framework khi provider đó đã được cấu hình rõ ràng và tôi xác nhận muốn dùng. Không dùng `mock` cho yêu cầu dịch thật, trừ khi tôi nói rõ là chỉ muốn chạy thử workflow.
- Không bỏ qua failed gate.
- Không tự approve glossary.
- Nếu có ghi đè dữ liệu cũ: hỏi tôi trước.
