from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """
    Application settings.
    Reads settings from environment variables.
    """
    SECRET_KEY: str = "a_very_secret_key_that_should_be_in_an_env_file"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    DATABASE_URL: str = "postgresql://logicortex:secret@db/logicortex_dev"

    class Config:
        case_sensitive = True

settings = Settings()