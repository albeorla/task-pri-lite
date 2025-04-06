.PHONY: build check check-log clean clean-venv format help install lint lint-fix mypy run shell test test-cov export-all export-todoist export-gcal export-gcal-filtered

# ============================================================================== #
#                              Setup & Environment                             #
# ============================================================================== #

install: ## Install dependencies including development dependencies
	poetry install --with dev

shell: ## Activate the virtual environment
	poetry shell

# ============================================================================== #
#                           Code Quality & Testing                             #
# ============================================================================== #

format: ## Format code using Ruff
	poetry run ruff format .

lint: ## Lint code using Ruff
	poetry run ruff check . --ignore PLR0912,PLR0913 # Ignore Too many branches and arguments

lint-fix: ## Lint code using Ruff and apply fixes
	-poetry run ruff check . --fix

mypy: ## Run static type checking using MyPy
	poetry run mypy src/

test: ## Run tests using Pytest
	poetry run pytest $(TEST_DIR)

test-cov: ## Run tests with coverage report
	poetry run pytest --cov=$(SRC_DIR) $(TEST_DIR)

check: format lint mypy test ## Run all checks (format, lint, mypy, test)

check-log: ## Run all checks via script and log output to logs/quality_checks.log
	@echo "Running checks via script..."
	@./bin/run_checks.sh

# ============================================================================== #
#                              Running Exporters                               #
# ============================================================================== #

# Note: The old 'run' target executed specific, potentially outdated commands.
# It is kept here for reference but commented out. Consider removing it.
# run: ## Run the application with default settings
# 	poetry run planning-export todoist
# 	poetry run planning-export gcal

export-all: ## Run all available data exporters
	@echo "Running all data exporters..."
	poetry run planning-export

export-todoist: ## Run only the Todoist data exporter
	@echo "Running Todoist data exporter..."
	poetry run planning-export -e todoist

export-gcal: ## Run only the Google Calendar data exporter
	@echo "Running Google Calendar data exporter..."
	poetry run planning-export -e gcal

export-gcal-filtered: ## Run the Google Calendar data exporter with event filtering
	@echo "Running Google Calendar data exporter with event filtering..."
	@mkdir -p output
	poetry run planning-export -e gcal
	@echo "Starting event filtering with concurrent batch processing..."
	poetry run python -c "import sys; sys.path.append('./src'); from google_calendar_exporter.main import main; sys.argv = ['gcal-export', '--filter-events', '--batch-size', '15', '--max-concurrent-batches', '4']; main()" || echo "Filtering process ended. Check output directory for exported files."

# ============================================================================== #
#                              Build & Cleanup                                 #
# ============================================================================== #

build: ## Build the package (wheel and sdist)
	poetry build

clean: ## Clean build artifacts and cache files
	rm -rf dist build *.egg-info htmlcov
	find . -type d -name "__pycache__" -exec rm -rf {} +
	find . -type f -name "*.py[co]" -delete
	rm -rf .mypy_cache .ruff_cache .pytest_cache .coverage

clean-venv: clean ## Clean everything including the virtual environment
	rm -rf .venv

# ============================================================================== #
#                                     Help                                     #
# ============================================================================== #

# Default target
.DEFAULT_GOAL := help

# Variables (if any, place here or at the top)
SRC_DIR := src/planning_data_exporter
TEST_DIR := tests

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
