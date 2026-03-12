from abc import ABC, abstractmethod
from typing import Dict, Any, List

class BaseConnector(ABC):
    @abstractmethod
    def test_connection(self, credentials: Dict[str, Any]) -> Dict[str, Any]:
        """Test the connection using credentials."""
        pass

    @abstractmethod
    def get_schema_summary(self, credentials: Dict[str, Any]) -> str:
        """Fetch summary of schema/tables for AI context."""
        pass

    @abstractmethod
    def execute_read_only_query(self, credentials: Dict[str, Any], query: str) -> Dict[str, Any]:
        """Execute a read-only query and return columns and rows."""
        pass
