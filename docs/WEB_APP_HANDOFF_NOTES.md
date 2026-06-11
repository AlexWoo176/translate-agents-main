# Web App Handoff Notes

## Why This Exists

Operator Prompt Layer là bản thiết kế hành vi cho Web App tương lai.

Web App không nên expose raw CLI đầu tiên. Người dùng nên thấy các action dễ hiểu, được hướng dẫn rõ ràng, và luôn được bảo vệ khỏi các thao tác có rủi ro.

Tài liệu này ghi lại ý định thiết kế UX cho bất kỳ team phát triển web nào muốn build dashboard cho framework này.

---

## Suggested Web App Actions

Thay vì hiển thị CLI commands, Web App nên có các nút hành động:

- 📚 **Tạo sách mới** — Khởi tạo dự án dịch thuật mới
- 📊 **Kiểm tra trạng thái** — Xem tiến độ và trạng thái các phase
- 📖 **Tạo và duyệt glossary** — Quản lý bảng thuật ngữ
- 🔬 **Dịch thử một chương** — Pilot chapter translation
- 📝 **Dịch nháp toàn bộ sách** — Full book draft translation
- ✅ **Review bản dịch** — Xem và xác nhận kết quả
- 🌐 **Tạo preview HTML** — Xem trước trên trình duyệt
- 📕 **Tạo EPUB** — Xuất file sách điện tử
- 🔄 **Resume workflow** — Tiếp tục sau khi bị gián đoạn
- 🏁 **Approve bản dịch chính thức** — Chuyển từ draft sang final

---

## Suggested Screens

### 1. Dashboard

**Mục đích**: Màn hình chính hiển thị tổng quan tất cả sách và trạng thái.

**Hiển thị**:
- Danh sách các sách đang active
- Overall status cho mỗi sách (progress %)
- Quality gate summary (pass/warn/fail)
- Next recommended action
- Recent activity log

**Không hiển thị**: Raw CLI commands, JSON data, file paths kỹ thuật

---

### 2. Book Setup

**Mục đích**: Khởi tạo dự án dịch thuật mới.

**Fields**:
- Book Title
- OpenStax URL (paste link)
- Book Slug (auto-suggested từ title)
- Target Language (mặc định Vietnamese)
- Source Language (mặc định English)

**Actions**:
- [Preview] → dry-run init-book
- [Create Project] → thực sự init (sau xác nhận)

**Safety UX**:
- Hiển thị dry-run preview trước
- Cảnh báo nếu slug đã tồn tại

---

### 3. Glossary Review

**Mục đích**: Quản lý và duyệt bảng thuật ngữ.

**Sub-sections**:
- Status overview: tổng số terms, % approved, % pending
- Candidate list với filter (status, chapter, confidence)
- Export to CSV button
- Import reviewed CSV button
- Approval action per term hoặc batch approve
- Diff view khi import changes
- Impact analysis panel (chapters affected)

**Safety UX**:
- Không cho approve nếu translation trống
- Hiển thị impact report trước khi confirm change
- Backup status visible trước khi apply

---

### 4. Workflow Runner

**Mục đích**: Chạy các phase dịch thuật.

**Controls**:
- Phase selector (từ... đến...)
- Chapter selector (one chapter / all)
- Translation mode (draft / final)
- Provider selector (mock / manual / AI)
- Dry-run toggle (bật mặc định)

**Flow**:
1. Configure → [Preview Plan]
2. Review plan → [Confirm & Run]
3. Progress tracking → Real-time updates
4. Result report

**Safety UX**:
- Dry-run toggle bật mặc định
- Final mode cần explicit confirmation dialog
- AI provider cần configuration warning
- Full book cần pilot chapter recommendation modal

---

### 5. Chapter Progress

**Mục đích**: Xem tiến độ dịch từng chương.

**Hiển thị per chapter**:
- Phase completion (01-raw → 07-archive)
- Translation status (draft / final / missing)
- Review status (reviewed / pending / needs_update)
- Glossary impact (stale / ok)
- Link to preview

---

### 6. Quality Gates

**Mục đích**: Xem kết quả quality checks.

**Hiển thị**:
- Gate list với status icons (✅ ⚠️ ❌ 👤)
- Error details (expandable)
- Fix suggestions
- Re-run gate button
- Report download

---

### 7. Review Queue

