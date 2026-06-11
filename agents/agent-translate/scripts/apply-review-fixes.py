import os
import sys
import re

def parse_markdown_table(file_path):
    # Trả về danh sách các hàng trong bảng
    rows = []
    with open(file_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        
    in_table = False
    for i, line in enumerate(lines):
        if line.strip().startswith('| ID |') or line.strip().startswith('|---|'):
            in_table = True
            continue
        if in_table and line.strip().startswith('|'):
            # Parse row
            cols = [col.strip() for col in line.split('|')][1:-1] # Bỏ cột rỗng đầu cuối
            if len(cols) >= 9:
                suggestion_raw = cols[6]
                if '`' in suggestion_raw:
                    suggestion = suggestion_raw.split('`')[1]
                else:
                    suggestion = suggestion_raw.replace('Sửa thành:', '').strip()
                
                rows.append({
                    'line_num': i,
                    'id': cols[0],
                    'original': cols[1].strip('`'),
                    'current': cols[3].strip('`'),
                    'position': cols[4].strip('`'),
                    'suggestion': suggestion,
                    'status': cols[8].strip()
                })
        elif in_table and not line.strip():
            in_table = False
            
    return rows, lines

def apply_fixes(review_path, html_path):
    if not os.path.exists(review_path):
        print(f"❌ Không tìm thấy file review: {review_path}")
        return
    if not os.path.exists(html_path):
        print(f"❌ Không tìm thấy file HTML: {html_path}")
        return

    # 1. Parse review file
    rows, md_lines = parse_markdown_table(review_path)
    
    # 2. Read HTML
    with open(html_path, 'r', encoding='utf-8') as f:
        html_content = f.read()

    changes_made = 0
    # 3. Apply fixes
    for row in rows:
        if row['status'].lower() in ['mới', 'yêu cầu sửa lại']:
            current_text = row['current']
            suggestion_text = row['suggestion']
            term_id = row.get('position', '')
            
            replaced = False
            if term_id and current_text and suggestion_text:
                pattern = re.compile(rf'(<span[^>]*id="{term_id}"[^>]*>)\s*{re.escape(current_text)}\s*(</span>)')
                matches = list(pattern.finditer(html_content))
                if len(matches) == 2:
                    m = matches[1]
                    html_content = html_content[:m.start()] + m.group(1) + suggestion_text + m.group(2) + html_content[m.end():]
                    replaced = True
                elif len(matches) == 1:
                    m = matches[0]
                    html_content = html_content[:m.start()] + m.group(1) + suggestion_text + m.group(2) + html_content[m.end():]
                    replaced = True
            elif current_text in html_content and suggestion_text:
                html_content = html_content.replace(current_text, suggestion_text)
                replaced = True
                
            if replaced:
                
                # Cập nhật markdown line
                line_idx = row['line_num']
                old_line = md_lines[line_idx]
                
                # Cập nhật cột response và status
                parts = old_line.split('|')
                if len(parts) >= 10:
                    parts[-3] = ' Đồng ý, đã sửa theo đề xuất. ' # Response
                    parts[-2] = ' Đã sửa ' # Status
                    md_lines[line_idx] = '|'.join(parts)
                    changes_made += 1
            else:
                print(f"⚠️ Cảnh báo: Không tìm thấy hoặc không thể sửa lỗi {row['id']} trong HTML.")

    if changes_made > 0:
        # Save HTML
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
        
        # Save MD
        with open(review_path, 'w', encoding='utf-8') as f:
            f.writelines(md_lines)
            
        print(f"✅ Đã áp dụng {changes_made} bản vá vào {os.path.basename(html_path)}")
        print(f"✅ Đã cập nhật trạng thái trong {os.path.basename(review_path)}")
    else:
        print("ℹ️ Không có lỗi mới nào cần sửa hoặc không thể khớp text.")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Sử dụng: python3 apply-review-fixes.py <đường-dẫn-file-review.md> <đường-dẫn-file-html>")
    else:
        apply_fixes(sys.argv[1], sys.argv[2])
