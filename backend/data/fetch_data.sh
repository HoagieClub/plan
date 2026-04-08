#!/bin/bash

# Usage: ./fetch_data.sh s2026

if [ -z "$1" ]; then
    echo "Usage: ./fetch_data.sh <semester>"
    echo "Example: ./fetch_data.sh s2026"
    exit 1
fi

SEMESTER="$1"

# List of departments to fetch data for
DEPTS=(
    'AAS' 'ASL' 'AFS' 'AMS' 'ANT' 'AOS' 'APC' 'ARA' 'ARC' 'ART' 'ASA' 'AST' 'ATL' 'BCS' 'BNG' 'CBE' 'CEE' 'CDH' 'CGS' 'CHI' 'CHM' 'CHV' 'CLA' 'CLG' 'COM' 'COS' 'CSE' 'CTL' 'CWR' 'CZE' 'DAN' 'EAS' 'ECE' 'ECO' 'ECS' 'EEB' 'EGR' 'ENE' 'ENG' 'ENT' 'ENV' 'EPS' 'FIN' 'FRE' 'FRS' 'GEO' 'GER' 'GEZ' 'GHP' 'GSS' 'HEB' 'HIN' 'HIS' 'HLS' 'HOS' 'HUM' 'ISC' 'ITA' 'JDS' 'JPN' 'JRN' 'KOR' 'LAO' 'LAS' 'LAT' 'LCA' 'LIN' 'MAE' 'MAT' 'MED' 'MOD' 'MOG' 'MOL' 'MPP' 'MSE' 'MTD' 'MUS' 'NES' 'NEU' 'ORF' 'PAW' 'PER' 'PHI' 'PHY' 'PLS' 'POL' 'POP' 'POR' 'PSY' 'QCB' 'REL' 'RES' 'RUS' 'SAN' 'SAS' 'SLA' 'SML' 'SOC' 'SPA' 'SPI' 'STC' 'SWA' 'THR' 'TPP' 'TRA' 'TUR' 'TWI' 'UKR' 'URB' 'URD' 'VIS' 'WRI'
)

NUM_RUNS=3
STAGGER_SECONDS=30
TOTAL=${#DEPTS[@]}

echo "Starting data fetch for semester: $SEMESTER"
echo "Running $NUM_RUNS passes over $TOTAL departments (staggered by ${STAGGER_SECONDS}s)..."
echo ""

# Function to run a single full pass over all departments
fetch_all() {
    local run=$1
    echo "=== Run $run started ==="
    for dept in "${DEPTS[@]}"; do
        echo "[Run $run] Fetching $dept..."
        python fetch_data.py -s "$SEMESTER" -d "$dept"
    done
    echo "=== Run $run complete ==="
}

# Launch all 3 runs in parallel, staggered by 30 seconds
PIDS=()
for run in $(seq 1 $NUM_RUNS); do
    fetch_all "$run" &
    PIDS+=($!)
    if [ "$run" -lt "$NUM_RUNS" ]; then
        sleep "$STAGGER_SECONDS"
    fi
done

# Wait for all runs to finish
echo "Waiting for all runs to complete..."
for pid in "${PIDS[@]}"; do
    wait "$pid"
done

echo ""
echo "All $NUM_RUNS runs complete."

# Combine all department CSVs into one
echo ""
echo "Combining course data for $SEMESTER..."
python combine_course_data.py "$SEMESTER"
