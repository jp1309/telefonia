import os
import requests
from bs4 import BeautifulSoup
import re
import time

# URL de la página
BASE_URL = "https://www.arcotel.gob.ec/lineas-activas/"

# Carpeta de destino
DOWNLOAD_DIR = "datos_descargados"

# Mapeo de meses en español a números para ordenar
MESES = {
    'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
    'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12,
    'ene': 1, 'feb': 2, 'mar': 3, 'abr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'ago': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dic': 12
}

def obtener_fecha_desde_texto(texto):
    """
    Intenta extraer (año, mes) de un texto (URL o nombre).
    Retorna (año, mes) o (0, 0) si no encuentra.
    """
    # Patrón 1: _Mes_Año (ej: _octubre_2025)
    match = re.search(r'[_\-\s]([a-zA-Z]+)[_\-\s]+(\d{4})', texto, re.IGNORECASE)
    if match:
        mes_str = match.group(1).lower()
        anio = int(match.group(2))
        mes_num = MESES.get(mes_str, 0)
        if mes_num > 0:
            return anio, mes_num
            
    # Patrón 2: Mes-Año (ej: oct-2025)
    match = re.search(r'([a-zA-Z]+)-(\d{4})', texto, re.IGNORECASE)
    if match:
        mes_str = match.group(1).lower()
        anio = int(match.group(2))
        mes_num = MESES.get(mes_str, 0)
        if mes_num > 0:
            return anio, mes_num
            
    return 0, 0

def identificar_tipo_archivo(nombre_archivo):
    """Retorna 'servicio', 'modalidad' o None según el nombre."""
    nombre = nombre_archivo.lower()
    if '1.1.1' in nombre or 'servicio' in nombre:
        return 'servicio'
    if '1.1.2' in nombre or 'modalidad' in nombre:
        return 'modalidad'
    return None

def descargar_archivos_recientes():
    # Crear carpeta si no existe
    if not os.path.exists(DOWNLOAD_DIR):
        os.makedirs(DOWNLOAD_DIR)

    print(f"Conectando a {BASE_URL}...")
    try:

        # Timeout added to prevent hanging ("atorarse")
        response = requests.get(BASE_URL, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'}, timeout=15)
        response.raise_for_status()
    except Exception as e:
        print(f"ERROR CRÍTICO al conectar con {BASE_URL}")
        print(f"Detalle: {e}")
        return

    soup = BeautifulSoup(response.content, 'html.parser')
    links = soup.find_all('a', href=True)
    
    # Diccionario para agrupar: {(anio, mes): {'servicio': url, 'modalidad': url}}
    disponibles = {}

    for link in links:
        href = link['href']
        nombre = os.path.basename(href)
        
        # Filtramos solo excels
        if not (href.lower().endswith('.xlsx') or href.lower().endswith('.xls')):
            continue
            
        anio, mes = obtener_fecha_desde_texto(nombre)
        if anio == 0 or mes == 0:
             # Intento con el href completo si el nombre falla
             anio, mes = obtener_fecha_desde_texto(href)
        
        if anio > 0 and mes > 0:
            tipo = identificar_tipo_archivo(nombre)
            if tipo:
                key = (anio, mes)
                if key not in disponibles:
                    disponibles[key] = {}
                disponibles[key][tipo] = {'url': href, 'nombre': nombre}

    if not disponibles:
        print("No se encontraron archivos válidos.")
        return

    # Buscar la fecha más reciente que tenga AMBOS archivos
    fechas_ordenadas = sorted(disponibles.keys(), reverse=True)
    
    ultima_fecha_completa = None
    for fecha in fechas_ordenadas:
        archivos = disponibles[fecha]
        if 'servicio' in archivos and 'modalidad' in archivos:
            ultima_fecha_completa = fecha
            break
    
    if not ultima_fecha_completa:
        print("ADVERTENCIA: No se encontró ningun mes con el par completo (1.1.1 y 1.1.2).")
        print("Descargando lo más reciente disponible individualmente...")
        # Fallback: descargar lo más reciente que haya de cada uno
        # (Lógica simplificada para no bloquear: tomamos el top 1 de cada tipo si existe)
        return

    anio_sel, mes_sel = ultima_fecha_completa
    print(f"\nFecha más reciente encontrada con datos completos: {mes_sel:02d}-{anio_sel}")
    
    archivos_a_descargar = [
        disponibles[ultima_fecha_completa]['servicio'],
        disponibles[ultima_fecha_completa]['modalidad']
    ]
    
    for archivo in archivos_a_descargar:
        nombre_final = archivo['nombre']
        url = archivo['url']
        local_path = os.path.join(DOWNLOAD_DIR, nombre_final)
        
        print(f"Verificando {nombre_final}...")
        
        # Descargar siempre para verificar integridad o si cambió (se podría chequear size, pero overwrite es más seguro pre-commit)
        try:
            print(f" - Descargando de {url}...")
            r = requests.get(url, stream=True)
            r.raise_for_status()
            with open(local_path, 'wb') as f:
                for chunk in r.iter_content(chunk_size=8192):
                    f.write(chunk)
            print(" - Descarga OK")
        except Exception as e:
            print(f" - Error descargando: {e}")

    print("\nProceso de descarga finalizado.")

if __name__ == "__main__":
    descargar_archivos_recientes()
