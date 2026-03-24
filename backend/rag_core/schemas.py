from dataclasses import dataclass, field
from typing import List, Optional

@dataclass
class Source:
    file: str
    page: Optional[int] = None

@dataclass
class ChunkDetail:
    content: str
    file: str
    page: Optional[int] = None
    metadata: dict = field(default_factory=dict)

@dataclass
class Answer:
    text: str
    sources: List[Source]
    chunks: List[ChunkDetail] = field(default_factory=list)