# utils/config.py

import os
import json
import yaml
import logging
from typing import Dict, Any, Optional, List, Union, Type, TypeVar, Callable
from dataclasses import dataclass, field, asdict
from pydantic import BaseModel, validator

# Set up logging
logger = logging.getLogger("ai-agent-config")

# Type variable for configuration classes
T = TypeVar('T')

class ConfigurationError(Exception):
    """Exception raised for configuration errors"""
    pass


class ConfigLoader:
    """Utility for loading configuration from various sources"""
    
    @staticmethod
    def load_from_env(prefix: str = "AIAGENT_") -> Dict[str, Any]:
        """Load configuration from environment variables with prefix"""
        config = {}
        
        for key, value in os.environ.items():
            if key.startswith(prefix):
                # Remove prefix and convert to lowercase for consistency
                config_key = key[len(prefix):].lower()
                
                # Convert string values to appropriate types
                if value.lower() == "true":
                    config[config_key] = True
                elif value.lower() == "false":
                    config[config_key] = False
                elif value.isdigit():
                    config[config_key] = int(value)
                elif value.replace(".", "", 1).isdigit() and value.count(".") == 1:
                    config[config_key] = float(value)
                else:
                    config[config_key] = value
        
        return config
    
    @staticmethod
    def load_from_json(filepath: str) -> Dict[str, Any]:
        """Load configuration from a JSON file"""
        try:
            with open(filepath, "r") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to load config from JSON file {filepath}: {e}")
            raise ConfigurationError(f"Failed to load config from JSON file: {e}")
    
    @staticmethod
    def load_from_yaml(filepath: str) -> Dict[str, Any]:
        """Load configuration from a YAML file"""
        try:
            with open(filepath, "r") as f:
                return yaml.safe_load(f)
        except Exception as e:
            logger.error(f"Failed to load config from YAML file {filepath}: {e}")
            raise ConfigurationError(f"Failed to load config from YAML file: {e}")
    
    @staticmethod
    def load_config(
        config_class: Type[T],
        env_prefix: str = "AIAGENT_",
        config_file: Optional[str] = None,
        config_format: str = "json"
    ) -> T:
        """
        Load configuration into a typed configuration class
        
        Args:
            config_class: The configuration class (dataclass or pydantic model)
            env_prefix: Prefix for environment variables
            config_file: Optional path to a configuration file
            config_format: Format of the config file (json or yaml)
            
        Returns:
            An instance of the configuration class
        """
        # Start with empty config
        config_dict: Dict[str, Any] = {}
        
        # Load from file if provided
        if config_file and os.path.exists(config_file):
            if config_format.lower() == "json":
                config_dict.update(ConfigLoader.load_from_json(config_file))
            elif config_format.lower() == "yaml":
                config_dict.update(ConfigLoader.load_from_yaml(config_file))
            else:
                raise ConfigurationError(f"Unsupported config format: {config_format}")
        
        # Load from environment variables (overrides file settings)
        env_config = ConfigLoader.load_from_env(env_prefix)
        config_dict.update(env_config)
        
        # Create the configuration object
        try:
            if issubclass(config_class, BaseModel):
                # Pydantic model
                return config_class(**config_dict)
            else:
                # Assume dataclass
                return config_class(**config_dict)
        except Exception as e:
            logger.error(f"Failed to create configuration object: {e}")
            raise ConfigurationError(f"Failed to create configuration object: {e}")


# Base configuration classes
@dataclass
class LoggingConfig:
    """Logging configuration"""
    level: str = "INFO"
    format: str = "%(asctime)s [%(levelname)s] [%(name)s] %(message)s"
    date_format: str = "%Y-%m-%d %H:%M:%S"
    log_to_file: bool = False
    log_file: str = "logs/ai_agent.log"
    log_to_console: bool = True


@dataclass
class DatabaseConfig:
    """Database configuration"""
    connection_timeout: int = 10
    connection_retries: int = 3
    connection_retry_delay: int = 2
    max_connections: int = 5
    enable_connection_pooling: bool = True


@dataclass
class OpenAIConfig:
    """OpenAI API configuration"""
    api_key: str = ""
    organization_id: str = ""
    default_model: str = "gpt-4"
    timeout: int = 30
    max_retries: int = 2
    retry_delay: int = 1


@dataclass
class AnthropicConfig:
    """Anthropic API configuration"""
    api_key: str = ""
    default_model: str = "claude-3-sonnet-20240229"
    timeout: int = 30
    max_retries: int = 2
    retry_delay: int = 1


@dataclass
class SecurityConfig:
    """Security configuration"""
    enable_input_validation: bool = True
    enable_query_validation: bool = True
    enable_rate_limiting: bool = True
    enable_security_auditing: bool = True
    rate_limit_window_seconds: int = 60
    rate_limit_max_requests: int = 100
    sensitive_fields: List[str] = field(default_factory=lambda: [
        "password", "token", "secret", "key", "credentials"
    ])


@dataclass
class AgentConfig:
    """Agent configuration"""
    schema_agent_timeout: int = 30
    query_agent_timeout: int = 30
    validation_agent_timeout: int = 15
    visualization_agent_timeout: int = 30
    chat_agent_timeout: int = 30
    enable_tracing: bool = False
    enable_performance_monitoring: bool = True


@dataclass
class CrewConfig:
    """Crew orchestration configuration"""
    execution_mode: str = "sequential"  # "sequential" or "parallel"
    enable_caching: bool = True
    cache_ttl_seconds: int = 300
    max_execution_time: int = 120


