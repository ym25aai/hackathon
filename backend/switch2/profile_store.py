import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any

from .config import settings


def profile_database_path(profile_id: int) -> Path:
    return settings.database_path.parent / "profiles" / f"profile_{profile_id}.sqlite3"


def initialize_profile_database(profile_id: int) -> None:
    path = profile_database_path(profile_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(path) as database:
        database.execute("PRAGMA foreign_keys = ON")
        database.execute("CREATE TABLE IF NOT EXISTS ai_config (id INTEGER PRIMARY KEY CHECK (id = 1), provider TEXT NOT NULL, model TEXT NOT NULL, token_ciphertext TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)")
        database.execute("CREATE TABLE IF NOT EXISTS preferences (key TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)")
        database.execute("CREATE TABLE IF NOT EXISTS ai_reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, question TEXT NOT NULL, answer TEXT NOT NULL DEFAULT '', model TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)")


@contextmanager
def profile_connection(profile_id: int):
    initialize_profile_database(profile_id)
    database = sqlite3.connect(profile_database_path(profile_id))
    database.row_factory = sqlite3.Row
    try:
        yield database
        database.commit()
    finally:
        database.close()


def read_preference(profile_id: int, key: str, default: Any = None) -> Any:
    with profile_connection(profile_id) as database:
        row = database.execute("SELECT value_json FROM preferences WHERE key = ?", (key,)).fetchone()
    return json.loads(row["value_json"]) if row else default


def write_preference(profile_id: int, key: str, value: Any) -> None:
    with profile_connection(profile_id) as database:
        database.execute("INSERT INTO preferences (key, value_json, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json, updated_at = CURRENT_TIMESTAMP", (key, json.dumps(value, ensure_ascii=False)))
