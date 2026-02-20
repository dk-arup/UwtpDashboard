import csv
import json
import os

# Input file path (new data)
file_path = r'c:\Users\Dinesh.Kumar\Downloads\uwtp_200226.csv'
# Output file path (new separate JSON)
output_path = r'data\star_ratings.json'

def read_csv(path):
    encodings = ['utf-8-sig', 'cp1252', 'latin1']
    for enc in encodings:
        try:
            print(f"Trying encoding: {enc}")
            with open(path, encoding=enc) as f:
                reader = csv.DictReader(f)
                fieldnames = reader.fieldnames
                print(f"Fields in {path}: {fieldnames}")
                return list(reader)
        except UnicodeDecodeError:
            print(f"{enc} failed, trying next...")
            continue
        except Exception as e:
            print(f"Error reading {path} with {enc}: {e}")
            break
    print(f"Failed to read file with any encoding.")
    return None

if __name__ == "__main__":
    if not os.path.exists('data'):
        os.makedirs('data')
        
    data = read_csv(file_path)

    if data:
        # Save to data/star_ratings.json
        try:
             with open(output_path, 'w', encoding='utf-8') as f:
                 json.dump(data, f, ensure_ascii=False, indent=2)
                 print(f"Successfully converted {len(data)} rows to {output_path}")
        except Exception as e:
            print(f"Error writing to {output_path}: {e}")
    else:
        print("Could not read data from csv")
