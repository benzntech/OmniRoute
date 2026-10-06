with open('/Users/developer/.hermes/plugins/runtime_patcher.py', 'r') as f:
    text = f.read()

search_str = """
    # 1. Ensure plugin directories are on sys.path
    for p in (ag_dir, cg_dir, plugins_dir):
"""
replace_str = """
    # 1. Ensure plugin directories and hermes-agent are on sys.path
    agent_dir = hermes_home / "hermes-agent"
    for p in (ag_dir, cg_dir, plugins_dir, agent_dir):
"""

text = text.replace(search_str, replace_str)
with open('/Users/developer/.hermes/plugins/runtime_patcher.py', 'w') as f:
    f.write(text)
