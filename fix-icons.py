#!/usr/bin/env python3
import os

filePath = 'src/App.jsx'

with open(filePath, 'rb') as f:
    content = f.read()

# UTF-8 bytes for emojis
box_emoji = '📦'.encode('utf-8')  # b'\xf0\x9f\x93\xa6'
cash_emoji = '💵'.encode('utf-8')  # b'\xf0\x9f\x92\xb5'
disk_emoji = '💾'.encode('utf-8')  # b'\xf0\x9f\x92\xbe'

# Replace revenue icon (box -> cash)
content = content.replace(box_emoji + b",\n                  color: 'bg-[#ffe4c4]'", 
                         cash_emoji + b",\n                  color: 'bg-[#ffe4c4]'")

# Replace inventory icon (disk -> box)
content = content.replace(disk_emoji + b",\n                  color: 'bg-[#ecffb1]'", 
                         box_emoji + b",\n                  color: 'bg-[#ecffb1]'")

# Fix overlay icons
content = content.replace(b"activeModule === 'revenue' ? '" + box_emoji + b"'", 
                         b"activeModule === 'revenue' ? '" + cash_emoji + b"'")

content = content.replace(b"activeModule === 'inventory' ? '" + disk_emoji + b"'", 
                         b"activeModule === 'inventory' ? '" + box_emoji + b"'")

with open(filePath, 'wb') as f:
    f.write(content)

print('Icons fixed successfully!')
