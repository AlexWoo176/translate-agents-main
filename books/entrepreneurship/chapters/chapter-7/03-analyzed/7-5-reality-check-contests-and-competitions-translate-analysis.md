# Phân tích Rủi ro Dịch thuật: 7.5 Reality Check: Contests and Competitions

## 1. Phân tích nội dung và bối cảnh
*   **Chủ đề**: Thực tế của việc tham gia các cuộc thi và chương trình tranh tài khởi nghiệp (Contests and Competitions). Hướng dẫn sinh viên tìm kiếm nguồn tài trợ, cơ hội kết nối (networking) và xây dựng nhóm thông qua các cuộc thi.
*   **Đối tượng độc giả**: Sinh viên khởi nghiệp, những người đang tìm kiếm nguồn tài trợ ban đầu và cơ hội cọ xát thực tế.
*   **Văn phong**: Khuyến khích, thực tế, định hướng hành động (Bạn / Chúng ta).

## 2. Cấu trúc HTML & Các thẻ đặc biệt
*   `class="learning-objectives"`: Mục tiêu học tập.
*   `<div data-type="note" class="are-you-ready">`: Mục chuyên đề (Feature Box). Cần dịch tiêu đề thành "Mục chuyên đề: Bạn Đã Sẵn Sàng Chưa?".
*   `class="os-figure"` và `figcaption`: Cần giữ nguyên định dạng của hình ảnh và phần ghi chú hình ảnh.
*   Bảng (`<table class="top-titled">`): Cần cẩn thận khi dịch các hàng và cột mà không làm vỡ cấu trúc HTML.

## 3. Rủi ro dịch thuật (Glossary)
Dựa theo `glossary.csv`, các thuật ngữ sau phải được tuân thủ nghiêm ngặt:
1.  **entrepreneurial contest**: `cuộc thi khởi nghiệp` (Đã được chuẩn hóa trong glossary.csv).
2.  **iceberg principle**: `nguyên tắc tảng băng trôi` (Nguyên tắc viết chuẩn bị tài liệu dự thi).
3.  **pitch competitions**: `các cuộc thi pitch` (Cuộc thi thuyết trình gọi vốn).
4.  **seed funding**: `tài trợ hạt giống` hoặc `vốn hạt giống` (Mặc dù có thể không nằm trong danh sách lỗi hiện tại nhưng cần chú ý).
5.  **business model**: `mô hình kinh doanh`.
6.  **value proposition**: `tuyên bố giá trị`.
7.  **startup**: `công ty khởi nghiệp` hoặc giữ nguyên `startup` tùy ngữ cảnh, nhưng ưu tiên `công ty khởi nghiệp`.
8.  Các từ khóa khác liên quan đến UI/UX hoặc thuật ngữ riêng (ví dụ: HQ Raleigh, WeWork, Spark, TechStars, Y Combinator, SCORE, SBA) cần được giữ nguyên và đánh dấu `data-type="term"`.

## 4. Các điểm cần lưu ý
*   **Cấu trúc câu phức tạp**: Có nhiều câu ghép dài liên quan đến yêu cầu của các cuộc thi, cần ngắt ý hoặc sử dụng dấu phẩy hợp lý trong tiếng Việt để dễ đọc.
*   **Danh sách giải thưởng**: Có một danh sách dài các cuộc thi và số tiền giải thưởng (ví dụ: Harvard Business School New Venture Plan Competition – $300,000). Phần này chỉ cần dịch các từ như "Competition", "Challenge", "Prize" nếu thấy phù hợp, hoặc giữ nguyên tên tiếng Anh của giải thưởng vì chúng là tên riêng. Tốt nhất là giữ nguyên tên tiếng Anh của các cuộc thi.
*   **Mục Feature Box (Are You Ready?)**: Phần này chứa bảng Tầm nhìn và Sứ mệnh của CEO (Collegiate Entrepreneurs’ Organization). Cần dịch rõ ràng "Vision Statement" (Tuyên bố Tầm nhìn) và "Mission Statement" (Tuyên bố Sứ mệnh).

## 5. Kế hoạch hành động
1.  Thực hiện tạo cấu trúc file song ngữ bằng script `prep_html`.
2.  Dịch trực tiếp trên các khối `class="vn visible"` trong file ở thư mục `04-prep`.
3.  Sử dụng chuẩn `glossary.csv` để đảm bảo độ chính xác của các thẻ `data-type="term"`.
4.  Kiểm tra (Review) để đảm bảo không bị sót thẻ inline tag hoặc class CSS.
