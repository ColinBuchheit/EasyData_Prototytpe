# setup.py

from setuptools import setup, find_packages

setup(
    name="ai-agent-network",
    version="1.0.0",
    description="AI Agent Network for Database Query and Analysis",
    author="AI Team",
    author_email="ai@example.com",
    packages=find_packages(),
    install_requires=[
        # Core dependencies
        "crewai>=0.1.0",
        "redis>=4.5.1",
        "requests>=2.28.2",
        "pydantic>=1.10.8",
        "typing-extensions>=4.5.0",
        
        # Database adapters
        "psycopg2-binary>=2.9.5",
        "mysql-connector-python>=8.0.32",
        "pymongo>=4.3.3",
        "pyodbc>=4.0.35",
        "boto3>=1.26.84",
        "firebase-admin>=6.1.0",
        "couchdb>=1.2",
        
        # AI APIs
        "openai>=0.27.0",
        "anthropic>=0.2.8",
        
        # Testing
        "pytest>=7.3.1",
        "pytest-cov>=4.1.0",
        "pytest-mock>=3.10.0",
        
        # Utilities
        "pyyaml>=6.0",
        "docstring-parser>=0.15",
        "colorlog>=6.7.0",
        
        # Visualization
        "matplotlib>=3.7.1",
        "seaborn>=0.12.2",
    ],
    extras_require={
        "dev": [
            "black",
            "flake8",
            "isort",
            "mypy",
            "pytest",
            "pytest-cov",
        ],
        "docs": [
            "sphinx",
            "sphinx-rtd-theme",
            "sphinx-autodoc-typehints",
        ],
    },
    python_requires=">=3.8",
    classifiers=[
        "Development Status :: 4 - Beta",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
    ],
)