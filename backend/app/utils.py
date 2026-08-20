import random
import string


def generate_public_id(prefix: str, length: int = 6) -> str:
    """e.g. RPT-123456 / VIO-123456 / CHL-123456"""
    suffix = "".join(random.choices(string.digits, k=length))
    return f"{prefix}-{suffix}"
