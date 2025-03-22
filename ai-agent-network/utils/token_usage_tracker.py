import logging
from typing import Dict

# Global token usage tracker
_token_usage: Dict[str, int] = {}
_cost_usage: Dict[str, float] = {}

# Pricing per 1,000 tokens (as of March 2025)
MODEL_PRICING = {
    "gpt-4-8k": {"prompt": 0.03, "completion": 0.06},  # $30.00 / 1M prompt tokens, $60.00 / 1M completion tokens
    "gpt-4-32k": {"prompt": 0.06, "completion": 0.12}, # $60.00 / 1M prompt tokens, $120.00 / 1M completion tokens
    "gpt-3.5-turbo": {"usage": 0.002},                 # $2.00 / 1M tokens
    "claude-3-sonnet": {"prompt": 0.003, "completion": 0.015}, # $3.00 / 1M prompt tokens, $15.00 / 1M completion tokens
    "claude-3-opus": {"prompt": 0.015, "completion": 0.075}    # $15.00 / 1M prompt tokens, $75.00 / 1M completion tokens
}

def track_tokens(agent_name: str, model_name: str, prompt_tokens: int, completion_tokens: int):
    global _token_usage, _cost_usage

    total_tokens = prompt_tokens + completion_tokens
    _token_usage[agent_name] = _token_usage.get(agent_name, 0) + total_tokens

    # Estimate cost if pricing is known
    if model_name in MODEL_PRICING:
        model_pricing = MODEL_PRICING[model_name]
        if "usage" in model_pricing:
            # For models with a single usage rate
            cost = total_tokens * model_pricing["usage"] / 1000
        else:
            # For models with separate prompt and completion rates
            prompt_cost = prompt_tokens * model_pricing["prompt"] / 1000
            completion_cost = completion_tokens * model_pricing["completion"] / 1000
            cost = prompt_cost + completion_cost

        _cost_usage[agent_name] = _cost_usage.get(agent_name, 0.0) + cost
        logging.info(f"💰 {agent_name} used {total_tokens} tokens on {model_name} (${cost:.4f})")
    else:
        logging.warning(f"⚠️ Unknown model pricing for {model_name}. Tokens tracked but cost unknown.")

    logging.debug(f"[Token Track] Agent: {agent_name} | Tokens: {_token_usage[agent_name]} | Model: {model_name}")

def get_total_usage() -> Dict[str, int]:
    return _token_usage

def get_total_cost() -> Dict[str, float]:
    return _cost_usage

def reset_token_usage():
    global _token_usage, _cost_usage
    _token_usage = {}
    _cost_usage = {}
