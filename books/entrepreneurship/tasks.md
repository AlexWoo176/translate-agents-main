# Quan ly Tac vu: Entrepreneurship

Quy trinh xu ly bat buoc cho moi chuong:
`Plan -> Scrape -> Cleanup -> Analysis -> Translate -> Review -> Archive`

Nguyen tac van hanh tu `master-workflow.md`:
- Moi chuong tu Chapter 4 tro di phai di du tat ca phase, khong duoc bo phase nao.
- `agent-review` la QA gate bat buoc sau moi phase quan trong.
- Neu da ton tai file `translated/` duoc dung tam theo cach reconstruct tu web, van phai backfill lai cac phase truoc neu phase do chua duoc ghi nhan/chua dat.

## Tong quan trang thai

> Note: Historical task list may be stale. See `Final Release P0 QA Status` for reconciled status.

- [x] **chapter-1**: Da hoan thanh den het phase archive, da co ban song ngu va ban tieng Viet thuan trong `archive/`.
- [x] **chapter-2**: Da hoan thanh den het phase archive, da co ban song ngu va ban tieng Viet thuan trong `archive/`.
- [x] **chapter-3**: Da hoan thanh (Rework ok 2026-05-31). Chi tiết xem tại [chapter-3/tasks.md](chapters/chapter-3/tasks.md)
- [ ] **chapter-4**: ⚠️ INTEGRITY REWORK — 1 file fail (4-3). Chi tiết xem tại [chapter-4/tasks.md](chapters/chapter-4/tasks.md)
- [x] **chapter-5**: Da hoan thanh den het phase archive, da co ban song ngu va ban tieng Viet thuan trong `archive/`.
- [x] **chapter-6**: Da hoan thanh den het phase archive, da co ban song ngu va ban tieng Viet thuan trong `archive/`.
- [x] **chapter-7**: Da hoan thanh den het phase archive, da co ban song ngu va ban tieng Viet thuan trong `archive/`.
- [x] **chapter-8**: Da hoan thanh den het phase archive, da co ban song ngu va ban tieng Viet thuan trong `archive/`.
- [x] **chapter-9**: Da hoan thanh den het phase archive, da co ban song ngu va ban tieng Viet thuan trong `archive/`.
- [x] **chapter-10**: Da hoan thanh den het phase archive, da co ban song ngu va ban tieng Viet thuan trong `archive/`.
- [x] **chapter-11**: Da hoan thanh den het phase archive, da co ban song ngu va ban tieng Viet thuan trong `archive/`.
- [x] **chapter-12**: Da hoan thanh den het phase archive, da co ban song ngu va ban tieng Viet thuan trong `archive/`.
- [x] **chapter-13**: Da hoan thanh den het phase archive, da co ban song ngu va ban tieng Viet thuan trong `archive/`.
- [x] **chapter-14**: Da hoan thanh den het phase archive, da co ban song ngu va ban tieng Viet thuan trong `archive/`.
- [x] **chapter-15**: Da hoan thanh den het phase archive, da co ban song ngu va ban tieng Viet thuan trong `archive/`.

## Phase 0: Lien chuong / Dieu phoi
- [x] **agent-plan**: Xac nhan Chapter 1-3 da di dung workflow va chot lai cac bao cao review hien co.
- [x] **agent-plan**: Lap ke hoach full-book cho Chapter 4-14, bao dam moi chuong co du `scrape -> cleanup -> analysis -> translate -> review -> archive`.
- [x] **agent-review**: Duyet lai `tasks.md` sau moi lan cap nhat de dam bao khong chuong nao bi bo phase.

## Final Release P0 QA Status

| Chapter | Raw | Clean | Analyzed | Prep | Translated | Reviews | Archive | Status | Notes |
|---|---|---|---|---|---|---|---|---|---|
| `chapter-1` | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Completed | Cấu trúc thư mục đầy đủ |
| `chapter-2` | Yes | Yes | Yes | No | Yes | Yes | Yes | Completed - Needs Traceability Note | Completed with traceability note: 04-prep folder not present |
| `chapter-3` | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Completed | Cấu trúc thư mục đầy đủ |
| `chapter-4` | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Needs Review | Prep chỉ có 1/10 tệp (cần kiểm tra tệp 4-3) |
| `chapter-5` | Yes | Yes | Yes | No | Yes | Yes | Yes | Needs Review | Số lượng tệp Clean (10) vs Translated (11) lệch nhau (trùng lặp tệp 5-1); Không có thư mục 04-prep |
| `chapter-6` | Yes | Yes | Yes | No | Yes | Yes | Yes | Completed - Needs Traceability Note | Completed with traceability note: 04-prep folder not present |
| `chapter-7` | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Completed - Pending Final QA | Đã đối chiếu các tài liệu thực tế và cập nhật tasks |
| `chapter-8` | Yes | Yes | Yes | No | Yes | Yes | Yes | Completed - Needs Traceability Note | Completed with traceability note: 04-prep folder not present |
| `chapter-9` | Yes | Yes | Yes | No | Yes | Yes | Yes | Completed - Needs Traceability Note | Completed with traceability note: 04-prep folder not present |
| `chapter-10` | Yes | Yes | Yes | No | Yes | Yes | Yes | Completed - Needs Traceability Note | Completed with traceability note: 04-prep folder not present |
| `chapter-11` | Yes | Yes | Yes | No | Yes | Yes | Yes | Completed - Needs Traceability Note | Completed with traceability note: 04-prep folder not present |
| `chapter-12` | Yes | Yes | Yes | No | Yes | Yes | Yes | Completed - Needs Traceability Note | Completed with traceability note: 04-prep folder not present |
| `chapter-13` | Yes | Yes | Yes | No | Yes | Yes | Yes | Completed - Needs Traceability Note | Completed with traceability note: 04-prep folder not present |
| `chapter-14` | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Completed | Cấu trúc thư mục đầy đủ |
| `chapter-15` | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Completed | Cấu trúc thư mục đầy đủ (đã được ghi nhận vào tổng quan) |

### P0 Checks

- Root structure check: Completed — see P0-STRUCTURE-SCAN.md
- Chapter structure check: Completed — see P0-STRUCTURE-SCAN.md
- Chapter 8 `.eng/.vn` parity: Completed — NEEDS REVIEW (see [chapter-8/06-reviews/p0-eng-vn-parity-check.md](chapters/chapter-8/06-reviews/p0-eng-vn-parity-check.md))
- Integrity check: Completed — see [P0-INTEGRITY-CHECK-REPORT.md]([LOCAL_PATH_REMOVED_STEP_7])
- Glossary check: Completed — see [P0-GLOSSARY-CHECK-REPORT.md]([LOCAL_PATH_REMOVED_STEP_7])
- Book reader path check: Completed — see [P0-BOOK-READER-PATH-CHECK.md]([LOCAL_PATH_REMOVED_STEP_7])
- Release readiness report: Completed — see [RELEASE-READINESS.md]([LOCAL_PATH_REMOVED_STEP_7])
