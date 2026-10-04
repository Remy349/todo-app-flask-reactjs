from __future__ import annotations

import logging

from flask import Flask, Response, jsonify
from werkzeug.exceptions import HTTPException

from todo_api.domain.errors import (
    AuthenticationError,
    ConflictError,
    DomainError,
    NotFoundError,
    ValidationError,
)
from todo_api.infrastructure.web.extensions import api

logger = logging.getLogger(__name__)


def status_for(error: DomainError) -> int:
    """Map error families, not individual errors: a new domain error needs no change here."""
    if isinstance(error, NotFoundError):
        return 404
    if isinstance(error, ConflictError):
        return 409
    if isinstance(error, ValidationError):
        return 400
    if isinstance(error, AuthenticationError):
        return 401
    return 422


def register_error_handlers(app: Flask) -> None:
    """Register error handlers once, after ``api.init_app(app)``."""

    @app.errorhandler(DomainError)
    def handle_domain_error(error: DomainError) -> tuple[Response, int]:
        return jsonify(message=error.message, code=error.code), status_for(error)

    @app.errorhandler(HTTPException)
    def handle_http_exception(error: HTTPException) -> tuple[Response, int]:
        # Delegate to flask-smorest so abort()/validation keep their payload
        # (code, status, message and webargs `errors`).
        return api.handle_http_exception(error)

    @app.errorhandler(Exception)
    def handle_unexpected_error(error: Exception) -> tuple[Response, int]:
        logger.exception("Unhandled error")
        return jsonify(message="Internal Server Error"), 500
