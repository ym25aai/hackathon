import sqlite3
from contextlib import contextmanager
from .config import settings


def initialize_database() -> None:
    settings.database_path.parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(settings.database_path) as connection:
        connection.execute("""
            CREATE TABLE IF NOT EXISTS profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nickname TEXT NOT NULL,
                timezone TEXT NOT NULL DEFAULT 'UTC',
                budget_cents INTEGER,
                currency TEXT NOT NULL DEFAULT 'USD',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        """)
        connection.execute("""
            CREATE TABLE IF NOT EXISTS interaction_invites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                sender_profile_id INTEGER NOT NULL,
                recipient_profile_id INTEGER NOT NULL,
                category TEXT NOT NULL,
                message TEXT NOT NULL DEFAULT '',
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                responded_at TEXT,
                FOREIGN KEY(sender_profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
                FOREIGN KEY(recipient_profile_id) REFERENCES profiles(id) ON DELETE CASCADE
            )
        """)
        connection.execute("""
            CREATE TABLE IF NOT EXISTS interaction_sessions (
                id TEXT PRIMARY KEY,
                sender_profile_id INTEGER NOT NULL,
                category TEXT NOT NULL,
                scenario_title TEXT NOT NULL,
                context TEXT NOT NULL DEFAULT '',
                participant_profile_ids TEXT NOT NULL DEFAULT '[]',
                status TEXT NOT NULL DEFAULT 'active',
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(sender_profile_id) REFERENCES profiles(id) ON DELETE CASCADE
            )
        """)
        connection.execute("""
            CREATE TABLE IF NOT EXISTS interaction_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                speaker_profile_id INTEGER,
                speaker_name TEXT NOT NULL,
                speaker_type TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(session_id) REFERENCES interaction_sessions(id) ON DELETE CASCADE
            )
        """)
        columns = {row[1] for row in connection.execute("PRAGMA table_info(profiles)").fetchall()}
        if "pin_salt" not in columns:
            connection.execute("ALTER TABLE profiles ADD COLUMN pin_salt TEXT")
        if "pin_hash" not in columns:
            connection.execute("ALTER TABLE profiles ADD COLUMN pin_hash TEXT")
        if "ai_provider" not in columns:
            connection.execute("ALTER TABLE profiles ADD COLUMN ai_provider TEXT")
        if "ai_model" not in columns:
            connection.execute("ALTER TABLE profiles ADD COLUMN ai_model TEXT")
        if "ai_token_ciphertext" not in columns:
            connection.execute("ALTER TABLE profiles ADD COLUMN ai_token_ciphertext TEXT")


@contextmanager
def connection():
    initialize_database()
    database = sqlite3.connect(settings.database_path)
    database.row_factory = sqlite3.Row
    try:
        yield database
        database.commit()
    finally:
        database.close()
