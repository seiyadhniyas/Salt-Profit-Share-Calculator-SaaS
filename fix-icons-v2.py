#!/usr/bin/env python3
import re

filePath = 'src/App.jsx'

with open(filePath, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# Count the revenue/inventory matches to see what we have
print(f"Looking for patterns...")

# Find and replace in the modules array - be more flexible with whitespace
# Revenue icon should be 💵
content = re.sub(
    r"(\{[^}]*?id:\s*'revenue'[^}]*?icon:\s*')[^']*(')",
    r"\1💵\2",
    content,
    flags=re.DOTALL
)

# Inventory icon should be 📦  
content = re.sub(
    r"(\{[^}]*?id:\s*'inventory'[^}]*?icon:\s*')[^']*(')",
    r"\1📦\2",
    content,
    flags=re.DOTALL
)

# Fix overlay revenue icon
content = re.sub(
    r"(activeModule === 'revenue'\s*\?\s*')[^']*(')",
    r"\1💵\2",
    content
)

# Fix overlay inventory icon
content = re.sub(
    r"(activeModule === 'inventory'\s*\?\s*')[^']*(')",
    r"\1📦\2",
    content
)

with open(filePath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Icons fixed successfully!')
