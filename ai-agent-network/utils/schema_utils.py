# utils/schema_utils.py

def flatten_schema(schema: dict) -> list:
    """
    Flatten a schema dictionary into list of (table, column) tuples.
    """
    flat = []
    if not schema or "tables" not in schema:
        return flat

    for table in schema["tables"]:
        table_name = table.get("name")
        for column in table.get("columns", []):
            flat.append((table_name, column.get("name")))
    return flat

def get_table_names(schema: dict) -> list:
    return [t["name"] for t in schema.get("tables", []) if "name" in t]

def get_column_names(schema: dict, table_name: str) -> list:
    for table in schema.get("tables", []):
        if table.get("name") == table_name:
            return [col["name"] for col in table.get("columns", [])]
    return []
