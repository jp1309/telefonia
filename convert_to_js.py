
import csv
import json
import os

def csv_to_js_var(csv_path, var_name):
    if not os.path.exists(csv_path):
        print(f"Error: {csv_path} not found")
        return "[]"
    
    with open(csv_path, 'r', encoding='utf-8-sig') as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        # Convert numeric values
        for row in rows:
            if 'value' in row:
                try:
                    row['value'] = float(row['value'])
                except:
                    row['value'] = 0.0
    
    json_str = json.dumps(rows)
    return f"const {var_name} = {json_str};"

def main():
    base_dir = r"C:\Users\HP\OneDrive\JpE\Github\telefonia"
    output_dir = os.path.join(base_dir, "output")
    
    path_serv = os.path.join(output_dir, "lineas_por_servicio_long.csv")
    path_mod = os.path.join(output_dir, "lineas_por_modalidad_fact.csv")
    
    js_content = []
    js_content.append(csv_to_js_var(path_serv, "DATA_SERVICIO"))
    js_content.append(csv_to_js_var(path_mod, "DATA_MODALIDAD"))
    
    output_js_path = os.path.join(base_dir, "data_static.js")
    
    with open(output_js_path, 'w', encoding='utf-8') as f:
        f.write("\n\n".join(js_content))
    
    print(f"Creado archivo estático: {output_js_path}")

if __name__ == "__main__":
    main()
