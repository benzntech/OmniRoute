import re
with open('/Users/developer/.hermes/plugins/runtime_patcher.py', 'r') as f:
    text = f.read()

# Replace the broken except blocks
text = text.replace('                                sys.modules.pop(alias_name, None)\n                sys.modules.pop(mod_name, None)\n', '')

with open('/Users/developer/.hermes/plugins/runtime_patcher.py', 'w') as f:
    f.write(text)
