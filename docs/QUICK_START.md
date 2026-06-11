# Quick Start Guide

## Quick Start for Non-Technical Users

Không cần biết CLI. Chỉ cần chọn prompt phù hợp và gửi cho Antigravity:

| Nhu cầu | Prompt sẵn có |
|---|---|
| Bắt đầu dịch sách mới | [start-new-book.md](file:///f:/LIBERO/translate-agents-main/examples/prompts/start-new-book.md) |
| Kiểm tra và duyệt glossary | [review-glossary.md](file:///f:/LIBERO/translate-agents-main/examples/prompts/review-glossary.md) |
| Dịch thử một chương | [translate-one-chapter-draft.md](file:///f:/LIBERO/translate-agents-main/examples/prompts/translate-one-chapter-draft.md) |
| Dịch nháp toàn bộ sách | [translate-full-book-safe.md](file:///f:/LIBERO/translate-agents-main/examples/prompts/translate-full-book-safe.md) |
| Kiểm tra trạng thái | [check-project-status.md](file:///f:/LIBERO/translate-agents-main/examples/prompts/check-project-status.md) |
| Tạo preview/EPUB | [create-preview-and-epub.md](file:///f:/LIBERO/translate-agents-main/examples/prompts/create-preview-and-epub.md) |
| Chuyển sang bản chính thức | [approve-final-translation.md](file:///f:/LIBERO/translate-agents-main/examples/prompts/approve-final-translation.md) |

Xem đầy đủ: [examples/prompts/](file:///f:/LIBERO/translate-agents-main/examples/prompts/) | [Non-Technical User Guide](file:///f:/LIBERO/translate-agents-main/docs/NON_TECHNICAL_USER_GUIDE.md)

---

## Bắt đầu trong 5 phút (CLI)

### Bước 1: Mô tả nhu cầu của bạn

Nếu bạn không chuyên về kỹ thuật, chỉ cần dùng prompt template:

1. Mở [examples/prompts/start-new-book.md](file:///f:/LIBERO/translate-agents-main/examples/prompts/start-new-book.md).
2. Copy nội dung prompt.
3. Điền thông tin sách của bạn.
4. Gửi cho Antigravity.
5. Antigravity sẽ làm phần còn lại.

Xem thêm: [Non-Technical User Guide](file:///f:/LIBERO/translate-agents-main/docs/NON_TECHNICAL_USER_GUIDE.md)

---

### Bước 2: Nếu bạn muốn dùng CLI trực tiếp

Cài đặt dependencies:

```bash
bun install
```

Kiểm tra framework:

```bash
node cli/index.js validate-production entrepreneurship
```

Kiểm tra trạng thái sách mẫu (entrepreneurship):

```bash
node cli/index.js status entrepreneurship
```

Chạy dry-run toàn bộ workflow:

```bash
node cli/index.js workflow-run entrepreneurship --dry-run
```

---

## Hai cách vận hành

| Cách | Khi nào dùng | Tài liệu |
|---|---|---|
| **Prompt / Antigravity** | Người không chuyên kỹ thuật, operation hàng ngày | [NON_TECHNICAL_USER_GUIDE.md](file:///f:/LIBERO/translate-agents-main/docs/NON_TECHNICAL_USER_GUIDE.md) |
| **CLI trực tiếp** | Developer, debug, scripting, CI/CD | [CLI_REFERENCE.md](file:///f:/LIBERO/translate-agents-main/docs/CLI_REFERENCE.md) |

---

## Quy trình từ A đến Z (tóm tắt)

```
1. init-book          ← Khởi tạo project
        ↓
2. scrape             ← Tải HTML từ OpenStax
        ↓
3. clean              ← Làm sạch HTML
        ↓
4. analyze            ← Phân tích nội dung
        ↓
5. glossary           ← Tạo & duyệt thuật ngữ
        ↓
6. prep               ← Chuẩn bị song ngữ
        ↓
7. translate (draft)  ← Dịch nháp (pilot trước)
        ↓
8. review             ← Kiểm tra chất lượng
        ↓
9. archive            ← Lưu trữ kết quả
        ↓
10. build_preview     ← Tạo preview HTML
        ↓
11. export_epub       ← Xuất EPUB
        ↓
12. translate (final) ← Chuyển sang bản chính thức
```

Không cần chạy từng bước thủ công — dùng `workflow-run` hoặc nhờ Antigravity.

---

## Lệnh CLI quan trọng nhất

| Lệnh | Tác dụng |
|---|---|
| `node cli/index.js status <slug>` | Kiểm tra trạng thái sách |
| `node cli/index.js workflow-run <slug> --dry-run` | Xem kế hoạch workflow không ghi file |
| `node cli/index.js qa <slug> --all` | Chạy tất cả quality gates |
| `node cli/index.js glossary <slug> --status` | Kiểm tra trạng thái glossary |
| `node cli/index.js validate-production <slug>` | Kiểm tra production readiness |

---

## Tài liệu đầy đủ

| Tài liệu | Mô tả |
|---|---|
| [CLI_REFERENCE.md](file:///f:/LIBERO/translate-agents-main/docs/CLI_REFERENCE.md) | Tất cả CLI commands |
| [NON_TECHNICAL_USER_GUIDE.md](file:///f:/LIBERO/translate-agents-main/docs/NON_TECHNICAL_USER_GUIDE.md) | Hướng dẫn người dùng không chuyên |
| [OPERATOR_PROMPT_PLAYBOOK.md](file:///f:/LIBERO/translate-agents-main/docs/OPERATOR_PROMPT_PLAYBOOK.md) | Quy tắc vận hành cho Antigravity |
| [OPERATOR_RISK_LEVEL_MATRIX.md](file:///f:/LIBERO/translate-agents-main/docs/OPERATOR_RISK_LEVEL_MATRIX.md) | Phân loại rủi ro Level 0-4 |
| [GLOSSARY_GOVERNANCE_GUIDE.md](file:///f:/LIBERO/translate-agents-main/docs/GLOSSARY_GOVERNANCE_GUIDE.md) | Quản trị bảng thuật ngữ |
| [QUALITY_GATES_REFERENCE.md](file:///f:/LIBERO/translate-agents-main/docs/QUALITY_GATES_REFERENCE.md) | Tất cả quality gates |
| [WORKFLOW_CORE_CHANGELOG.md](file:///f:/LIBERO/translate-agents-main/docs/WORKFLOW_CORE_CHANGELOG.md) | Lịch sử phát triển |
| [examples/prompts/](file:///f:/LIBERO/translate-agents-main/examples/prompts/) | Prompt templates sẵn có |
