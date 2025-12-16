
import os
import sys
import time

# Importamos los módulos existentes
try:
    import descargar_data
    import etl_unified
except ImportError as e:
    print(f"Error importando módulos: {e}")
    sys.exit(1)

def run_pipeline():
    print("=========================================")
    print("   INICIANDO ACTUALIZACIÓN DE DATOS")
    print("=========================================")
    
    # PASO 1: Descarga
    print("\n[PASO 1/2] Ejecutando descarga de archivos...")
    start_time = time.time()
    try:
        descargar_data.descargar_archivos_recientes()
    except Exception as e:
        print(f"❌ Error crítico en la descarga: {e}")
        return
    
    # PASO 2: Procesamiento (ETL)
    print("\n[PASO 2/2] Procesando archivos (ETL)...")
    try:
        # El ETL unificado ya tiene lógica para detectar los archivos más recientes
        # en la carpeta 'datos_descargados', así que solo necesitamos ejecutarlo.
        etl_unified.main()
    except Exception as e:
        print(f"❌ Error crítico en el procesamiento ETL: {e}")
        return

    elapsed = time.time() - start_time
    print("\n=========================================")
    print(f"✅ PIPELINE FINALIZADO en {elapsed:.2f} segundos.")
    print("=========================================")
    print("Ahora puedes refrescar tu dashboard en http://localhost:8080")

if __name__ == "__main__":
    run_pipeline()
