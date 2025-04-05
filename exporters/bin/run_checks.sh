#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
# set -e # Keep disabled to capture status codes manually

LOG_DIR="logs"
LOG_FILE="./quality_checks.log"

# --- Helper Functions ---
log_section_start() {
    local title="$1"
    echo -e "\n\n===== $title =====" | tee -a "$LOG_FILE"
}

log_status() {
    local check_name="$1"
    local status_code=$2
    local status_text=""
    if [ $status_code -eq 0 ]; then
        status_text="PASSED"
    else
        status_text="FAILED"
    fi
    echo "$check_name check completed with status: $status_code ($status_text)" >> "$LOG_FILE"
    echo "---------------------------------------" | tee -a "$LOG_FILE"
}

run_check() {
    local check_name="$1"
    local make_target="$2"
    local tmp_output
    tmp_output=$(mktemp) # Create a temporary file

    log_section_start "$check_name CHECKS"
    echo "Running '$make_target' check..." | tee -a "$LOG_FILE"
    
    # Run make, redirect stdout/stderr to temp file, capture status
    make "$make_target" > "$tmp_output" 2>&1
    local make_status=$? # Capture status immediately after make

    # Process the temp file output: prepend name, tee to console/log file
    sed "s/^/[$check_name] /" "$tmp_output" | tee -a "$LOG_FILE"
    # We don't strictly need sed's status, but good to be aware of it
    # local sed_status=${PIPESTATUS[0]} 

    rm "$tmp_output" # Clean up temp file

    log_status "$check_name" $make_status # Log the status of make
    return $make_status # Return the status of make
}

# --- Main Script ---

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Initialize log file
echo "Starting quality checks at $(date)" > "$LOG_FILE"
echo "=======================================" >> "$LOG_FILE"

# Run Checks and capture status using $?
run_check "FORMAT" "format"; format_status=$?
run_check "LINT" "lint"; lint_status=$?
run_check "MYPY" "mypy"; mypy_status=$?
run_check "TEST" "test"; test_status=$?

# --- Summary --- 
echo -e "\n\n===== SUMMARY =====" >> "$LOG_FILE"
echo "Format: $format_status ($( [ $format_status -eq 0 ] && echo PASSED || echo FAILED ))" >> "$LOG_FILE"
echo "Lint:   $lint_status ($( [ $lint_status -eq 0 ] && echo PASSED || echo FAILED ))" >> "$LOG_FILE"
echo "Mypy:   $mypy_status ($( [ $mypy_status -eq 0 ] && echo PASSED || echo FAILED ))" >> "$LOG_FILE"
echo "Test:   $test_status ($( [ $test_status -eq 0 ] && echo PASSED || echo FAILED ))" >> "$LOG_FILE"
echo "Completed at $(date)" >> "$LOG_FILE"

echo -e "\n---------------------------------------"
echo "Quality checks completed. See $LOG_FILE for details."

# Final exit status
if [ $format_status -ne 0 ] || [ $lint_status -ne 0 ] || [ $mypy_status -ne 0 ] || [ $test_status -ne 0 ]; then
    echo "One or more checks FAILED."
    exit 1
else
    echo "All checks PASSED."
    exit 0
fi 