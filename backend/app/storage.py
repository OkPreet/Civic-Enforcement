"""Storage abstraction: local disk (default) or S3-compatible.

Set STORAGE_BACKEND=s3 + S3_* env vars to use object storage (needs boto3,
see requirements-s3.txt). Local dev keeps files on disk under UPLOAD_DIR.
"""

import os
import uuid
from abc import ABC, abstractmethod

from . import config


class BaseStorage(ABC):
    @abstractmethod
    def save(self, data: bytes, ext: str, content_type: str) -> str:
        """Persist bytes and return a client-usable reference (relative or absolute URL)."""


class LocalStorage(BaseStorage):
    def __init__(self, directory: str):
        self.directory = directory
        os.makedirs(directory, exist_ok=True)

    def save(self, data: bytes, ext: str, content_type: str) -> str:
        name = f"{uuid.uuid4().hex}{ext}"
        with open(os.path.join(self.directory, name), "wb") as f:
            f.write(data)
        return f"/uploads/{name}"


class S3Storage(BaseStorage):
    def __init__(self):
        import boto3  # optional dependency — only needed when using S3

        self.bucket = config.S3_BUCKET
        self.region = config.S3_REGION
        self.prefix = config.S3_PREFIX.strip("/")
        self.client = boto3.client("s3", region_name=self.region)

    def save(self, data: bytes, ext: str, content_type: str) -> str:
        name = f"{uuid.uuid4().hex}{ext}"
        key = f"{self.prefix}/{name}"
        self.client.put_object(Bucket=self.bucket, Key=key, Body=data, ContentType=content_type)
        return f"https://{self.bucket}.s3.{self.region}.amazonaws.com/{key}"


def get_storage() -> BaseStorage:
    if config.STORAGE_BACKEND == "s3":
        if not config.S3_BUCKET:
            raise RuntimeError("STORAGE_BACKEND=s3 requires S3_BUCKET")
        return S3Storage()
    return LocalStorage(config.UPLOAD_DIR)


storage = get_storage()
