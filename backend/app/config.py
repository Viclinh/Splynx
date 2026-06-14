from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    splunk_host: str = "localhost"
    splunk_port: int = 8089
    splunk_username: str = "admin"
    splunk_password: str = "changeme"
    splunk_token: str = ""

    # Splunk AI Toolkit (AITK) — primary AI engine
    # Splunk-hosted OpenAI-compatible endpoint inside your Splunk deployment
    splunk_aitk_url: str = ""        # e.g. https://splunk-host:8089/services/openai/v1
    splunk_aitk_model: str = "llama3-sqlcoder-8b"  # or gpt-4o if using hosted models

    # Amazon Bedrock — secondary AI engine (fallback)
    aws_region: str = "us-east-1"
    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    bedrock_model_id: str = "anthropic.claude-3-sonnet-20240229-v1:0"

    cors_origins: str = "http://localhost:3000"

    @property
    def aitk_configured(self) -> bool:
        return bool(self.splunk_aitk_url and self.splunk_token)

    @property
    def bedrock_configured(self) -> bool:
        return bool(self.aws_access_key_id and self.aws_secret_access_key)

    @property
    def splunk_base_url(self) -> str:
        return f"https://{self.splunk_host}:{self.splunk_port}"

    @property
    def splunk_auth(self):
        if self.splunk_token:
            return {"Authorization": f"Bearer {self.splunk_token}"}
        import base64
        creds = base64.b64encode(f"{self.splunk_username}:{self.splunk_password}".encode()).decode()
        return {"Authorization": f"Basic {creds}"}

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
