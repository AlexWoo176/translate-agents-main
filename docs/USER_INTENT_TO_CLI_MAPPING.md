# User Intent to CLI Mapping

Bảng mapping giúp Antigravity chuyển đổi intent tự nhiên của người dùng thành CLI command an toàn.

## Mapping Table

| User Intent | Required Info | Safe First Command | Follow-up Command |
|---|---|---|---|
| Bắt đầu dịch sách mới | title, slug, sourceUrl | `node cli/index.js init-book --slug <slug> --title "<title>" --source-url "<url>" --dry-run` | `node cli/index.js init-book --slug <slug> --title "<title>" --source-url "<url>"` |
| Kiểm tra trạng thái sách | bookSlug | `node cli/index.js status <bookSlug>` | — |
| Kiểm tra framework sẵn sàng chưa | bookSlug | `node cli/index.js validate-production <bookSlug>` | — |
| Tạo glossary candidates | bookSlug | `node cli/index.js glossary <bookSlug> --generate-candidates --dry-run` | `node cli/index.js glossary <bookSlug> --generate-candidates` |
| Xem trạng thái glossary | bookSlug | `node cli/index.js glossary <bookSlug> --status` | — |
| Xuất sheet để duyệt glossary | bookSlug | `node cli/index.js glossary <bookSlug> --review-export` | Gửi sheet cho chuyên gia |
| Approve glossary sau expert review | bookSlug | `node cli/index.js glossary <bookSlug> --approve --dry-run` | `node cli/index.js glossary <bookSlug> --approve` |
| Cập nhật glossary từ file thay đổi | bookSlug, changesFile | `node cli/index.js glossary <bookSlug> --change-request <changesFile> --dry-run` | `node cli/index.js glossary <bookSlug> --change-request <changesFile>` (after confirmation) |
| Xem glossary impact | bookSlug | `node cli/index.js glossary <bookSlug> --impact` | — |
| Áp dụng glossary vào draft | bookSlug | `node cli/index.js glossary <bookSlug> --apply-to-draft --chapters affected --dry-run` | `node cli/index.js glossary <bookSlug> --apply-to-draft --chapters affected` (after confirmation) |
| Validate glossary structure | bookSlug | `node cli/index.js qa <bookSlug> --gate glossaryApproval` | — |
| Dịch thử một chương (dry-run) | bookSlug, chapterId | `node cli/index.js workflow-run <bookSlug> --from analyze --to review --chapter <chapterId> --provider mock --dry-run` | — |
| Dịch thử một chương (thật) | bookSlug, chapterId | *Anti chạy bằng model đang chọn trong Antigravity (ghi vào draft)* | Chỉ dùng `--provider external-ai` (nếu đã cấu hình) hoặc `--provider manual` |
| Dịch nháp toàn bộ sách (dry-run) | bookSlug | `node cli/index.js workflow-run <bookSlug> --from analyze --to review --all --provider mock --dry-run` | — |
| Dịch nháp toàn bộ sách (thật) | bookSlug | *Anti chạy bằng model đang chọn trong Antigravity (ghi vào draft)* | Chỉ dùng `--provider external-ai` (nếu đã cấu hình) hoặc `--provider manual` |
| Chạy workflow từ đầu đến EPUB | bookSlug | `node cli/index.js workflow-run <bookSlug> --from plan --to export_epub --dry-run` | Chạy từng segment sau xác nhận |
| Chạy một phase cụ thể | bookSlug, phase | `node cli/index.js run <bookSlug> --phase <phase> --dry-run` | `node cli/index.js run <bookSlug> --phase <phase>` |
| Tạo preview HTML | bookSlug | `node cli/index.js run <bookSlug> --phase build_preview --dry-run` | `node cli/index.js run <bookSlug> --phase build_preview` (sau xác nhận nếu overwrite) |
| Tạo EPUB | bookSlug | `node cli/index.js run <bookSlug> --phase export_epub --dry-run` | `node cli/index.js run <bookSlug> --phase export_epub` (sau xác nhận nếu overwrite) |
| Kiểm tra tất cả quality gates | bookSlug | `node cli/index.js qa <bookSlug> --all` | — |
| Kiểm tra một gate cụ thể | bookSlug, gateId | `node cli/index.js qa <bookSlug> --gate <gateId>` | — |
| Khôi phục workflow bị dừng | bookSlug | `node cli/index.js status <bookSlug>` → `node cli/index.js workflow-run <bookSlug> --resume --dry-run` | Resume sau xác nhận |
| Chuyển draft sang final (một chương) | bookSlug, chapterId | Dry-run + review check | `node cli/index.js run <bookSlug> --phase translate --chapter <chapterId> --write-final` (Level 4, sau xác nhận rõ) |
| Chuyển draft sang final (toàn bộ) | bookSlug | Dry-run + review check + glossary check + gate check | Level 4 — chỉ sau xác nhận bằng văn bản rõ ràng |
| Xem kế hoạch workflow | bookSlug | `node cli/index.js workflow-run <bookSlug> --dry-run` | — |
| Kiểm tra checkpoint | bookSlug | `node cli/index.js status <bookSlug>` | — |
| Regenerate workflow state | bookSlug | `node cli/index.js generate-state <bookSlug>` | — |

