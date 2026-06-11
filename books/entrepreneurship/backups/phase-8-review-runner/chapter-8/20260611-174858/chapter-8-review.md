# Báo cáo Nghiệm thu: Chapter 8 — Entrepreneurial Marketing and Sales

**Trạng thái Toàn cục:** Đang mở (Round 1 hoàn tất, cần verify)

## Tổng kết Round 1 (2026-05-09)

### Glossary Check
- **Trước sửa:** 29/59 đúng = 49%
- **Sau sửa:** 48/59 đúng = 81%
- **11 lỗi còn lại:** Tất cả là false positives từ script detection (term span context, không phải lỗi dịch thực sự)

### Thuật ngữ đã sửa (19 issues)
- `marketing` → `tiếp thị` (hệ thống, ~100 vị trí)
- 7 compound terms: guerrilla/relationship/expeditionary/real-time/viral/digital/WOM marketing
- Pricing terms: Customer-led, skimming, bundling, odd numbers strategy
- Place → Phân phối, Physical environment → Môi trường vật lý
- focus group → nhóm thảo luận, conjoint analysis → phân tích kết hợp
- validation → xác thực, close → chốt bán hàng
- `marketing strategy`/`marketing plan`: reverted — glossary giữ "marketing" cho 2 thuật ngữ này

### Semantic Check
- Cấu trúc: 13/13 files balanced (eng=vn tag-level) ✅
- CDN references: 0 ✅
- Img src: tất cả local assets ✅
- Văn phong: nhất quán xưng hô Bạn/Chúng ta ✅

### False Positives Accepted
- `brand`/`jingle` trong term span (body text dịch đúng)
- `target market`/`profit margin`/`penetration pricing` (body text đúng, script context lỗi)
- `People` = "Con người" (glossary quá strict với suffix)
- `sample`/`market analysis`/`Segmenting` (minor context issues)

## Ghi chú
- Glossary có conflict: `marketing` → `tiếp thị` nhưng `marketing strategy` → `chiến lược marketing`. Cần chuẩn hóa glossary cho nhất quán.