**Mục đích**: Human review workflow cho bản dịch.

**Features**:
- List files needing review
- Side-by-side English/Vietnamese view
- Comment & annotation
- Approve / Request revision
- Review history

---

### 8. Export Center

**Mục đích**: Tạo và quản lý preview và EPUB.

**Actions**:
- Build Preview → dry-run first → confirm → build
- Build EPUB → dry-run first → confirm → build
- Download links cho output
- Rebuild với overwrite confirmation

---

### 9. Logs & Reports

**Mục đích**: Xem lịch sử chạy và báo cáo chi tiết.

**Features**:
- Phase run history
- Quality gate reports (markdown viewer)
- Error logs
- Glossary change log
- Workflow state viewer (simplified)

---

### 10. Provider Settings

**Mục đích**: Cấu hình translation provider.

**Fields**:
- Provider type (mock / manual / OpenAI / Gemini / custom)
- API key (masked)
- Model selection
- Cost estimate per 1000 tokens

**Safety UX**:
- Warning khi switch từ mock sang real AI
- Cost estimate hiển thị trước khi run full book với AI
- Provider test button (runs translate on 1 block)

---

## Safety UX Principles

### 1. Dry-run Preview
Mọi thao tác write đều phải có "Preview Plan" step trước khi thực hiện thật.

### 2. Confirm Destructive Action
Dialog xác nhận phải:
- Mô tả chính xác điều gì sẽ bị thay đổi.
- Liệt kê những gì KHÔNG bị ảnh hưởng.
- Yêu cầu click "I understand, proceed" (không chỉ OK).
- Với Level 4 actions: require typing a specific phrase.

### 3. Glossary Gate Before Full Book
Khi người dùng chọn "full book translation":
- Tự động check glossary status.
- Hiển thị modal cảnh báo nếu glossary chưa 100% approved.
- Offer: "Review Glossary First" hoặc "Proceed with Warning".

### 4. Show Warnings Before Continuing
Sau mỗi phase:
- Nếu có warnings: hiển thị với giải thích plain language.
- Offer "View Details" và "Continue Anyway" (nếu không phải blocking).
- Nếu là blocking: chỉ hiển thị "Fix Issue First".

### 5. Require Explicit Final Approval
- Final translation button disabled cho đến khi review reports đã được xem.
- Checkbox: "I have reviewed the draft translation".
- Checkbox: "I confirm glossary is approved".
- Then: confirm dialog với phrase typing.

### 6. Do Not Allow Final Publish If Failed Gate Exists
- Publish/Final buttons disabled nếu có failed gate.
- Show list of failed gates and fix suggestions.

---

## API Design Notes (For Backend Team)

Khi build API wrapper cho CLI:

```
GET  /api/books/:slug/status            → node cli/index.js status <slug>
GET  /api/books/:slug/glossary/status   → node cli/index.js glossary <slug> --status
POST /api/books/:slug/glossary/generate → node cli/index.js glossary <slug> --generate-candidates
POST /api/books/:slug/glossary/export   → node cli/index.js glossary <slug> --review-export
POST /api/books/:slug/glossary/approve  → node cli/index.js glossary <slug> --approve
POST /api/books/:slug/glossary/impact   → node cli/index.js glossary <slug> --impact
POST /api/books/init                    → node cli/index.js init-book ...
POST /api/books/:slug/run               → node cli/index.js run <slug> --phase <phase>
POST /api/books/:slug/workflow-run      → node cli/index.js workflow-run <slug> ...
GET  /api/books/:slug/gates             → node cli/index.js qa <slug> --all
GET  /api/books/:slug/gates/:gateId     → node cli/index.js qa <slug> --gate <gateId>
```

Always add `--dry-run` to POST endpoints by default. Require explicit `dryRun: false` to run real actions.

---

## Phase 17 → Web App Handoff Checklist

- [ ] Operator Prompt Playbook reviewed by web team.
- [ ] Non-Technical User Guide reviewed for UX copy.
- [ ] Risk Matrix implemented in UI as action permission levels.
- [ ] All Level 3-4 actions have confirm dialogs.
- [ ] Glossary gate enforced before full book translation.
- [ ] Dry-run preview implemented for all write actions.
- [ ] Translation provider selector with cost warning.
- [ ] Report viewer (markdown) integrated.