## Phase-to-Flag Mapping

| Phase | Command | Safe Flag | Risky Flag |
|---|---|---|---|
| plan | `run <bookSlug> --phase plan` | `--dry-run` | — |
| scrape | `run <bookSlug> --phase scrape` | `--dry-run` | `--force` |
| clean | `run <bookSlug> --phase clean` | `--dry-run` | `--force` |
| analyze | `run <bookSlug> --phase analyze` | `--dry-run` | `--force` |
| glossary | `run <bookSlug> --phase glossary` | `--dry-run` | — |
| prep | `run <bookSlug> --phase prep` | `--dry-run` | `--force` |
| translate | `run <bookSlug> --phase translate` | `--dry-run`, `--provider mock` (cho test workflow) | `--write-final`, `--force`, `--provider external-ai` (khi đã cấu hình) |
| review | `run <bookSlug> --phase review` | `--dry-run` | — |
| archive | `run <bookSlug> --phase archive` | `--dry-run` | `--force` |
| build_preview | `run <bookSlug> --phase build_preview` | `--dry-run` | `--force` |
| export_epub | `run <bookSlug> --phase export_epub` | `--dry-run` | `--force` |

## Chapter Scope Flags

| Scope | Flag |
|---|---|
| Một chương | `--chapter chapter-1` |
| Toàn bộ sách | `--all` |
| Từ chapter X đến Y | `--from-chapter chapter-2 --to-chapter chapter-5` |

## Workflow-run vs Run Command

| Situation | Command to Use |
|---|---|
| Chạy nhiều phase liên tiếp | `workflow-run` |
| Chạy đúng một phase | `run` |
| Resume từ checkpoint | `workflow-run --resume` |
| Chạy từ phase X đến phase Y | `workflow-run --from <phase> --to <phase>` |

## Safety Aliases (Common Natural Language → Intent)

| Người dùng nói | Intent | Risk |
|---|---|---|
| "dịch thử" / "pilot" / "thử" | translate_pilot | Level 2 |
| "dịch full" / "dịch hết" / "cả sách" | translate_full_draft | Level 3 |
| "bản chính thức" / "final" / "publish" | translate_final | Level 4 |
| "kiểm tra" / "xem" / "status" | check_status | Level 0 |
| "tạo preview" / "xem trước" | create_preview | Level 2-3 |
| "xuất EPUB" / "export" | create_epub | Level 2-3 |
| "sửa thuật ngữ" / "cập nhật glossary" | update_glossary | Level 3 |
| "duyệt glossary" / "review glossary" | review_glossary | Level 1 |
| "khôi phục" / "resume" / "bị lỗi" | recover_workflow | Level 2-3 |
| "từ đầu" / "toàn bộ quy trình" | run_full_workflow | Level 3-4 |
