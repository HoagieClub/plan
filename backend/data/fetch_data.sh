#!/bin/bash

# List of departments to fetch data for
DEPTS=(
    'AAS' 'ASL' 'AFS' 'AMS' 'ANT' 'AOS' 'APC' 'ARA' 'ARC' 'ART' 'ASA' 'AST' 'ATL' 'BCS' 'BNG' 'CBE' 'CEE' 'CDH' 'CGS' 'CHI' 'CHM' 'CHV' 'CLA' 'CLG' 'COM' 'COS' 'CSE' 'CTL' 'CWR' 'CZE' 'DAN' 'EAS' 'ECE' 'ECO' 'ECS' 'EEB' 'EGR' 'ENE' 'ENG' 'ENT' 'ENV' 'EPS' 'FIN' 'FRE' 'FRS' 'GEO' 'GER' 'GEZ' 'GHP' 'GSS' 'HEB' 'HIN' 'HIS' 'HLS' 'HOS' 'HUM' 'ISC' 'ITA' 'JDS' 'JPN' 'JRN' 'KOR' 'LAO' 'LAS' 'LAT' 'LCA' 'LIN' 'MAE' 'MAT' 'MED' 'MOD' 'MOG' 'MOL' 'MPP' 'MSE' 'MTD' 'MUS' 'NES' 'NEU' 'ORF' 'PAW' 'PER' 'PHI' 'PHY' 'PLS' 'POL' 'POP' 'POR' 'PSY' 'QCB' 'REL' 'RES' 'RUS' 'SAN' 'SAS' 'SLA' 'SML' 'SOC' 'SPA' 'SPI' 'STC' 'SWA' 'THR' 'TPP' 'TRA' 'TUR' 'TWI' 'UKR' 'URB' 'URD' 'VIS' 'WRI'
)

# Semester to fetch (can be modified as needed)
SEMESTER="s2026"

echo "Starting data fetch for semester: $SEMESTER"
echo "Processing ${#DEPTS[@]} departments..."
echo ""

# Loop through each department and run the Python script
for dept in "${DEPTS[@]}"; do
    echo "Fetching data for department: $dept"
    python fetch_data.py -s "$SEMESTER" -d "$dept"
    
    # Check if the command was successful
    if [ $? -eq 0 ]; then
        echo "✓ Successfully fetched data for $dept"
    else
        echo "✗ Failed to fetch data for $dept"
    fi
    echo ""
done

echo "All departments processed!"