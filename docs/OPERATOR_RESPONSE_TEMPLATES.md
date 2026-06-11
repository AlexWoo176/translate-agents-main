# Operator Response Templates

Tập hợp các mẫu phản hồi chuẩn cho Antigravity khi xử lý yêu cầu của người dùng.

---

## Template 1: Khi hiểu yêu cầu

```
Tôi hiểu bạn muốn: [mô tả ngắn intent]

📋 Phân tích:
- Phạm vi: [new book / chapter X / full book / book-level]
- Mức rủi ro: [Level 0 / 1 / 2 / 3 / 4]
- Provider: [mock / manual / antigravity-selected-model / external-ai]
- Thông tin còn thiếu: [liệt kê nếu có, hoặc "Không có"]

📝 Bước an toàn tôi đề xuất:
1. [Bước 1]
2. [Bước 2]
...

Tôi sẽ bắt đầu bằng cách kiểm tra trạng thái sách trước.
```

---

## Template 2: Khi thiếu thông tin

```
Tôi có thể hỗ trợ, nhưng cần thêm một vài thông tin tối thiểu:

1. [Thông tin cần thiết 1] — ví dụ: [ví dụ cụ thể]
2. [Thông tin cần thiết 2] — ví dụ: [ví dụ cụ thể]

Tôi đề xuất mặc định:
- [Tham số 1]: [giá trị mặc định]
- [Tham số 2]: [giá trị mặc định]

Bạn có đồng ý dùng các giá trị mặc định này không?
(Nếu có, tôi sẽ tiến hành. Nếu muốn thay đổi, hãy cho tôi biết.)
```

---

## Template 3: Khi người dùng muốn full book

```
Tôi hiểu bạn muốn dịch toàn bộ sách.

Đây là thao tác lớn, nên tôi khuyến nghị dịch thử 1 chương trước để kiểm tra
cấu trúc, thuật ngữ và chất lượng bản dịch.

Bạn có 2 lựa chọn:

A. ✅ An toàn nhất (khuyến nghị):
   Dịch thử 1 chương draft → review kết quả → quyết định tiếp theo.

B. ⚡ Nhanh hơn:
   Chạy dry-run toàn bộ workflow trước (chưa dịch thật, chưa ghi final)
   → xem kế hoạch → dịch full book dạng draft sau khi xác nhận.

Bạn muốn chọn A hay B?
```

---

## Template 4: Khi cần xác nhận ghi đè

```
🔐 Tôi sắp thực hiện thao tác có thể ghi đè dữ liệu.

Phạm vi ảnh hưởng:
- [Liệt kê file / folder / data sẽ bị thay đổi]

Backup sẽ được tạo tự động tại:
- [Đường dẫn backup]

Dữ liệu KHÔNG bị ảnh hưởng:
- [Liệt kê file / folder an toàn]

Để tiếp tục, vui lòng trả lời rõ bằng câu:
"Tôi xác nhận tiếp tục và cho phép ghi đè sau khi backup."

(Nếu không muốn tiếp tục, chỉ cần nói "Dừng lại" hoặc "Không".)
```

---

## Template 5: Khi glossary chưa approved

```
⚠️ Glossary hiện chưa được duyệt đầy đủ.

Trạng thái hiện tại:
- Tổng số thuật ngữ: [N]
- Đã approved: [N]
- Cần review: [N]
- Candidate chưa xử lý: [N]

Điều này có thể làm bản dịch toàn sách thiếu nhất quán thuật ngữ.

Tôi khuyến nghị:
1. Xuất glossary review sheet → gửi cho chuyên gia.
2. Chuyên gia review và trả về file kết quả.
3. Import kết quả và approve glossary.
4. Sau đó mới dịch full book.

✅ Bạn vẫn có thể dịch thử một chương ở dạng draft ngay bây giờ để kiểm tra quy trình.

Bạn muốn:
A. Xuất glossary sheet để review trước.
B. Dịch thử một chương bây giờ (với cảnh báo về glossary).
C. Cả hai: xuất glossary + dịch thử song song.
```

---

## Template 6: Khi thao tác thành công

```
✅ Thành công!

Đã thực hiện: [mô tả ngắn]

Files được tạo/cập nhật:
- [file 1]
- [file 2]

Kết quả quality gate:
- [gate 1]: [status]
- [gate 2]: [status]

⚠️ Cảnh báo (nếu có):
- [cảnh báo 1]

📌 Bước tiếp theo được đề xuất:
[Mô tả bước tiếp theo rõ ràng]

Bạn muốn tiếp tục không?
```

---

## Template 7: Khi thao tác thất bại

```
❌ Thao tác gặp lỗi.

Lỗi phát sinh: [mô tả ngắn gọn lỗi]

Nguyên nhân có thể:
- [nguyên nhân 1]
- [nguyên nhân 2]

Dữ liệu không bị mất:
- [Backup tại / hoặc "Không có gì bị ghi đè"]

Đề xuất khôi phục:
1. [Bước khôi phục 1]
2. [Bước khôi phục 2]

Tôi có thể chạy thử khôi phục ở chế độ dry-run trước.
Bạn có muốn tôi thử không?
```

---

## Template 8: Khi có failed gate

```
🚦 Quality gate thất bại: [tên gate]

Gate này kiểm tra: [mô tả đơn giản gate kiểm tra gì]

Lỗi cụ thể:
- [lỗi 1]
- [lỗi 2]

Các phase tiếp theo bị ảnh hưởng:
- [phase A] yêu cầu gate này pass
- [phase B] yêu cầu gate này pass

Tôi sẽ KHÔNG tự tiếp tục mà không có sự xác nhận của bạn.

Đề xuất cách xử lý:
1. [Cách xử lý cụ thể]

Bạn muốn tôi hỗ trợ fix lỗi này không?
```

---

## Template 9: Khi resume workflow

```
🔄 Tôi phát hiện có checkpoint cho sách [bookSlug].

Thông tin checkpoint:
- Phase bị dừng: [phase]
- Thời điểm: [timestamp]
- Chapter: [chapterId]

Tôi đề xuất resume từ checkpoint này.

Kế hoạch resume:
[Dry-run plan]

Đây là thao tác [Level X]. [Giải thích rủi ro nếu có]

Bạn muốn tôi chạy dry-run resume trước để xem kế hoạch không?
```

---

## Template 10: Khi cần xác nhận final translation

```
🔐 Bạn đang yêu cầu ghi bản dịch CHÍNH THỨC (final).

Đây là thao tác Level 4 — không thể tự động đảo ngược.

Trước khi thực hiện, tôi đã kiểm tra:
✅ Review reports: [status]
✅ Glossary approval: [status]  
✅ Quality gates: [pass/fail count]
✅ Backup: Sẽ được tạo tại [path]

⚠️ Những gì sẽ bị ghi đè: [list chapters/files]
✅ Những gì KHÔNG bị ảnh hưởng: [list]

Để tiếp tục, vui lòng gõ chính xác câu sau:
"Tôi xác nhận tiếp tục và cho phép ghi bản dịch chính thức sau khi backup."

Bất kỳ câu trả lời nào khác sẽ được coi là KHÔNG xác nhận.
```
