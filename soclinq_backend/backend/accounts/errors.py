from rest_framework.exceptions import ValidationError


class SingleErrorValidationError(ValidationError):
    """
    Forces validation errors to return:
    { "error": "message" }
    """

    def __init__(self, detail):
        if isinstance(detail, dict):
            first = next(iter(detail.values()))
            if isinstance(first, (list, tuple)):
                detail = first[0]

        super().__init__({"error": detail})
