#!/usr/bin/env python3
"""Convert prediction/review txt files to JSON for the football-site."""
import os, re, json
from datetime import datetime
from collections import defaultdict

REPORTS_DIR = os.path.expanduser("~/football_reports")
OUTPUT_FILE = os.path.expanduser("~/football-site/data/data.json")

def parse_date_from_filename(filename):
    """Extract date from filenames like predictions_2026-06-13_saturday_v3.25.txt"""
    m = re.search(r'(\d{4}-\d{2}-\d{2})', filename)
    return m.group(1) if m else None

def parse_day_from_filename(filename):
    """Extract day name from filename"""
    m = re.search(r'(\d{4}-\d{2}-\d{2})_(\w+)_', filename)
    return m.group(2) if m else None

def is_prediction(filename):
    return filename.startswith('predictions_')

def is_review(filename):
    return filename.startswith('review_')

def is_c_version(filename):
    """C版 = conservative, NOT having -deconservative in name"""
    return '-deconservative' not in filename

def is_d_version(filename):
    """D版 = deconservative"""
    return '-deconservative' in filename

def parse_matches_from_text(text):
    """Extract match info from prediction/review text."""
    matches = []
    # Pattern for match headers: "周五003 联赛 主队 vs 客队" or similar
    # Also: "------------------------------\n周六201 芬超 主队 vs 客队"
    
    # Find all match blocks
    lines = text.split('\n')
    
    # Look for match header patterns
    header_patterns = [
        r'周[一二三四五六日]\s*\d{3}\s+\S+\s+(.+?)\s+[vV][sS]\s+(.+?)(?:\s+\d|$)',
        r'【(\d{3})】\s*(.+?)\s+[vV][sS]\s+(.+)',
    ]
    
    current_match = None
    for i, line in enumerate(lines):
        # Check if this line starts a new match
        is_new = False
        for pat in header_patterns:
            m = re.search(pat, line)
            if m:
                if current_match:
                    current_match['content'] = '\n'.join(current_match['lines'])
                    matches.append(current_match)
                
                groups = m.groups()
                if len(groups) == 2:
                    home, away = groups
                else:
                    _, home, away = groups
                
                current_match = {
                    'home': home.strip(),
                    'away': away.strip(),
                    'header': line.strip(),
                    'lines': [line],
                    'content': ''
                }
                is_new = True
                break
        
        if not is_new and current_match:
            current_match['lines'].append(line)
    
    if current_match:
        current_match['content'] = '\n'.join(current_match['lines'])
        matches.append(current_match)
    
    return matches

def extract_info_from_match(text):
    """Extract key info: direction, score, result from a match block."""
    info = {}
    
    # Direction
    for pat in [r'【稳健方向】\s*(.+)', r'稳健方向[：:]\s*(.+)', r'方向[：:]\s*(.+)']:
        m = re.search(pat, text)
        if m:
            info['direction'] = m.group(1).strip()
            break
    
    # Score prediction
    for pat in [r'【比分】\s*(.+)', r'比分[：:倾]*\s*(.+?)\s+\d+[-:]\d+', r'比分倾向[：:]\s*(.+)']:
        m = re.search(pat, text)
        if m:
            info['score_prediction'] = m.group(1).strip()
            break
    
    # Actual score (for reviews)
    m = re.search(r'实际赛果[：:]*\s*(.+)', text)
    if m:
        info['actual_score'] = m.group(1).strip()
    
    # Result judgment (for reviews)
    m = re.search(r'研判结果[：:]\s*(.+)', text)
    if m:
        info['judgment'] = m.group(1).strip()
    
    # Mistake type
    m = re.search(r'失误类型[：:]\s*(.+)', text)
    if m:
        info['mistake_type'] = m.group(1).strip()
    
    # Odds
    odds_pat = r'【赔率】\s*(.+?)(?:\n|$)'
    m = re.search(odds_pat, text)
    if m:
        info['odds'] = m.group(1).strip()
    
    # Cold probability
    m = re.search(r'【冷门】\s*(.+?)(?:【|$|\n)', text)
    if m:
        info['cold_prob'] = m.group(1).strip()
    
    # League
    m = re.search(r'[周一二三四五六日]\d{3}\s+(\S+)', text)
    if m:
        info['league'] = m.group(1)
    
    return info

def main():
    files = sorted(os.listdir(REPORTS_DIR))
    
    # Group by date
    dates = defaultdict(lambda: {'predictions': {'C': None, 'D': None}, 'reviews': {'C': None, 'D': None}})
    
    for f in files:
        date = parse_date_from_filename(f)
        if not date:
            continue
        
        filepath = os.path.join(REPORTS_DIR, f)
        try:
            with open(filepath, 'r', encoding='utf-8') as fh:
                text = fh.read()
        except:
            continue
        
        day = parse_day_from_filename(f)
        
        if is_prediction(f):
            version = 'C' if is_c_version(f) else 'D'
            matches = parse_matches_from_text(text)
            enriched = [{'header': m['header'], 'home': m['home'], 'away': m['away'], **extract_info_from_match(m['content']), 'full_text': m['content']} for m in matches]
            
            dates[date]['predictions'][version] = {
                'filename': f,
                'day': day,
                'raw_text': text[:5000],  # Truncated for size
                'matches': enriched,
                'match_count': len(matches)
            }
            dates[date]['day'] = day or dates[date].get('day', '')
        
        elif is_review(f):
            version = 'C' if is_c_version(f) else 'D'
            dates[date]['reviews'][version] = {
                'filename': f,
                'raw_text': text[:8000],
                'full_text': text
            }
    
    # Sort by date (newest first)
    sorted_dates = sorted(dates.items(), key=lambda x: x[0], reverse=True)
    
    output = []
    for date, entry in sorted_dates:
        output.append({
            'date': date,
            'day': entry.get('day', ''),
            'predictions': entry['predictions'],
            'reviews': entry['reviews']
        })
    
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)
    
    print(f"Generated {OUTPUT_FILE} with {len(output)} dates")
    for d in output:
        pc = d['predictions'].get('C')
        pd = d['predictions'].get('D')
        rc = d['reviews'].get('C')
        rd = d['reviews'].get('D')
        print(f"  {d['date']} | pred C:{'✓' if pc else '✗'} D:{'✓' if pd else '✗'} | rev C:{'✓' if rc else '✗'} D:{'✓' if rd else '✗'}")

if __name__ == '__main__':
    main()
