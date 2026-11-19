#!/usr/bin/env python3
"""Scan HTML file for emoji characters (U+1F000+) that will render as boxes in snap chromium.

Usage: python3 scripts/scan-emoji.py <html_file>

Returns exit code 0 if no emoji found, 1 if emoji found.
"""
import sys
import re

def is_problematic_emoji(cp):
    """Detect supplementary-plane emoji (U+1F000+) and common BMP emoji symbols (✅ ⚠ ✨ ⚡ ⭐ ⏰ ❤ 等)."""
    if cp > 0xFFFF:
        return True
    return (
        0x2600 <= cp <= 0x27BF  # Misc Symbols + Dingbats (⚠ ⚡ ✅ ✨ ❤ ...)
        or 0x23E9 <= cp <= 0x23FA  # Media / clock symbols (⏰ ⏩ ...)
        or cp in (0x2B50, 0x2B55)  # ⭐ ⭕
    )


def scan_emoji(html_path):
    with open(html_path, 'r', encoding='utf-8') as f:
        html = f.read()
    
    # Remove style/script/comment blocks
    body = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL | re.IGNORECASE)
    body = re.sub(r'<script[^>]*>.*?</script>', '', body, flags=re.DOTALL | re.IGNORECASE)
    body = re.sub(r'<!--.*?-->', '', body, flags=re.DOTALL)
    
    # Find all emoji (supplementary planes + common BMP emoji)
    emoji_found = []
    for i, ch in enumerate(body):
        cp = ord(ch)
        if is_problematic_emoji(cp):
            # Get context
            start = max(0, i - 20)
            end = min(len(body), i + 20)
            context = body[start:end].replace('\n', ' ')
            emoji_found.append({
                'char': ch,
                'codepoint': f'U+{cp:04X}',
                'context': context
            })
    
    # Deduplicate by character
    unique = {}
    for e in emoji_found:
        key = e['codepoint']
        if key not in unique:
            unique[key] = e
    
    if not unique:
        print(f"✅ No emoji found in {html_path}")
        return 0
    
    print(f"⚠️  Found {len(unique)} unique emoji in {html_path}:")
    for e in unique.values():
        print(f"  {e['char']} ({e['codepoint']}) context: ...{e['context']}...")
    
    return 1

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 scan-emoji.py <html_file>")
        sys.exit(2)
    sys.exit(scan_emoji(sys.argv[1]))
