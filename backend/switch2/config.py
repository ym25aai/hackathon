from pathlib import Path
from cryptography.fernet import Fernet
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "SWITCH 2.0"
    database_path: Path = Path(__file__).resolve().parents[2] / "data" / "switch2.sqlite3"
    model_config = SettingsConfigDict(env_prefix="SWITCH2_", env_file=".env", extra="ignore")

    @property
    def token_key(self) -> bytes:
        key_path = Path(__file__).resolve().parents[1] / ".switch2-token-key"
        if key_path.exists():
            return key_path.read_bytes().strip()
        key = Fernet.generate_key()
        key_path.write_bytes(key)
        try:
            key_path.chmod(0o600)
        except OSError:
            pass
        return key


settings = Settings()
