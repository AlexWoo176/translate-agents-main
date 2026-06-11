# P0 Chapter 8 EN/VN Parity Check

## Summary
Đã thực hiện kiểm tra độ tương thích (parity check) của các block `.eng` và `.vn` cho toàn bộ 13 tệp HTML thuộc Chương 8 trong cả thư mục nguồn dịch thuật (`chapter-8/05-translated/`) và thư mục build tĩnh (`.html/chapter-8/`).
Kết quả rà soát cho thấy có 12/13 tệp đạt trạng thái cân bằng tuyệt đối (Delta = 0). Duy nhất tệp `8-1-entrepreneurial-marketing-and-the-marketing-mix.html` phát hiện độ lệch Delta = 58 (số lượng `.eng` là 182, trong khi `.vn` là 124).
Nguyên nhân cốt lõi đã được làm rõ và không ảnh hưởng đến hiển thị giao diện, tuy nhiên vẫn cần đánh dấu trạng thái tổng quan là `NEEDS REVIEW`.

## Method
Sử dụng thư viện BeautifulSoup để phân tích cấu trúc cây DOM của từng tệp HTML, quét và kiểm đếm tất cả các phần tử có thuộc tính class chứa `"eng"` (đại diện cho khối tiếng Anh hiển thị/ẩn) và `"vn"` (đại diện cho khối tiếng Việt).
Tính toán độ lệch: `Delta = .eng Count - .vn Count`.

## Scope
- `chapter-8/05-translated/`
- `.html/chapter-8/`

## Per-file Counts — Source Translated

| File | .eng Count | .vn Count | Delta | Status | Notes |
|---|---:|---:|---:|---|---|
| `8-1-entrepreneurial-marketing-and-the-marketing-mix.html` | 182 | 124 | 58 | NEEDS REVIEW | Có 58 thẻ `<li>` nằm trong `<td class="eng hidden">` chứa class `"eng hidden"` dư thừa, trong khi các thẻ `<li>` tương ứng ở `<td class="vn visible">` không có class. |
| `8-2-market-research-market-opportunity-recognition-and-target-market.html` | 147 | 147 | 0 | PASS | Cân bằng hoàn hảo |
| `8-3-marketing-techniques-and-tools-for-entrepreneurs.html` | 79 | 79 | 0 | PASS | Cân bằng hoàn hảo |
| `8-4-entrepreneurial-branding.html` | 76 | 76 | 0 | PASS | Cân bằng hoàn hảo |
| `8-5-marketing-strategy-and-the-marketing-plan.html` | 63 | 63 | 0 | PASS | Cân bằng hoàn hảo |
| `8-6-sales-and-customer-service.html` | 42 | 42 | 0 | PASS | Cân bằng hoàn hảo |
| `8-case-questions.html` | 12 | 12 | 0 | PASS | Cân bằng hoàn hảo |
| `8-discussion-questions.html` | 11 | 11 | 0 | PASS | Cân bằng hoàn hảo |
| `8-introduction.html` | 12 | 12 | 0 | PASS | Cân bằng hoàn hảo |
| `8-key-terms.html` | 1 | 1 | 0 | PASS | Cân bằng hoàn hảo |
| `8-review-questions.html` | 17 | 17 | 0 | PASS | Cân bằng hoàn hảo |
| `8-suggested-resources.html` | 24 | 24 | 0 | PASS | Cân bằng hoàn hảo |
| `8-summary.html` | 13 | 13 | 0 | PASS | Cân bằng hoàn hảo |

## Per-file Counts — Static Build

