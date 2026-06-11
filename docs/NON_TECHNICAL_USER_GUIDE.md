# Non-Technical User Guide

## Bạn có thể làm gì với framework này?

- Khởi tạo sách OpenStax mới để bắt đầu dự án dịch thuật.
- Dịch thử một chương để kiểm tra chất lượng.
- Dịch nháp toàn bộ sách.
- Kiểm tra chất lượng bản dịch tự động.
- Tạo và duyệt bảng thuật ngữ (glossary).
- Cập nhật thuật ngữ sau khi hỏi chuyên gia ngôn ngữ.
- Tạo bản xem trước HTML.
- Tạo file EPUB xuất bản.
- Khôi phục workflow khi có lỗi.
- Chuyển bản nháp sang bản dịch chính thức.

## Bạn không cần biết gì?

- Không cần nhớ CLI commands.
- Không cần biết Node.js hay lập trình.
- Không cần hiểu cấu trúc thư mục `01-raw`, `02-clean`, `03-analyzed`.
- Không cần hiểu chi tiết kỹ thuật của quality gate.
- Không cần tự chọn phase nào chạy trước.
- Không cần hiểu cách framework xử lý HTML.

## Bạn cần cung cấp gì?

| Thông tin | Ví dụ | Bắt buộc không? |
|---|---|---|
| Tên sách | "Psychology 2e" | Có |
| Link OpenStax hoặc mã sách | `psychology-2e` | Có |
| Muốn dịch thử hay dịch toàn bộ | "dịch thử chương 2" | Có |
| Muốn bản nháp hay bản chính thức | "bản nháp" | Có |
| Có cho phép ghi đè không | "có" hoặc "không" | Khi cần |
| Có muốn chuyên gia duyệt glossary không | "có" | Khuyến nghị |
| Có muốn xuất preview/EPUB không | "muốn xuất EPUB" | Khi cần |

## Cách bắt đầu an toàn

Quy trình khuyến nghị cho sách mới:

```
1. Khởi tạo project
        ↓
2. Kiểm tra trạng thái
        ↓
3. Tạo glossary candidates
        ↓
4. Chuyên gia duyệt glossary
        ↓
5. Approve glossary
        ↓
6. Dịch thử một chương (pilot)
        ↓
7. Review kết quả pilot
        ↓
8. Chạy dịch nháp toàn bộ sách
        ↓
9. Review toàn bộ
        ↓
10. Chuyển sang bản chính thức (khi sẵn sàng)
```

> **Lưu ý**: Bạn không cần tự chạy từng bước. Chỉ cần nói với Antigravity mục tiêu của bạn — Antigravity sẽ chọn bước đúng và an toàn.

## Cách đọc báo cáo

Sau mỗi thao tác, Antigravity sẽ báo cáo theo dạng dễ hiểu:

| Kết quả | Ý nghĩa | Bạn cần làm gì? |
|---|---|---|
| ✅ **Thành công** | Bước đã hoàn tất, không có vấn đề. | Có thể tiếp tục bước tiếp theo. |
| ⚠️ **Có cảnh báo** | Có thể tiếp tục nhưng nên xem kỹ nội dung cảnh báo. | Đọc cảnh báo, hỏi Antigravity nếu không rõ. |
| 👤 **Cần human review** | Cần người kiểm tra trước khi đi tiếp. | Xem xét nội dung và cho Antigravity biết quyết định. |
| ❌ **Thất bại** | Đã xảy ra lỗi, cần sửa trước khi tiếp tục. | Hỏi Antigravity cách khôi phục. |
| 🔐 **Cần xác nhận** | Antigravity đang chờ bạn cho phép thao tác có rủi ro. | Đọc mô tả, xác nhận hoặc từ chối rõ ràng. |

## Các thao tác an toàn nhất

Bạn luôn có thể yêu cầu các thao tác này mà không cần lo về rủi ro:

- Kiểm tra trạng thái sách.
- Xem danh sách quality gates.
- Xem trạng thái glossary.
- Xem báo cáo chất lượng.
- Chạy kiểm tra ở chế độ dry-run (không ghi file thật).

## Các thao tác cần xác nhận rõ

