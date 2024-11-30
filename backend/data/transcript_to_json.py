from pypdf import PdfReader
import pdfplumber

def transcript_to_json(pdf_path):
    class_output = {}
    with pdfplumber.open(pdf_path) as pdf:
        total_lines = []
        for page_number, page in enumerate(pdf.pages, start=1):
            lines = page.extract_text().splitlines()
            total_lines.extend(lines)
        skipLine = False
        currentTerm = ""
        currentTermClasses = []
        for i in range(len(total_lines)): 
            curr_line = total_lines[i]
            if ("Fall" in curr_line or "Spring" in curr_line):
                if (len(currentTermClasses) != 0):
                    class_output[currentTerm] = currentTermClasses
                    currentTermClasses = []
                currentTerm = total_lines[i]
            row = curr_line.split(" ")
            if (len(row) >= 2 and row[0].upper() == row[0] and len(row[0]) == 3 and row[1].isnumeric() and row[0] != "ID:"):
                currClass = row[0] + " " + row[1]  
                currentTermClasses.append(currClass)
    return class_output

pdf_url = "backend/data/George_Transcript (1).pdf"
print(transcript_to_json(pdf_url))