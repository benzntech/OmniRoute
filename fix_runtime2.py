with open('/Users/developer/.hermes/plugins/runtime_patcher.py', 'r') as f:
    text = f.read()

# Only patch the one in _register_module_aliases
search_str = """
                if spec and spec.loader:
                    mod = importlib.util.module_from_spec(spec)
                    sys.modules[alias_name] = mod
                    sys.modules[mod_name] = mod
                    spec.loader.exec_module(mod)
            except Exception as exc:
"""
replace_str = """
                if spec and spec.loader:
                    mod = importlib.util.module_from_spec(spec)
                    sys.modules[alias_name] = mod
                    sys.modules[mod_name] = mod
                    try:
                        spec.loader.exec_module(mod)
                    except Exception as e:
                        sys.modules.pop(alias_name, None)
                        sys.modules.pop(mod_name, None)
                        raise e
            except Exception as exc:
"""

text = text.replace(search_str, replace_str)
with open('/Users/developer/.hermes/plugins/runtime_patcher.py', 'w') as f:
    f.write(text)