Trước khi thực hiện, Antigravity **sẽ luôn hỏi bạn xác nhận** với các thao tác sau:

- Ghi đè dữ liệu đã có (cần `--force`).
- Chuyển bản nháp sang bản chính thức (cần `--write-final`).
- Áp dụng thay đổi glossary vào bản dịch chính thức.
- Dịch toàn bộ sách lần đầu tiên.
- Xóa hoặc tạo lại EPUB/preview khi đã có bản cũ.

## Ví dụ yêu cầu bằng ngôn ngữ tự nhiên

Bạn có thể nói với Antigravity theo bất kỳ cách nào:

> "Tôi muốn bắt đầu dịch cuốn Psychology 2e của OpenStax."

> "Dịch thử chương 2 của sách psychology-2e cho tôi xem."

> "Kiểm tra xem dự án psychology-2e đang ở tình trạng thế nào."

> "Glossary của sách này ổn chưa? Tôi muốn xem trước khi dịch thật."

> "Tôi đã hỏi chuyên gia và muốn cập nhật bảng thuật ngữ."

> "Tạo EPUB cho sách này."

> "Workflow bị lỗi, giúp tôi khôi phục."

Xem thêm template sẵn có tại `examples/prompts/`.

## Giải thích các khái niệm cơ bản

| Khái niệm | Nghĩa đơn giản |
|---|---|
| **bookSlug** | Mã ngắn gọn của sách, ví dụ `psychology-2e` |
| **Phase** | Một bước trong quy trình dịch (scrape, clean, analyze, translate...) |
| **Draft** | Bản nháp, chưa phải bản chính thức |
| **Final** | Bản chính thức, cần xác nhận trước khi tạo |
| **Quality Gate** | Kiểm tra tự động xem bước đó đã đạt yêu cầu chưa |
| **Glossary** | Bảng thuật ngữ chuẩn để đảm bảo nhất quán trong toàn bộ bản dịch |
| **Dry-run** | Chạy thử để kiểm tra kế hoạch, không ghi file thật |
| **Pilot chapter** | Dịch thử một chương để kiểm tra trước khi dịch toàn bộ sách |
| **Preview** | Bản xem trước HTML, có thể mở trong trình duyệt |
| **EPUB** | File sách điện tử chuẩn để xuất bản |

## Câu hỏi thường gặp

**Tôi có bị mất dữ liệu không?**
Không. Antigravity luôn tạo backup trước khi ghi đè. Dry-run không bao giờ sửa file thật.

**Tôi có cần cài đặt gì không?**
Framework đã được cài đặt sẵn. Bạn chỉ cần mô tả nhu cầu của mình.

**Tôi có thể dịch bằng AI không?**

Có.

Nếu bạn đang vận hành framework trong Google Antigravity, Anti sẽ mặc định sử dụng model hiện đang được chọn trong Antigravity để hỗ trợ dịch, review, tạo glossary hoặc xử lý nội dung.

Framework cũng có chế độ `mock`, nhưng `mock` không phải bản dịch thật. `mock` chỉ dùng để kiểm tra workflow, chạy thử pipeline hoặc xác nhận hệ thống có hoạt động đúng hay không.

Nếu framework được cấu hình thêm AI provider riêng bằng API key, ví dụ OpenAI, Gemini, Claude, Azure hoặc API nội bộ, Anti chỉ được dùng provider đó khi bạn hoặc operator xác nhận rõ. Anti không được âm thầm chuyển sang external AI provider vì thao tác này có thể phát sinh chi phí.

Mặc định an toàn là:

```text
Dịch thật → dùng model hiện tại trong Antigravity → ghi vào draft.
Test workflow → dùng mock.
External AI API → chỉ dùng khi đã cấu hình và được xác nhận.
Final translation → chỉ sau human review và xác nhận rõ.
```

**Glossary là gì và tại sao cần duyệt?**
Glossary là danh sách thuật ngữ chuẩn. Nếu không duyệt, các thuật ngữ chuyên ngành có thể dịch không nhất quán giữa các chương.

**Tôi có cần tự chọn phase không?**
Không. Chỉ cần nói mục tiêu, Antigravity tự chọn phase phù hợp.