@dataclass
class RedisConfig:
    """Redis configuration"""
    url: str = "redis://localhost:6379"
    password: str = ""
    db: int = 0
    timeout: int = 5
    connection_pool_size: int = 10


# Main configuration class
@dataclass
class AppConfig:
    """Main application configuration"""
    env: str = "development"
    debug: bool = False
    timeout: int = 60
    server_port: int = 5001
    
    # Component configurations
    logging: LoggingConfig = field(default_factory=LoggingConfig)
    database: DatabaseConfig = field(default_factory=DatabaseConfig)
    openai: OpenAIConfig = field(default_factory=OpenAIConfig)
    anthropic: AnthropicConfig = field(default_factory=AnthropicConfig)
    security: SecurityConfig = field(default_factory=SecurityConfig)
    agent: AgentConfig = field(default_factory=AgentConfig)
    crew: CrewConfig = field(default_factory=CrewConfig)
    redis: RedisConfig = field(default_factory=RedisConfig)


# Pydantic model version (with validation)
class PydanticAppConfig(BaseModel):
    """Main application configuration with validation"""
    env: str = "development"
    debug: bool = False
    timeout: int = 60
    server_port: int = 5001
    
    # Component configurations
    logging: dict = {}
    database: dict = {}
    openai: dict = {}
    anthropic: dict = {}
    security: dict = {}
    agent: dict = {}
    crew: dict = {}
    redis: dict = {}
    
    @validator('env')
    def validate_env(cls, v):
        allowed_envs = ["development", "staging", "production", "testing"]
        if v not in allowed_envs:
            raise ValueError(f"Environment must be one of: {', '.join(allowed_envs)}")
        return v
    
    @validator('server_port')
    def validate_port(cls, v):
        if not (1024 <= v <= 65535):
            raise ValueError("Port must be between 1024 and 65535")
        return v
    
    @validator('timeout')
    def validate_timeout(cls, v):
        if v <= 0:
            raise ValueError("Timeout must be positive")
        return v


# Configuration manager singleton
class ConfigManager:
    """Configuration manager singleton"""
    
    _instance = None
    _config = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ConfigManager, cls).__new__(cls)
            cls._instance._load_default_config()
        return cls._instance
    
    def _load_default_config(self):
        """Load default configuration"""
        
        # Try to load from environment variables first
        try:
            config_file = os.environ.get("AIAGENT_CONFIG_FILE")
            config_format = os.environ.get("AIAGENT_CONFIG_FORMAT", "json")
            
            self._config = ConfigLoader.load_config(
                AppConfig,
                env_prefix="AIAGENT_",
                config_file=config_file,
                config_format=config_format
            )
        except Exception as e:
            logger.warning(f"Failed to load configuration: {e}")
            # Fall back to default configuration
            self._config = AppConfig()
    
    @property
    def config(self) -> AppConfig:
        """Get the current configuration"""
        return self._config
    
    def reload_config(
        self,
        config_file: Optional[str] = None,
        config_format: str = "json"
    ) -> AppConfig:
        """Reload configuration from sources"""
        try:
            self._config = ConfigLoader.load_config(
                AppConfig,
                env_prefix="AIAGENT_",
                config_file=config_file,
                config_format=config_format
            )
            logger.info("Configuration reloaded successfully")
        except Exception as e:
            logger.error(f"Failed to reload configuration: {e}")
            raise ConfigurationError(f"Failed to reload configuration: {e}")
        
        return self._config
    
    def update_config(self, updates: Dict[str, Any]) -> AppConfig:
        """Update configuration with new values"""
        # Convert current config to dictionary
        config_dict = asdict(self._config)
        
        # Apply updates
        for key, value in updates.items():
            if key in config_dict:
                if isinstance(value, dict) and isinstance(config_dict[key], dict):
                    # Update nested dictionary
                    config_dict[key].update(value)
                else:
                    # Update simple value
                    config_dict[key] = value
            else:
                logger.warning(f"Unknown configuration key: {key}")
        
        # Create new config object
        self._config = AppConfig(**config_dict)
        return self._config
    
    def save_config(self, filepath: str, format: str = "json") -> None:
        """Save current configuration to a file"""
        config_dict = asdict(self._config)
        
        try:
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            
            if format.lower() == "json":
                with open(filepath, "w") as f:
                    json.dump(config_dict, f, indent=2)
            elif format.lower() == "yaml":
                with open(filepath, "w") as f:
                    yaml.dump(config_dict, f, default_flow_style=False)
            else:
                raise ConfigurationError(f"Unsupported config format: {format}")
            
            logger.info(f"Configuration saved to {filepath}")
        except Exception as e:
            logger.error(f"Failed to save configuration: {e}")
            raise ConfigurationError(f"Failed to save configuration: {e}")


# Helper to access configuration from anywhere
def get_config() -> AppConfig:
    """Get the current application configuration"""
    return ConfigManager().config


# Example configuration usage
if __name__ == "__main__":
    # Configure logging
    logging.basicConfig(level=logging.INFO)
    
    # Load configuration
    config = get_config()
    print(f"Environment: {config.env}")
    print(f"Debug mode: {config.debug}")
    print(f"OpenAI model: {config.openai.default_model}")
    
    # Update configuration
    manager = ConfigManager()
    manager.update_config({
        "debug": True,
        "openai": {"default_model": "gpt-3.5-turbo"}
    })
    
    # Get updated configuration
    config = get_config()
    print(f"Updated debug mode: {config.debug}")
    print(f"Updated OpenAI model: {config.openai.default_model}")
    
    # Save configuration
    manager.save_config("config/app_config.json")