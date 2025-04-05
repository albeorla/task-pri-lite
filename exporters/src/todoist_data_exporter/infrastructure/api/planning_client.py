"""Planning API client."""

import concurrent.futures
import logging
from concurrent.futures import ThreadPoolExecutor
from typing import Any, cast

import requests
from todoist_data_exporter.infrastructure.api.exceptions import (
    TodoistApiError as PlanningApiError,
)
from todoist_data_exporter.infrastructure.api.exceptions import (
    TodoistAuthError as PlanningAuthError,
)
from todoist_data_exporter.infrastructure.api.exceptions import (
    TodoistNotFoundError as PlanningNotFoundError,
)
from todoist_data_exporter.infrastructure.api.exceptions import (
    TodoistRateLimitError as PlanningRateLimitError,
)
from todoist_data_exporter.infrastructure.api.exceptions import (
    TodoistServerError as PlanningServerError,
)

# HTTP Status Codes
HTTP_OK = 200
HTTP_NO_CONTENT = 204
HTTP_UNAUTHORIZED = 401
HTTP_FORBIDDEN = 403
HTTP_NOT_FOUND = 404
HTTP_TOO_MANY_REQUESTS = 429
HTTP_SERVER_ERROR_MIN = 500
HTTP_SERVER_ERROR_MAX = 600

# Get a logger instance
logger = logging.getLogger(__name__)


