"""Зависимости, общие для роутеров."""

from datetime import datetime
from typing import Annotated

from fastapi import Depends

from app.clock import utc_now
from app.storage import Storage, get_storage

StorageDep = Annotated[Storage, Depends(get_storage)]
NowDep = Annotated[datetime, Depends(utc_now)]
