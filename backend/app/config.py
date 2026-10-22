from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://invoiceflow:invoiceflow@localhost:5432/invoiceflow"
    # MUST be overridden with a long random value in any real deployment.
    secret_key: str = "dev-only-change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    bcrypt_rounds: int = 12


settings = Settings()