class PlanningClient:
    """Client for the Planning REST API."""

    API_URL = "https://api.todoist.com/rest/v2"
    SYNC_API_URL = "https://api.todoist.com/sync/v9"

    def __init__(self, api_token: str) -> None:
        """Initialize the client.

        Args:
            api_token: Planning API token
        """
        self.api_token = api_token
        self.session = requests.Session()
        self.session.headers.update(
            {
                "Authorization": f"Bearer {api_token}",
                "Content-Type": "application/json",
            }
        )

    def get_projects(self) -> list[dict[str, Any]]:
        """Get all projects.

        Returns:
            List of projects
        """
        response_data = self._get(f"{self.API_URL}/projects")
        return cast(list[dict[str, Any]], response_data)

    def get_sections(self, project_id: str | None = None) -> list[dict[str, Any]]:
        """Get sections.

        Args:
            project_id: Project ID to filter by (optional)

        Returns:
            List of sections
        """
        params = {"project_id": project_id} if project_id else {}
        response_data = self._get(f"{self.API_URL}/sections", params=params)
        return cast(list[dict[str, Any]], response_data)

    def get_tasks(
        self, project_id: str | None = None, section_id: str | None = None
    ) -> list[dict[str, Any]]:
        """Get tasks.

        Args:
            project_id: Project ID to filter by (optional)
            section_id: Section ID to filter by (optional)

        Returns:
            List of tasks
        """
        params = {}
        if project_id:
            params["project_id"] = project_id
        if section_id:
            params["section_id"] = section_id

        response_data = self._get(f"{self.API_URL}/tasks", params=params)
        return cast(list[dict[str, Any]], response_data)

    def get_labels(self) -> list[dict[str, Any]]:
        """Get all labels.

        Returns:
            List of labels
        """
        response_data = self._get(f"{self.API_URL}/labels")
        return cast(list[dict[str, Any]], response_data)

    def get_comments(
        self, task_id: str | None = None, project_id: str | None = None
    ) -> list[dict[str, Any]]:
        """Get comments.

        Args:
            task_id: Task ID to filter by (optional)
            project_id: Project ID to filter by (optional)

        Returns:
            List of comments
        """
        params = {}
        if task_id:
            params["task_id"] = task_id
        elif project_id:
            params["project_id"] = project_id
        else:
            raise ValueError("Either task_id or project_id must be provided")

        response_data = self._get(f"{self.API_URL}/comments", params=params)
        return cast(list[dict[str, Any]], response_data)

    def get_comments_batch(
        self, items: list[dict[str, Any]], id_key: str, is_task: bool = True
    ) -> list[dict[str, Any]]:
        """Get comments for multiple items in parallel.

        Args:
            items: List of items (tasks or projects) to get comments for
            id_key: The key to use to get the ID from each item
            is_task: Whether the items are tasks (True) or projects (False)

        Returns:
            List of comments for all items
        """
        all_comments = []

        # Define the function to get comments for a single item
        def get_item_comments(item: dict[str, Any]) -> list[dict[str, Any]]:
            item_id = item[id_key]
            if is_task:
                return self.get_comments(task_id=item_id)
            else:
                return self.get_comments(project_id=item_id)

        # Use ThreadPoolExecutor to get comments in parallel
        with ThreadPoolExecutor(max_workers=10) as executor:
            # Submit all tasks to the executor
            future_to_item = {executor.submit(get_item_comments, item): item for item in items}

            # Process results as they complete
            for future in concurrent.futures.as_completed(future_to_item):
                try:
                    comments = future.result()
                    all_comments.extend(comments)
                except Exception as exc:
                    item = future_to_item[future]
                    item_id = item[id_key]
                    entity_type = "task" if is_task else "project"
                    print(f"Error getting comments for {entity_type} {item_id}: {exc}")

        return all_comments

    def get_all_data(self) -> dict[str, Any]:
        """Get all projects, tasks, sections, labels concurrently."""
        logger.info("Fetching all data concurrently...")
        with ThreadPoolExecutor() as executor:
            # Submit tasks
            future_projects = executor.submit(self.get_projects)
            future_tasks = executor.submit(self.get_tasks)  # Fetches all tasks
            future_sections = executor.submit(self.get_sections)
            future_labels = executor.submit(self.get_labels)
            # Comments usually require task/project ID, so fetching all isn't standard

            # Retrieve results
            projects = future_projects.result()
            tasks = future_tasks.result()
            sections = future_sections.result()
            labels = future_labels.result()
        logger.info("Finished fetching all data.")

        # Construct the final dictionary
        all_data = {
            "projects": projects,
            "sections": sections,
            "tasks": tasks,
            "labels": labels,
        }
        # Cast the final dictionary before returning
        return cast(dict[str, Any], all_data)

    def _get(self, url: str, params: dict[str, Any] | None = None) -> Any:
        """Make a GET request to the API.

        Args:
            url: URL to request
            params: Query parameters

        Returns:
            Response data

        Raises:
            PlanningApiError: If the request fails
        """
        response = self.session.get(url, params=params)
        return self._handle_response(response)

    def _post(self, url: str, data: dict[str, Any]) -> Any:
        """Make a POST request to the API.

        Args:
            url: URL to request
            data: Request data

        Returns:
            Response data

        Raises:
            PlanningApiError: If the request fails
        """
        response = self.session.post(url, json=data)
        return self._handle_response(response)

    def _handle_response(self, response: requests.Response) -> Any:
        """Handle the API response.

        Args:
            response: Response object

        Returns:
            Response data

        Raises:
            PlanningApiError: If the request fails
        """
        if response.status_code == HTTP_OK:
            return response.json()
        elif response.status_code == HTTP_NO_CONTENT:
            return None
        elif response.status_code == HTTP_UNAUTHORIZED:
            raise PlanningAuthError("Authentication failed", response.status_code)
        elif response.status_code == HTTP_FORBIDDEN:
            raise PlanningAuthError("Permission denied", response.status_code)
        elif response.status_code == HTTP_NOT_FOUND:
            raise PlanningNotFoundError("Resource not found", response.status_code)
        elif response.status_code == HTTP_TOO_MANY_REQUESTS:
            raise PlanningRateLimitError("Rate limit exceeded", response.status_code)
        elif HTTP_SERVER_ERROR_MIN <= response.status_code < HTTP_SERVER_ERROR_MAX:
            raise PlanningServerError(f"Server error: {response.status_code}", response.status_code)
        else:
            raise PlanningApiError(f"API error: {response.status_code}", response.status_code)

    def _check_response(self, response: requests.Response) -> None:
        """Check the response for errors."""
        # ...

    def _handle_error(self, response: requests.Response) -> None:
        """Handle API errors based on status code."""
        # ...

    def _log_request(self, method: str, url: str, **kwargs: Any) -> None:
        """Log the request details."""
        # ...

    def _log_response(self, response: requests.Response) -> None:
        """Log the response details."""
        # ...
