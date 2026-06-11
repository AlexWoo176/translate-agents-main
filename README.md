# Dự Án Bột

## 1. Giới thiệu

Đây là một dự án phi lợi nhuận mang tên **Bột**. Mục đích của dự án là dịch các tài liệu, sách giáo khoa từ OpenStax (nguồn tài nguyên học liệu mở, miễn phí và hợp pháp) sang tiếng Việt nhằm đảm bảo công bằng và mở rộng cơ hội giáo dục cho mọi người.

Cuốn sách khởi điểm của dự án: **[Entrepreneurship](https://openstax.org/books/entrepreneurship/pages/1-2-entrepreneurial-vision-and-goals)**

## 2. Nguyên tắc cốt lõi

- **Bảo toàn dữ liệu (Data Versioning)**: Mỗi một bước trong pipeline đều phải lưu lại kết quả ở một thư mục riêng biệt. Tuyệt đối không ghi đè dữ liệu của bước trước đó để có thể dễ dàng debug và tái sử dụng.

## 3. Kiến trúc Pipeline

```text
[ Scrape ] ---> [ Cleanup ] ---> [ Analysis ] ---> [ Translate ] ---> [ Review ] ---> [ Archive ]
```

Các giai đoạn chi tiết:

### Bước 1: Scrape (`skill-scrape`)

- **Nhiệm vụ**: Thu thập toàn bộ file HTML gốc (bao gồm mọi thẻ rác, JS, CSS) từ trang OpenStax.
- **Dữ liệu đầu ra**: Lưu tại `../{book}/chapter-{N}/01-raw/`

### Bước 2: Cleanup (`skill-cleanup`)

- **Nhiệm vụ**: Làm sạch file HTML khổng lồ, loại bỏ head, menu, footer, JS, CSS. Chỉ giữ lại phần lõi nội dung (văn bản sách, hình ảnh).
- **Dữ liệu đầu ra**: Lưu tại `../{book}/chapter-{N}/02-clean/`

### Bước 3: Analysis

- **Nhiệm vụ**: Phân tích HTML đã làm sạch, đánh giá rủi ro văn hóa, thuật ngữ, cấu trúc câu cho từng chương.
- **Dữ liệu đầu ra**: Lưu tại `../{book}/chapter-{N}/03-analyzed/` (Markdown báo cáo).

### Bước 4: Translate

- **Nhiệm vụ**: LLM dịch HTML song ngữ dựa trên `glossary.csv` và báo cáo Analysis.
- **Dữ liệu trung gian**: `../{book}/chapter-{N}/04-prep/` (HTML sau khi nhân đôi cấu trúc song ngữ, chờ dịch)
- **Dữ liệu đầu ra**: Lưu tại `../{book}/chapter-{N}/05-translated/`

### Bước 5: Review

- **Nhiệm vụ**: Hiệu đính, so sánh chéo bản dịch với bản gốc, đảm bảo thuật ngữ đồng nhất.
- **Dữ liệu đầu ra**: Lưu tại `../{book}/chapter-{N}/06-reviews/`

### Bước 6: Archive

- **Nhiệm vụ**: Ghép các chunk lại thành file hoàn chỉnh (HTML/PDF/EPUB) và lưu trữ xuất bản.
- **Dữ liệu đầu ra**: Lưu tại `../{book}/chapter-{N}/07-archive/`

## 4. Cấu trúc thư mục

Thư mục sách nằm song song với thư mục `translate-agent` (ví dụ: `../entrepreneurship` hoặc `../book-statistics`):

```text
../{book}/                         # vd: entrepreneurship
├── glossary.csv                   # 📌 Bảng thuật ngữ — single source of truth (toàn sách)
├── tasks.md                       # Quản lý tiến độ toàn sách
├── css/                           # 🎨 CSS dùng chung cho mọi chapter (single file)
│   └── style.css
├── _book-level/                   # Preface, Index, Appendix (không thuộc chapter nào)
│
└── chapter-{N}/                   # vd: chapter-1 ... chapter-13
    ├── 01-raw/                    # HTML gốc từ OpenStax
    ├── 02-clean/                  # HTML đã làm sạch (loại thẻ rác)
    ├── 03-analyzed/               # Báo cáo phân tích rủi ro dịch thuật
    ├── 04-prep/                   # HTML đã nhân đôi cấu trúc song ngữ (chờ dịch)
    ├── 05-translated/             # HTML song ngữ đã dịch (eng hidden / vn visible)
    ├── 06-reviews/                # Báo cáo QA / review
    ├── 07-archive/                # Sản phẩm cuối cùng
    │   ├── bilingual/             # Bản song ngữ
    │   └── vn-only/               # Bản tiếng Việt thuần
    └── assets/                    # Hình ảnh của chapter (webp)
```

## 5. Workflow Core & Test Suite

Hệ thống cung cấp một CLI trung tâm hỗ trợ chạy orchestrator, QA gates, và kiểm tra chất lượng bản dịch:

```bash
# Xem trạng thái dự án
node cli/index.js status entrepreneurship

# Khởi chạy End-to-End Workflow Orchestrator
node cli/index.js workflow-run entrepreneurship [options]

# Kiểm tra chất lượng Production Readiness
node cli/index.js validate-production entrepreneurship
```

### Chạy Test Suite tự động

Hệ thống sử dụng Node.js built-in test runner:

```bash
# Chạy toàn bộ test
node --test tests/unit/*.test.js tests/integration/*.test.js tests/smoke/*.test.js

# Chạy unit test
node --test tests/unit/*.test.js

# Chạy integration test
node --test tests/integration/*.test.js

# Chạy smoke test
node --test tests/smoke/*.test.js
```

## 6. Non-Technical Operation via Antigravity

You can operate the framework without memorizing CLI commands by using the Operator Prompt Playbook.

Simply describe what you want to do in natural language, and Antigravity will:
- Understand your intent.
- Check project status first.
- Run a dry-run before any real action.
- Ask for confirmation before any risky operation.
- Report results in plain language.

See:

- [Operator Prompt Playbook](file:///f:/LIBERO/translate-agents-main/docs/OPERATOR_PROMPT_PLAYBOOK.md) — Safety rules and operator flow
- [Non-Technical User Guide](file:///f:/LIBERO/translate-agents-main/docs/NON_TECHNICAL_USER_GUIDE.md) — Guide for non-technical users
- [Antigravity Operation Guide](file:///f:/LIBERO/translate-agents-main/docs/ANTIGRAVITY_OPERATION_GUIDE.md) — SOP for Antigravity
- [User Intent Handling Rules](file:///f:/LIBERO/translate-agents-main/docs/USER_INTENT_HANDLING_RULES.md) — How free-form requests are processed
- [User Intent to CLI Mapping](file:///f:/LIBERO/translate-agents-main/docs/USER_INTENT_TO_CLI_MAPPING.md) — Intent → CLI command table
- [examples/prompts/](file:///f:/LIBERO/translate-agents-main/examples/prompts/) — Ready-to-use prompt templates

## 7. Tài liệu Kỹ thuật

Chi tiết về cấu trúc và hướng dẫn sử dụng hệ thống lõi:
- [CLI Reference](file:///f:/LIBERO/translate-agents-main/docs/CLI_REFERENCE.md)
- [Book Project Structure](file:///f:/LIBERO/translate-agents-main/docs/BOOK_PROJECT_STRUCTURE.md)
- [Quality Gates Reference](file:///f:/LIBERO/translate-agents-main/docs/QUALITY_GATES_REFERENCE.md)
- [Translation Provider Reference](file:///f:/LIBERO/translate-agents-main/docs/TRANSLATION_PROVIDER_REFERENCE.md)
- [Production Readiness](file:///f:/LIBERO/translate-agents-main/docs/WORKFLOW_CORE_PRODUCTION_READINESS.md)
- [Release Checklist](file:///f:/LIBERO/translate-agents-main/docs/RELEASE_CHECKLIST.md)
- [Glossary Governance Guide](file:///f:/LIBERO/translate-agents-main/docs/GLOSSARY_GOVERNANCE_GUIDE.md)

---
*Dự án Bột - Vì một nền giáo dục mở và công bằng.*
