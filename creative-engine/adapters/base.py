from abc import ABC, abstractmethod
from typing import Dict, Any, Optional

class VideoProvider(ABC):
    """
    Abstract Video Provider Adapter.
    Decouples the business application from any single AI video model.
    """
    
    @abstractmethod
    def generate_shot(
        self,
        prompt: str,
        image_path: Optional[str] = None,
        duration_sec: float = 3.0,
        aspect_ratio: str = "9:16",
        output_path: Optional[str] = None
    ) -> str:
        """
        Generate a single video clip (shot) and save it to output_path.
        Returns the absolute filepath to the rendered mp4 video.
        """
        pass

    @abstractmethod
    def get_hardware_info(self) -> Dict[str, Any]:
        """Returns GPU VRAM and device availability"""
        pass