| File | .eng Count | .vn Count | Delta | Status | Notes |
|---|---:|---:|---:|---|---|
| `8-1-entrepreneurial-marketing-and-the-marketing-mix.html` | 182 | 124 | 58 | NEEDS REVIEW | Cấu trúc giống hệt tệp nguồn dịch thuật |
| `8-2-market-research-market-opportunity-recognition-and-target-market.html` | 147 | 147 | 0 | PASS | Cân bằng hoàn hảo |
| `8-3-marketing-techniques-and-tools-for-entrepreneurs.html` | 79 | 79 | 0 | PASS | Cân bằng hoàn hảo |
| `8-4-entrepreneurial-branding.html` | 76 | 76 | 0 | PASS | Cân bằng hoàn hảo |
| `8-5-marketing-strategy-and-the-marketing-plan.html` | 63 | 63 | 0 | PASS | Cân bằng hoàn hảo |
| `8-6-sales-and-customer-service.html` | 42 | 42 | 0 | PASS | Cân bằng hoàn hảo |
| `8-case-questions.html` | 12 | 12 | 0 | PASS | Cân bằng hoàn hảo |
| `8-discussion-questions.html` | 11 | 11 | 0 | PASS | Cân bằng hoàn hảo |
| `8-introduction.html` | 12 | 12 | 0 | PASS | Cân bằng hoàn hảo |
| `8-key-terms.html` | 1 | 1 | 0 | PASS | Cân bằng hoàn hảo |
| `8-review-questions.html` | 17 | 17 | 0 | PASS | Cân bằng hoàn hảo |
| `8-suggested-resources.html` | 24 | 24 | 0 | PASS | Cân bằng hoàn hảo |
| `8-summary.html` | 13 | 13 | 0 | PASS | Cân bằng hoàn hảo |

## Findings
- Toàn bộ 58 phần tử bị lệch đều nằm trong tệp `8-1-entrepreneurial-marketing-and-the-marketing-mix.html`.
- Phân tích sâu hơn cho thấy cả 58 phần tử này đều là thẻ danh sách `<li>` nằm bên trong các danh sách `<ul>` của các cột bảng (bảng so sánh các công cụ xúc tiến hỗn hợp - Promotion Mix Table).
- Các cột bảng này được thiết kế theo cặp cột song ngữ: cột chứa tiếng Anh có class `eng hidden` và cột chứa tiếng Việt có class `vn visible`. Do đó, bản thân thẻ cha `<td>` đã quyết định việc ẩn/hiển thị cho toàn bộ nội dung bên trong.

## Suspected Root Causes
- **Lý do kỹ thuật (Redundant Classes):** Trong quá trình tiền xử lý, các thẻ `<li>` bên trong `<td class="eng hidden">` đã được gán nhãn class `eng hidden` một cách dư thừa (58 thẻ `<li>`), trong khi các thẻ `<li>` tương ứng ở cột tiếng Việt `<td class="vn visible">` được để nguyên dạng thẻ thường `<li>` không có class.
- Điều này tạo ra sự lệch pha về mặt số lượng thống kê phần tử có class (`.eng` = 182, `.vn` = 124), mặc dù về mặt hiển thị giao diện người dùng (Rendering) trên trình đọc sách vẫn hoàn toàn chính xác và an toàn (do trình duyệt ẩn/hiện ở cấp độ cột `<td>`).
- Mẫu danh sách trong bảng ở các chương khác (Ví dụ: Chương 1, Chương 3) cũng có cấu trúc tương tự (không gán class cho thẻ `<li>` nằm trong `<td>`), cho thấy việc không gán class cho thẻ `<li>` trong cột `<td>` tiếng Việt ở Chương 8 mới là chuẩn chung của dự án.

## Fixes Applied
```text
No automatic fixes applied.
```
*Lý do không sửa đổi:* Cấu trúc hiển thị HTML hiện tại hoàn toàn đúng đắn trên trình đọc sách, việc can thiệp chỉnh sửa hàng loạt các class của `<li>` trong bảng không mang lại lợi ích hiển thị thực tế và có thể gây rủi ro phá vỡ cấu trúc CSS hiện tại. Thay vào đó, chúng tôi ghi nhận vấn đề này để báo cáo kiểm duyệt.

## Remaining Risks
- Không có rủi ro về mặt hiển thị cho người đọc.
- Rủi ro duy nhất là làm sai lệch số liệu của các công cụ kiểm tra tự động dựa trên số lượng class `.eng` và `.vn`.

## Human Review Needed

| File | Reason | Suggested Action |
| ---- | ------ | ---------------- |
| `8-1-entrepreneurial-marketing-and-the-marketing-mix.html` | Lệch 58 class `.eng` do thẻ `<li>` trong cột bảng `<td>` tiếng Anh có class nhưng tiếng Việt thì không. | Xác nhận đồng ý giữ nguyên cấu trúc tệp để tránh rủi ro phá vỡ định dạng hiển thị, chấp nhận delta = 58 như một ghi chú ngoại lệ (Traceability Note). |

## Final Status
`NEEDS REVIEW`
