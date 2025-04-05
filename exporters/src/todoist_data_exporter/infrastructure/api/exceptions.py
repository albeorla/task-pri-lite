"""Exceptions for the Planning API client."""


class PlanningApiError(Exception):
    """Base exception for Planning API errors."""

    def __init__(self, message: str, status_code: int | None = None) -> None:
        """Initialize the exception.

        Args:
            message: Error message
            status_code: HTTP status code
        """
        self.status_code = status_code
        super().__init__(message)


class TodoistApiError(PlanningApiError):
    """Exception for Todoist API errors."""

    pass


class TodoistAuthError(PlanningApiError):
    """Exception for Todoist authentication errors."""

    pass


class TodoistNotFoundError(PlanningApiError):
    """Exception for Todoist not found errors."""

    pass


class TodoistRateLimitError(PlanningApiError):
    """Exception for Todoist rate limit errors."""

    pass


class TodoistServerError(PlanningApiError):
    """Exception for Todoist server errors."""

    pass


class PlanningAuthError(PlanningApiError):
    """Exception for authentication errors."""

    pass


class PlanningRateLimitError(PlanningApiError):
    """Exception for rate limit errors."""

    pass


class PlanningNotFoundError(PlanningApiError):
    """Exception for not found errors."""

    pass


class PlanningServerError(PlanningApiError):
    """Exception for server errors."""

    pass
