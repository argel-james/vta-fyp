from dataclasses import dataclass
from typing import List, Optional

@dataclass
class Source:
    file: str
    page: Optional[int] = None

@dataclass
class Answer:
    text: str
    sources: List[Source]